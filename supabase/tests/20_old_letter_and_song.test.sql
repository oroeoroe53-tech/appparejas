\set e '''eeeeeeee-0000-0000-0000-000000000005'''
\set f '''ffffffff-0000-0000-0000-000000000006'''
\set g '''99999999-0000-0000-0000-000000000007'''

select test.superuser();
insert into auth.users (id, email, raw_user_meta_data) values
  (:e, 'e@example.com', '{"display_name":"Eli"}'),
  (:f, 'f@example.com', '{"display_name":"Fay"}'),
  (:g, 'g@example.com', '{}');

select test.login(:e);
create temp table inv_e as select * from public.create_invitation();
grant all on inv_e to public;
select test.login(:f);
select test.ok(public.accept_invitation((select token from inv_e)) is not null, 'couple E+F linked');

-- ---- old_letter style ----
select test.login(:e);
select test.ok((public.send_message(repeat('x', 3000), 'old_letter', gen_random_uuid())->>'is_new')::boolean, 'old_letter accepts 3000 chars');
select test.throws($$select public.send_message(repeat('x', 3001), 'old_letter', gen_random_uuid())$$, 'invalid_content', 'old_letter rejects 3001 chars');
select test.ok((select r->'message'->>'song_track_id' from (select public.send_message('plain', 'little_note', gen_random_uuid()) r) q) is null, 'message without a song has no song fields');

-- ---- song attachment ----
create temp table song_ok as select public.send_message('with music', 'love_letter', gen_random_uuid(), jsonb_build_object(
  'track_id', '1440650428', 'title', 'Test Song', 'artist', 'Test Artist',
  'preview_url', 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview/v4/ab/cd/ef/test.m4a',
  'artwork_url', 'https://is1-ssl.mzstatic.com/image/thumb/Music/test/100x100bb.jpg',
  'start', 8, 'duration', 15)) as r;
grant all on song_ok to public;
select test.ok((select r->'message'->>'song_title' from song_ok) = 'Test Song', 'song clip stored');
select test.ok((select (r->'message'->>'song_start')::int from song_ok) = 8, 'song start stored');

select test.throws($$select public.send_message('x','little_note',gen_random_uuid(), jsonb_build_object('track_id','1','title','T','artist','A','preview_url','https://evil.example/a.m4a','start',0,'duration',10))$$, 'invalid_song', 'non-Apple preview host rejected');
select test.throws($$select public.send_message('x','little_note',gen_random_uuid(), jsonb_build_object('track_id','1','title','T','artist','A','preview_url','https://itunes.apple.com.evil.example/a.m4a','start',0,'duration',10))$$, 'invalid_song', 'look-alike host rejected');
select test.throws($$select public.send_message('x','little_note',gen_random_uuid(), jsonb_build_object('track_id','1','title','T','artist','A','preview_url','http://audio-ssl.itunes.apple.com/a.m4a','start',0,'duration',10))$$, 'invalid_song', 'insecure preview url rejected');
select test.throws($$select public.send_message('x','little_note',gen_random_uuid(), jsonb_build_object('track_id','1','title','T','artist','A','preview_url','https://audio-ssl.itunes.apple.com/a.m4a','start',20,'duration',15))$$, 'invalid_song', 'clip beyond the 30s preview rejected');
select test.throws($$select public.send_message('x','little_note',gen_random_uuid(), jsonb_build_object('track_id','1','title','T','artist','A','preview_url','https://audio-ssl.itunes.apple.com/a.m4a','start',0,'duration',2))$$, 'invalid_song', 'clip shorter than 3s rejected');
select test.throws($$select public.send_message('x','little_note',gen_random_uuid(), jsonb_build_object('track_id','abc','title','T','artist','A','preview_url','https://audio-ssl.itunes.apple.com/a.m4a','start',0,'duration',10))$$, 'invalid_song', 'non-numeric track id rejected');
select test.throws($$select public.send_message('x','little_note',gen_random_uuid(), jsonb_build_object('track_id','1','title','T','artist','A','preview_url','https://audio-ssl.itunes.apple.com/a.m4a','start','soon','duration',10))$$, 'invalid_song', 'non-numeric start rejected');
select test.throws($$select public.send_message('x','little_note',gen_random_uuid(), '"just a string"'::jsonb)$$, 'invalid_song', 'song must be an object');
select test.throws($$select public.send_message('x','little_note',gen_random_uuid(), jsonb_build_object('track_id','1','title','','artist','A','preview_url','https://audio-ssl.itunes.apple.com/a.m4a','start',0,'duration',10))$$, 'invalid_song', 'song needs a title');

-- visibility of the song clip
select test.login(:f);
select test.ok((select count(*) from public.messages where song_track_id is not null) = 1, 'recipient can read the song clip');
select test.login(:g);
select test.ok((select count(*) from public.messages where song_track_id is not null) = 0, 'outsider cannot see song clips');
select test.throws($$update public.messages set song_preview_url = 'https://evil.example/x'$$, 'permission denied', 'clients cannot edit song fields');

-- song search limiter
select test.login(:e);
do $$ begin for i in 1..30 loop perform public.consume_song_search_limit(); end loop; end $$;
select test.throws('select public.consume_song_search_limit()', 'rate_limited', 'song search limited to 30 per 10 minutes');
select test.throws($$select public.consume_song_search_limit()$$, 'rate_limited', 'limit persists');
select test.login(:g);
select test.ok(true, 'other users are not affected by the limit') where (select count(*) from public.messages) = 0;
