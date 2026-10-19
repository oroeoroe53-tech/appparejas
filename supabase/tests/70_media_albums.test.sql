\set a1 '''a1a1a1a1-0000-0000-0000-0000000000a1'''
\set b1 '''b1b1b1b1-0000-0000-0000-0000000000b1'''
\set c1 '''c1c1c1c1-0000-0000-0000-0000000000c1'''

select test.superuser();
insert into auth.users (id, email, raw_user_meta_data) values (:a1, 'a1@example.com', '{"display_name":"Al"}'), (:b1, 'b1@example.com', '{"display_name":"Bo"}'), (:c1, 'c1@example.com', '{}');
select test.login(:a1);
create temp table inv_a1 as select * from public.create_invitation();
grant all on inv_a1 to public;
select test.login(:b1);
select public.accept_invitation((select token from inv_a1));
select test.superuser();
create temp table sp as select couple_space_id as id from public.couple_members where user_id = :a1;
grant all on sp to public;

select test.ok((select public from storage.buckets where id = 'couple-media') = false, 'the media bucket is private');

-- ---- storage policies ----
select test.login(:a1);
insert into storage.objects (bucket_id, name) values ('couple-media', (select id::text from sp) || '/photos/aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa.jpg');
select test.ok(test.count_of($$select * from storage.objects$$) = 1, 'a member can upload into their couple folder');
select test.throws($$insert into storage.objects (bucket_id, name) values ('couple-media', 'ffffffff-ffff-ffff-ffff-ffffffffffff/photos/x.jpg')$$, 'row-level security', 'cannot upload into another couple folder');
select test.throws($$insert into storage.objects (bucket_id, name) values ('couple-media', 'loose-file.jpg')$$, 'row-level security', 'cannot upload outside a couple folder');
select test.login(:b1);
select test.ok(test.count_of($$select * from storage.objects$$) = 1, 'the partner can read the couple files');
with d as (delete from storage.objects returning 1) select test.ok((select count(*) from d) = 0, 'but cannot delete files the other person uploaded');
select test.login(:c1);
select test.ok(test.count_of($$select * from storage.objects$$) = 0, 'outsiders cannot read the files');
select test.throws(format($$insert into storage.objects (bucket_id, name) values ('couple-media', %L)$$, (select id::text from sp) || '/photos/bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb.jpg'), 'row-level security', 'outsiders cannot upload into someone elses folder');

-- ---- albums + photos ----
select test.login(:a1);
insert into public.albums (title) values ('Lisbon');
select test.ok((select created_by from public.albums) = :a1::uuid, 'album author set by the server');
insert into public.photos (album_id, storage_path, caption) values ((select id from public.albums), (select id::text from sp) || '/photos/aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa.jpg', 'sunset');
select test.ok((select count(*) from public.photos) = 1, 'photo added');
select test.throws(format($$insert into public.photos (album_id, storage_path) values (%L, %L)$$, (select id from public.albums), (select id::text from sp) || '/photos/dddddddd-4444-4444-8444-dddddddddddd.jpg'), 'invalid_file', 'photo must point to an uploaded file');
select test.throws(format($$insert into public.photos (album_id, storage_path) values (%L, %L)$$, (select id from public.albums), 'other/photos/aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa.jpg'), 'invalid_file', 'a photo path outside the couple folder is rejected');
select test.throws($$insert into public.photos (album_id, storage_path) values (gen_random_uuid(), (select id::text from sp) || '/photos/aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa.jpg')$$, 'invalid_album', 'photo must belong to a real album of the couple');
select test.throws($$insert into public.photos (couple_space_id, album_id, storage_path) values (gen_random_uuid(), gen_random_uuid(), 'x')$$, 'permission denied', 'cannot choose the space');
select test.login(:b1);
select test.ok((select count(*) from public.photos) = 1 and (select count(*) from public.albums) = 1, 'partner sees albums and photos');
update public.photos set caption = 'our sunset';
select test.ok((select caption from public.photos) = 'our sunset', 'either person can edit a caption');
select test.throws($$update public.photos set storage_path = 'x'$$, 'permission denied', 'file path is immutable');
with d as (delete from public.albums returning 1) select test.ok((select count(*) from d) = 0, 'only the author deletes an album');
select test.login(:c1);
select test.ok((select count(*) from public.photos) = 0 and (select count(*) from public.albums) = 0, 'outsiders see no albums');
select test.login(:a1);
with d as (delete from public.albums returning 1) select test.ok((select count(*) from d) = 1, 'the author deletes the album');
select test.ok((select count(*) from public.photos) = 0, 'its photos go with it');

-- ---- story photo path check ----
insert into public.timeline_entries (title, happened_on, photo_path) values ('With photo', date '2025-05-05', (select id::text from sp) || '/story/cccccccc-3333-4333-8333-cccccccccccc.jpg');
select test.ok((select count(*) from public.timeline_entries where photo_path is not null) = 1, 'story entries can reference a story photo');
