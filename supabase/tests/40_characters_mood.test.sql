\set k '''44444444-4444-4444-4444-4444444444aa'''
\set l '''55555555-5555-5555-5555-5555555555bb'''
\set m '''66666666-6666-6666-6666-6666666666cc'''

select test.superuser();
insert into auth.users (id, email, raw_user_meta_data) values (:k, 'k@example.com', '{"display_name":"Kai"}'), (:l, 'l@example.com', '{"display_name":"Lou"}'), (:m, 'm@example.com', '{}');
select test.login(:k);
create temp table inv_k as select * from public.create_invitation();
grant all on inv_k to public;
select test.throws($$select public.save_character('{"hair":"variant01"}')$$, 'no_active_space', 'cannot design before the partner has joined');
select test.login(:l);
select public.accept_invitation((select token from inv_k));

-- characters
select test.login(:k);
select public.save_character('{"hair":"variant12","skinColor":"f1c6a0","hairColor":"6d4c41","glasses":"none","freckles":"on"}');
select test.ok((select config->>'hair' from public.characters where designer_id = :k) = 'variant12', 'designer saved a character');
select public.save_character('{"hair":"variant03"}');
select test.ok((select count(*) from public.characters) = 1, 'saving again updates the same row');
select test.throws($$select public.save_character('{"hair":"<script>"}')$$, 'invalid_character', 'values must be plain tokens');
select test.throws($$select public.save_character('{"evil":"variant01"}')$$, 'invalid_character', 'unknown keys rejected');
select test.throws($$select public.save_character('{"hair":["variant01"]}')$$, 'invalid_character', 'non-string values rejected');
select test.throws($$select public.save_character('"nope"')$$, 'invalid_character', 'config must be an object');
select test.throws($$select public.save_character(jsonb_build_object('hair', repeat('a', 17)))$$, 'invalid_character', 'overlong values rejected');
select test.throws($$insert into public.characters (couple_space_id, designer_id, config) values (public.my_space_id(), auth.uid(), '{}')$$, 'permission denied', 'clients cannot write characters directly');
select test.login(:l);
select test.ok((select config->>'hair' from public.characters where designer_id = :k) = 'variant03', 'partner can see the portrait made of them');
select public.save_character('{"hair":"variant20"}');
select test.ok((select count(*) from public.characters) = 2, 'each person has their own portrait row');
select test.login(:m);
select test.ok((select count(*) from public.characters) = 0, 'outsiders cannot see characters');
select test.throws($$select public.save_character('{"hair":"variant01"}')$$, 'no_active_space', 'outsiders cannot save one');

-- mood
select test.login(:k);
select public.set_mood('loved', 'thinking about dinner');
select test.ok((select mood from public.moods where user_id = :k) = 'loved', 'mood saved');
select test.login(:l);
select test.ok((select note from public.moods where user_id = :k) = 'thinking about dinner', 'partner sees the mood and note');
select test.throws($$select public.set_mood('furious')$$, 'invalid_mood', 'unknown mood rejected');
select test.login(:m);
select test.ok((select count(*) from public.moods) = 0, 'outsiders cannot see moods');
select test.throws($$update public.moods set mood = 'sad'$$, 'permission denied', 'clients cannot write moods directly');
select test.login(:k);
select public.set_mood(null);
select test.ok((select count(*) from public.moods where user_id = :k) = 0, 'mood can be cleared');

-- together since
select test.login(:l);
select public.set_together_since(date '2024-02-14');
select test.ok((select together_since from public.couple_spaces) = date '2024-02-14', 'either person can set the day you got together');
select test.throws($$select public.set_together_since(date '1900-01-01')$$, 'invalid_date', 'too old rejected');
select test.throws($$select public.set_together_since(current_date + 30)$$, 'invalid_date', 'future dates rejected');
select test.throws($$update public.couple_spaces set together_since = date '2020-01-01'$$, 'permission denied', 'clients cannot update spaces directly');
select test.login(:m);
select test.throws($$select public.set_together_since(date '2024-01-01')$$, 'no_active_space', 'outsiders cannot set it');

-- leaving removes the leaver's mood and portraits
select test.login(:l);
select public.set_mood('calm');
select public.leave_space();
select test.superuser();
select test.ok((select count(*) from public.moods where user_id = :l) = 0, 'leaver mood removed');
select test.ok((select count(*) from public.characters where designer_id = :l) = 0, 'leaver portrait removed');
select test.ok((select count(*) from public.characters where designer_id = :k) = 1, 'the portrait the remaining person made stays with them');
