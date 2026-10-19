\set h '''11111111-1111-1111-1111-1111111111aa'''
\set i '''22222222-2222-2222-2222-2222222222bb'''
\set j '''33333333-3333-3333-3333-3333333333cc'''

select test.superuser();
insert into auth.users (id, email, raw_user_meta_data) values (:h, 'h@example.com', '{"display_name":"Hal"}'), (:i, 'i@example.com', '{"display_name":"Ida"}'), (:j, 'j@example.com', '{}');
select test.login(:h);
create temp table inv_h as select * from public.create_invitation();
grant all on inv_h to public;
select test.login(:i);
select public.accept_invitation((select token from inv_h));
select test.superuser();
insert into storage.buckets (id, name) values ('couple-media', 'couple-media') on conflict do nothing;

select test.ok((select notification_preview_mode from public.user_preferences where user_id = :h) = 'full', 'notifications show the message by default');

-- quick message + ping
select test.login(:h);
select test.ok((public.send_message('on my way', 'quick', gen_random_uuid())->>'is_new')::boolean, 'quick message accepted');
select test.throws($$select public.send_message(repeat('x', 501), 'quick', gen_random_uuid())$$, 'invalid_content', 'quick message limited to 500 chars');
select test.ok((public.send_message('Thinking of you', 'thinking_of_you', gen_random_uuid())->>'is_new')::boolean, 'thinking of you accepted');
select test.throws($$select public.send_message('Thinking of you', 'thinking_of_you', gen_random_uuid(), null, null, now() + interval '2 days')$$, 'invalid_schedule', 'a ping cannot be scheduled');

-- voice notes / drawings need a real uploaded file inside the couple's own folder
select test.superuser();
create temp table sp as select couple_space_id as id from public.couple_members where user_id = :h;
grant all on sp to public;
insert into storage.objects (bucket_id, name, owner) values
  ('couple-media', (select id::text from sp) || '/voice/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webm', :h),
  ('couple-media', (select id::text from sp) || '/drawing/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png', :h),
  ('couple-media', '99999999-9999-9999-9999-999999999999/voice/cccccccc-cccc-4ccc-8ccc-cccccccccccc.webm', :h);
select test.login(:h);
select test.ok((public.send_message('', 'voice_note', gen_random_uuid(), null, jsonb_build_object('path', (select id::text from sp) || '/voice/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webm', 'seconds', 12))->'message'->>'content') = 'Voice note', 'voice note stored with a default caption');
select test.ok((public.send_message('look', 'drawing', gen_random_uuid(), null, jsonb_build_object('path', (select id::text from sp) || '/drawing/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png'))->>'is_new')::boolean, 'drawing stored');
select test.throws($$select public.send_message('', 'voice_note', gen_random_uuid())$$, 'invalid_attachment', 'voice note needs an attachment');
select test.throws($$select public.send_message('hi', 'quick', gen_random_uuid(), null, jsonb_build_object('path','x'))$$, 'invalid_attachment', 'text messages cannot carry attachments');
select test.throws(format($$select public.send_message('', 'voice_note', gen_random_uuid(), null, jsonb_build_object('path', %L, 'seconds', 5))$$, '99999999-9999-9999-9999-999999999999/voice/cccccccc-cccc-4ccc-8ccc-cccccccccccc.webm'), 'invalid_attachment', 'cannot attach a file from another couple folder');
select test.throws(format($$select public.send_message('', 'voice_note', gen_random_uuid(), null, jsonb_build_object('path', %L, 'seconds', 5))$$, (select id::text from sp) || '/voice/dddddddd-dddd-4ddd-8ddd-dddddddddddd.webm'), 'invalid_attachment', 'cannot attach a file that was never uploaded');
select test.throws(format($$select public.send_message('', 'drawing', gen_random_uuid(), null, jsonb_build_object('path', %L))$$, (select id::text from sp) || '/voice/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webm'), 'invalid_attachment', 'drawing must live in the drawing folder');
select test.throws(format($$select public.send_message('', 'voice_note', gen_random_uuid(), null, jsonb_build_object('path', %L, 'seconds', 500))$$, (select id::text from sp) || '/voice/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webm'), 'invalid_attachment', 'voice note longer than 2 minutes rejected');

-- scheduled delivery (time capsule)
select test.throws($$select public.send_message('late', 'love_letter', gen_random_uuid(), null, null, now() - interval '1 hour')$$, 'invalid_schedule', 'cannot schedule in the past');
select test.throws($$select public.send_message('far', 'love_letter', gen_random_uuid(), null, null, now() + interval '6 years')$$, 'invalid_schedule', 'cannot schedule more than 5 years ahead');
create temp table cap as select public.send_message('open me later', 'love_letter', gen_random_uuid(), null, null, now() + interval '3 days') as r;
grant all on cap to public;
select test.ok((select r->'message'->>'push_status' from cap) = 'pending', 'scheduled message waits for delivery');
select test.ok(test.count_of($$select * from public.messages where content = 'open me later'$$) = 1, 'sender can see their scheduled message');
select test.login(:i);
select test.ok(test.count_of($$select * from public.messages where content = 'open me later'$$) = 0, 'recipient cannot see it before it is due');
select test.throws(format('select public.mark_message_read(%L)', (select r->'message'->>'id' from cap)), 'not_found', 'recipient cannot mark an undelivered message as read');
select test.superuser();
update public.messages set deliver_at = created_at + interval '1 millisecond' where content = 'open me later';
select test.login(:i);
select test.ok(test.count_of($$select * from public.messages where content = 'open me later'$$) = 1, 'recipient sees it once it is due');
select test.ok(public.mark_message_read((select (r->'message'->>'id')::uuid from cap)) is not null, 'and can open it');
select test.login(:j);
select test.ok(test.count_of($$select * from public.messages$$) = 0, 'outsider sees nothing');

-- ping limiter (10 / 10 min)
select test.login(:i);
do $$ begin for n in 1..10 loop perform public.send_message('Thinking of you', 'thinking_of_you', gen_random_uuid()); end loop; end $$;
select test.throws($$select public.send_message('Thinking of you', 'thinking_of_you', gen_random_uuid())$$, 'rate_limited', 'pings are limited to 10 per 10 minutes');
