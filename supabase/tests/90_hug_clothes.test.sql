\set n '''a9a9a9a9-a9a9-a9a9-a9a9-a9a9a9a9a9aa'''
\set o '''b8b8b8b8-b8b8-b8b8-b8b8-b8b8b8b8b8bb'''
\set p '''c7c7c7c7-c7c7-c7c7-c7c7-c7c7c7c7c7cc'''

select test.superuser();
insert into auth.users (id, email, raw_user_meta_data) values (:n, 'n@example.com', '{"display_name":"Nia"}'), (:o, 'o@example.com', '{"display_name":"Oli"}'), (:p, 'p@example.com', '{}');
select test.login(:n);
create temp table inv_n as select * from public.create_invitation();
grant all on inv_n to public;
select test.login(:o);
select public.accept_invitation((select token from inv_n));

-- clothes
select test.login(:n);
select public.save_character('{"top":"hoodie","topColor":"6fa8dc","scarf":"striped","scarfColor":"c94c4c","hat":"pompom","hatColor":"d98fc0"}');
select test.ok((select config->>'top' from public.characters where designer_id = :n) = 'hoodie', 'clothing keys are saved');
select test.throws($$select public.save_character('{"cape":"red"}')$$, 'invalid_character', 'other new keys are still rejected');

-- hug
select test.ok((public.send_message('hug', 'hug', gen_random_uuid()) -> 'message' ->> 'message_type') = 'hug', 'a hug can be sent');
select test.throws($$select public.send_message('hug', 'hug', gen_random_uuid(), '{"track_id":"1"}')$$, 'invalid_song', 'a hug carries no song');
select test.throws($$select public.send_message('hug', 'hug', gen_random_uuid(), null, null, now() + interval '2 days')$$, 'invalid_schedule', 'a hug cannot be scheduled');
select test.throws($$select public.send_message(repeat('x', 101), 'hug', gen_random_uuid())$$, 'invalid_content', 'a hug has a short limit');
select test.login(:o);
select test.ok((select count(*) from public.messages where message_type = 'hug' and recipient_id = :o) = 1, 'the partner receives the hug');
select test.login(:p);
select test.ok((select count(*) from public.messages where message_type = 'hug') = 0, 'outsiders cannot see hugs');
select test.throws($$select public.send_message('hug', 'hug', gen_random_uuid())$$, 'no_active_space', 'outsiders cannot send hugs');

-- hugs share the "ping" limiter (10 per 10 minutes)
select test.login(:n);
do $$
declare i int;
begin
  for i in 1..9 loop perform public.send_message('hug', 'hug', gen_random_uuid()); end loop;
end $$;
select test.throws($$select public.send_message('hug', 'hug', gen_random_uuid())$$, 'rate_limited', 'hugs are rate limited');
