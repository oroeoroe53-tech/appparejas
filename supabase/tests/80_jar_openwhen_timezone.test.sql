\set f1 '''f1f1f1f1-0000-0000-0000-0000000000f1'''
\set g1 '''91919191-0000-0000-0000-000000000091'''
\set h1 '''81818181-0000-0000-0000-000000000081'''

select test.superuser();
insert into auth.users (id, email, raw_user_meta_data) values (:f1, 'f1@example.com', '{"display_name":"Flo"}'), (:g1, 'g1@example.com', '{"display_name":"Gus"}'), (:h1, 'h1@example.com', '{}');
select test.login(:f1);
create temp table inv_f1 as select * from public.create_invitation();
grant all on inv_f1 to public;
select test.login(:g1);
select public.accept_invitation((select token from inv_f1));

-- ---- time zone ----
select public.set_my_timezone('Europe/Madrid');
select test.ok((select timezone from public.profiles where id = :g1) = 'Europe/Madrid', 'time zone saved');
select test.login(:f1);
select test.ok((select timezone from public.profiles where id = :g1) = 'Europe/Madrid', 'the partner can see it');
select test.throws($$select public.set_my_timezone('Mars/Olympus')$$, 'invalid_timezone', 'unknown time zone rejected');
select test.throws($$select public.set_my_timezone('<script>')$$, 'invalid_timezone', 'junk time zone rejected');
select test.throws($$update public.profiles set timezone = 'UTC' where id = auth.uid()$$, 'permission denied', 'no direct updates of the time zone');

-- ---- jar of reasons ----
insert into public.reasons (content) values ('Your laugh');
select test.ok((select created_by from public.reasons) = :f1::uuid, 'reason author set by the server');
select test.throws($$insert into public.reasons (content) values ('   ')$$, 'violates check constraint', 'empty reason rejected');
select test.throws($$insert into public.reasons (created_by, content) values (gen_random_uuid(), 'x')$$, 'permission denied', 'cannot forge the author');
select test.login(:g1);
select test.ok((select count(*) from public.reasons) = 1, 'partner can read the reasons');
with d as (delete from public.reasons returning 1) select test.ok((select count(*) from d) = 0, 'only the author deletes a reason');
select test.login(:h1);
select test.ok((select count(*) from public.reasons) = 0, 'outsiders see no reasons');
select test.throws($$insert into public.reasons (content) values ('x')$$, 'no_active_space', 'outsiders cannot add reasons');

-- ---- open when ----
select test.login(:f1);
create temp table ow as select public.write_open_when('you miss me', 'Secret words for a lonely evening', 'old_letter') as id;
grant all on ow to public;
select test.ok((select count(*) from public.open_when_bodies) = 1, 'the author can read their own letter text');
select test.throws($$select public.write_open_when('', 'x')$$, 'invalid_content', 'label required');
select test.throws($$select public.write_open_when('x', '   ')$$, 'invalid_content', 'text required');
select test.throws($$select public.write_open_when('x', 'y', 'rap_song')$$, 'invalid_content', 'unknown style rejected');
select test.throws($$insert into public.open_when_letters (couple_space_id, author_id, recipient_id, label) values (public.my_space_id(), auth.uid(), auth.uid(), 'x')$$, 'permission denied', 'no direct inserts');
select test.login(:g1);
select test.ok((select count(*) from public.open_when_letters) = 1, 'the recipient sees that a letter is waiting');
select test.ok((select label from public.open_when_letters) = 'you miss me', 'and its label');
select test.ok((select count(*) from public.open_when_bodies) = 0, 'but not the text before opening it');
select test.throws(format('select public.delete_open_when(%L)', (select id from ow)), 'not_found', 'the recipient cannot delete it');
select test.ok((public.open_open_when((select id from ow))->>'content') = 'Secret words for a lonely evening', 'opening reveals the text');
select test.ok((select count(*) from public.open_when_bodies) = 1, 'and it stays readable afterwards');
select test.ok((select opened_at from public.open_when_letters) is not null, 'the open time is recorded');
select test.login(:f1);
select test.throws(format('select public.open_open_when(%L)', (select id from ow)), 'not_found', 'the author cannot open their own letter');
select test.throws(format('select public.delete_open_when(%L)', (select id from ow)), 'not_found', 'an opened letter cannot be taken back');
create temp table ow2 as select public.write_open_when('you are sad', 'It will pass') as id;
select public.delete_open_when((select id from ow2));
select test.ok((select count(*) from public.open_when_letters) = 1, 'an unopened letter can be taken back');
select test.login(:h1);
select test.ok((select count(*) from public.open_when_letters) = 0 and (select count(*) from public.open_when_bodies) = 0, 'outsiders see nothing');
select test.throws($$select public.write_open_when('x', 'y')$$, 'no_active_space', 'outsiders cannot write');
