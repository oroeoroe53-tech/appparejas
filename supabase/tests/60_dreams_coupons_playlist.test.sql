\set u '''13131313-1313-1313-1313-1313131313aa'''
\set v '''14141414-1414-1414-1414-1414141414bb'''
\set w '''15151515-1515-1515-1515-1515151515cc'''

select test.superuser();
insert into auth.users (id, email, raw_user_meta_data) values (:u, 'u@example.com', '{"display_name":"Uma"}'), (:v, 'v@example.com', '{"display_name":"Vic"}'), (:w, 'w@example.com', '{}');
select test.login(:u);
create temp table inv_u as select * from public.create_invitation();
grant all on inv_u to public;
select test.login(:v);
select public.accept_invitation((select token from inv_u));

-- ---- dreams ----
select test.login(:u);
insert into public.dreams (title, note, target_date) values ('See the northern lights', 'in winter', date '2027-02-01');
select test.ok((select created_by from public.dreams) = :u::uuid, 'dream author set by the server');
select test.login(:v);
select test.ok((select count(*) from public.dreams) = 1, 'partner sees the dream');
update public.dreams set done = true;
select test.ok((select done_at from public.dreams) is not null, 'completing a dream stamps the time');
update public.dreams set done = false;
select test.ok((select done_at from public.dreams) is null, 'unchecking clears the time');
select test.throws($$update public.dreams set done_at = now()$$, 'permission denied', 'clients cannot set done_at');
with d as (delete from public.dreams returning 1) select test.ok((select count(*) from d) = 0, 'only the author deletes a dream');
select test.login(:w);
select test.ok((select count(*) from public.dreams) = 0, 'outsiders see no dreams');
select test.throws($$insert into public.dreams (title) values ('x')$$, 'no_active_space', 'outsiders cannot add dreams');

-- ---- coupons ----
select test.login(:u);
create temp table c1 as select public.give_coupon('Breakfast in bed', 'with pancakes') as r;
grant all on c1 to public;
select test.ok((select r->>'receiver_id' from c1) = :v::text, 'the coupon goes to the partner');
select test.throws($$select public.give_coupon('   ')$$, 'invalid_content', 'coupon needs a title');
select test.throws(format('select public.redeem_coupon(%L)', (select r->>'id' from c1)), 'not_found', 'the giver cannot use their own coupon');
select test.throws($$insert into public.coupons (couple_space_id, giver_id, receiver_id, title) values (public.my_space_id(), auth.uid(), auth.uid(), 'x')$$, 'permission denied', 'no direct coupon inserts');
select test.login(:v);
select test.ok((select count(*) from public.coupons) = 1, 'partner sees the coupon');
select test.ok((public.redeem_coupon((select (r->>'id')::uuid from c1))->>'status') = 'used', 'the receiver can use it');
select test.throws(format('select public.redeem_coupon(%L)', (select r->>'id' from c1)), 'not_found', 'a coupon can only be used once');
select test.login(:u);
select test.throws(format('select public.withdraw_coupon(%L)', (select r->>'id' from c1)), 'not_found', 'a used coupon cannot be withdrawn');
create temp table c2 as select public.give_coupon('Movie of my choice') as r;
select public.withdraw_coupon((select (r->>'id')::uuid from c2));
select test.ok((select count(*) from public.coupons) = 1, 'the giver can take back an unused coupon');
select test.login(:w);
select test.ok((select count(*) from public.coupons) = 0, 'outsiders see no coupons');
select test.throws($$select public.give_coupon('x')$$, 'no_active_space', 'outsiders cannot give coupons');

-- ---- playlist ----
select test.login(:u);
select public.add_playlist_song(jsonb_build_object('track_id','1440650428','title','Test Song','artist','Test Artist','preview_url','https://audio-ssl.itunes.apple.com/x.m4a','artwork_url','https://is1-ssl.mzstatic.com/a.jpg'), 'our song');
select test.throws($$select public.add_playlist_song(jsonb_build_object('track_id','1440650428','title','Again','artist','A','preview_url','https://audio-ssl.itunes.apple.com/x.m4a'))$$, 'already_added', 'the same track is added once');
select test.throws($$select public.add_playlist_song(jsonb_build_object('track_id','7','title','Evil','artist','A','preview_url','https://evil.example/x.m4a'))$$, 'invalid_song', 'foreign hosts rejected');
select test.throws($$select public.add_playlist_song(jsonb_build_object('track_id','8','artist','A','preview_url','https://audio-ssl.itunes.apple.com/y.m4a'))$$, 'invalid_song', 'a song needs a title');
select test.login(:v);
select test.ok((select count(*) from public.playlist_songs) = 1, 'partner sees the playlist');
select test.throws(format('select public.remove_playlist_song(%L)', (select id from public.playlist_songs)), 'not_found', 'only the person who added a song can remove it');
select test.login(:w);
select test.ok((select count(*) from public.playlist_songs) = 0, 'outsiders see no playlist');
select test.throws($$insert into public.playlist_songs (couple_space_id, added_by, song_track_id, song_title, song_artist, song_preview_url) values (gen_random_uuid(), auth.uid(), '1', 't', 'a', 'https://x.mzstatic.com/a')$$, 'permission denied', 'no direct playlist inserts');
select test.login(:u);
select public.remove_playlist_song((select id from public.playlist_songs));
select test.ok((select count(*) from public.playlist_songs) = 0, 'the adder can remove their song');
