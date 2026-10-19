\set n '''77777777-7777-7777-7777-7777777777aa'''
\set o '''88888888-8888-8888-8888-8888888888bb'''
\set q '''12121212-1212-1212-1212-1212121212cc'''

select test.superuser();
insert into auth.users (id, email, raw_user_meta_data) values (:n, 'n@example.com', '{"display_name":"Nia"}'), (:o, 'o@example.com', '{"display_name":"Oz"}'), (:q, 'q@example.com', '{}');
select test.login(:n);
create temp table inv_n as select * from public.create_invitation();
grant all on inv_n to public;
select test.throws($$insert into public.couple_events (title, event_date) values ('too early', date '2026-01-01')$$, 'no_active_space', 'cannot add events before the partner joined');
select test.login(:o);
select public.accept_invitation((select token from inv_n));

-- ---- events ----
select test.login(:n);
insert into public.couple_events (title, event_date, kind, repeat_yearly) values ('First kiss', date '2025-03-02', 'anniversary', true);
select test.ok((select created_by from public.couple_events) = :n::uuid, 'author is set by the server');
select test.ok((select couple_space_id from public.couple_events) = public.my_space_id(), 'space is set by the server');
select test.throws($$insert into public.couple_events (couple_space_id, title, event_date) values (gen_random_uuid(), 'forged', date '2026-01-01')$$, 'permission denied', 'cannot choose the space');
select test.throws($$insert into public.couple_events (created_by, title, event_date) values (gen_random_uuid(), 'forged', date '2026-01-01')$$, 'permission denied', 'cannot choose the author');
select test.throws($$insert into public.couple_events (title, event_date) values ('   ', date '2026-01-01')$$, 'violates check constraint', 'empty title rejected');
select test.throws($$insert into public.couple_events (title, event_date, kind) values ('x', date '2026-01-01', 'party')$$, 'violates check constraint', 'unknown kind rejected');
select test.login(:o);
select test.ok((select count(*) from public.couple_events) = 1, 'partner sees shared events');
update public.couple_events set title = 'Our first kiss';
select test.ok((select title from public.couple_events) = 'Our first kiss', 'either person can edit');
with d as (delete from public.couple_events returning 1) select test.ok((select count(*) from d) = 0, 'only the author can delete');
select test.throws($$update public.couple_events set created_by = auth.uid()$$, 'permission denied', 'author cannot be changed');
select test.login(:q);
select test.ok((select count(*) from public.couple_events) = 0, 'outsiders see no events');
select test.throws($$insert into public.couple_events (title, event_date) values ('x', date '2026-01-01')$$, 'no_active_space', 'outsiders cannot add events');
select test.login(:n);
with d as (delete from public.couple_events returning 1) select test.ok((select count(*) from d) = 1, 'the author can delete');

-- ---- story ----
insert into public.timeline_entries (title, note, happened_on) values ('We met', 'a rainy day', date '2025-01-10');
select test.throws($$insert into public.timeline_entries (title, happened_on, photo_path) values ('bad photo', date '2025-01-10', 'elsewhere/story/x.jpg')$$, 'violates check constraint', 'photo must live in the couple folder');
select test.login(:o);
select test.ok((select count(*) from public.timeline_entries) = 1, 'partner sees the story');
select test.login(:q);
select test.ok((select count(*) from public.timeline_entries) = 0, 'outsiders see no story');

-- ---- daily question ----
select test.login(:n);
select test.ok(not public.partner_has_answered((now() at time zone 'utc')::date), 'nobody answered yet');
select public.answer_question('Pizza, always.');
select test.throws($$select public.answer_question('Changed my mind')$$, 'already_answered', 'one answer per day');
select test.throws($$select public.answer_question('   ')$$, 'invalid_content', 'empty answer rejected');
select test.login(:o);
select test.ok(public.partner_has_answered((now() at time zone 'utc')::date), 'the app can tell the partner already answered');
select test.ok((select count(*) from public.question_answers) = 0, 'partner answer stays hidden until you answer');
select public.answer_question('Tacos.');
select test.ok((select count(*) from public.question_answers) = 2, 'both answers visible once both answered');
select test.login(:q);
select test.ok((select count(*) from public.question_answers) = 0, 'outsiders see no answers');
select test.throws($$select public.answer_question('hi')$$, 'no_active_space', 'outsiders cannot answer');
select test.throws($$insert into public.question_answers (couple_space_id, day, user_id, answer) values (gen_random_uuid(), current_date, auth.uid(), 'x')$$, 'permission denied', 'no direct inserts');
