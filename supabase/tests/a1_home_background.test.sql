\set h1 '''9d9d9d9d-0000-0000-0000-0000000009d1'''
\set h2 '''9e9e9e9e-0000-0000-0000-0000000009e1'''
\set h3 '''9f9f9f9f-0000-0000-0000-0000000009f1'''

select test.superuser();
insert into auth.users (id, email, raw_user_meta_data) values (:h1, 'h1@example.com', '{"display_name":"Hal"}'), (:h2, 'h2@example.com', '{"display_name":"Hye"}'), (:h3, 'h3@example.com', '{"display_name":"Hoo"}');
select test.login(:h1);
create temp table inv_h1 as select * from public.create_invitation();
grant all on inv_h1 to public;
select test.login(:h2);
select public.accept_invitation((select token from inv_h1));
select test.superuser();
create temp table sp3 as select couple_space_id as id from public.couple_members where user_id = :h1;
grant all on sp3 to public;

select test.login(:h1);
insert into storage.objects (bucket_id, name) values ('couple-media', (select id::text from sp3) || '/photos/dddddddd-1111-4111-8111-dddddddddddd.jpg');
update public.user_preferences set home_bg_path = (select id::text from sp3) || '/photos/dddddddd-1111-4111-8111-dddddddddddd.jpg' where user_id = :h1;
select test.ok((select home_bg_path from public.user_preferences where user_id = :h1) is not null, 'a couple photo can be the home background');
select test.throws($$update public.user_preferences set home_bg_path = 'ffffffff-ffff-ffff-ffff-ffffffffffff/photos/dddddddd-1111-4111-8111-dddddddddddd.jpg'$$, 'invalid_photo', 'a photo of another couple is refused');
select test.throws($$update public.user_preferences set home_bg_path = (select id::text from sp3) || '/photos/00000000-0000-4000-8000-000000000000.jpg'$$, 'invalid_photo', 'the photo must exist');
select test.throws($$update public.user_preferences set home_bg_path = 'not a path'$$, 'invalid_photo', 'only a photo path is accepted');
select test.login(:h2);
select test.ok((select home_bg_path from public.user_preferences) is null, 'the choice is personal: the partner keeps their own background');
select test.login(:h1);
update public.user_preferences set home_bg_path = null where user_id = :h1;
select test.ok((select home_bg_path from public.user_preferences where user_id = :h1) is null, 'it can go back to the default');
select test.login(:h3);
select test.throws(format($$update public.user_preferences set home_bg_path = %L where user_id = %L$$, (select id::text from sp3) || '/photos/dddddddd-1111-4111-8111-dddddddddddd.jpg', :h3), 'invalid_photo', 'outsiders cannot use the couple photo');
