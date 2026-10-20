\set p1 '''9a9a9a9a-0000-0000-0000-0000000009a1'''
\set p2 '''9b9b9b9b-0000-0000-0000-0000000009b1'''
\set p3 '''9c9c9c9c-0000-0000-0000-0000000009c1'''

select test.superuser();
insert into auth.users (id, email, raw_user_meta_data) values (:p1, 'p1@example.com', '{"display_name":"Pia"}'), (:p2, 'p2@example.com', '{"display_name":"Pol"}'), (:p3, 'p3@example.com', '{}');
select test.login(:p1);
create temp table inv_p1 as select * from public.create_invitation();
grant all on inv_p1 to public;
select test.login(:p2);
select public.accept_invitation((select token from inv_p1));
select test.superuser();
create temp table sp2 as select couple_space_id as id from public.couple_members where user_id = :p1;
grant all on sp2 to public;

select test.login(:p1);
insert into storage.objects (bucket_id, name) values ('couple-media', (select id::text from sp2) || '/photos/cccccccc-1111-4111-8111-cccccccccccc.jpg');
insert into public.albums (title) values ('Trip');
insert into public.photos (album_id, storage_path, lat, lng, place) values ((select id from public.albums), (select id::text from sp2) || '/photos/cccccccc-1111-4111-8111-cccccccccccc.jpg', 38.7223, -9.1393, 'Lisboa, Portugal');
select test.ok((select place from public.photos) = 'Lisboa, Portugal', 'a photo can carry a place');
select test.throws($$update public.photos set lat = 10, lng = null$$, 'photos_lat_lng_together', 'latitude and longitude come together');
select test.throws($$update public.photos set lat = 123, lng = 5$$, 'photos_lat_check', 'latitude must be a real one');
select test.throws($$update public.photos set lng = 200$$, 'photos_lng_check', 'longitude must be a real one');
update public.photos set lat = 40.4168, lng = -3.7038, place = 'Madrid';
select test.ok((select lat from public.photos) = 40.4168, 'the place can be changed');
update public.photos set lat = null, lng = null, place = null;
select test.ok((select lat from public.photos) is null, 'and removed');
select test.login(:p2);
update public.photos set lat = 1, lng = 2, place = 'Their idea';
select test.ok((select place from public.photos) = 'Their idea', 'the partner can set the place too');
select test.login(:p3);
select test.ok((select count(*) from public.photos) = 0, 'outsiders see no photos or places');
