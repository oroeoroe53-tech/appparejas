-- Permission + flow tests. Every assertion either passes or aborts the run.
\set a '''aaaaaaaa-0000-0000-0000-000000000001'''
\set b '''bbbbbbbb-0000-0000-0000-000000000002'''
\set c '''cccccccc-0000-0000-0000-000000000003'''
\set d '''dddddddd-0000-0000-0000-000000000004'''

select test.superuser();
insert into auth.users (id, email, raw_user_meta_data) values
  (:a, 'a@example.com', '{"display_name":"Ana"}'),
  (:b, 'b@example.com', '{"display_name":"Ben"}'),
  (:c, 'c@example.com', '{}'),
  (:d, 'd@example.com', '{"display_name":"   "}');

-- ---- signup trigger ----
select test.ok((select display_name from public.profiles where id = :a) = 'Ana', 'profile created from signup metadata');
select test.ok((select display_name from public.profiles where id = :c) = 'c', 'display name falls back to the email prefix');
select test.ok((select display_name from public.profiles where id = :d) = 'd', 'blank display name falls back too');
select test.ok((select count(*) from public.user_preferences) = 4, 'default preferences created');
select test.ok((select notification_preview_mode from public.user_preferences where user_id = :a) = 'full', 'notifications show the message by default (user can switch to private)');

-- ---- anonymous users get nothing ----
select test.anon();
select test.throws('select * from public.messages', 'permission denied', 'anon cannot read messages');
select test.throws('select * from public.profiles', 'permission denied', 'anon cannot read profiles');
select test.throws('select public.create_invitation()', 'permission denied', 'anon cannot call create_invitation');
select test.superuser();

-- ---- invitation + linking ----
select test.login(:a);
select test.throws('select * from public.couple_invitations', 'permission denied', 'clients cannot read invitations table');
select test.throws('select * from public.rate_events', 'permission denied', 'clients cannot read rate_events');
select test.throws($$insert into public.couple_spaces (created_by) values (auth.uid())$$, 'permission denied', 'clients cannot create spaces directly');
create temp table inv_a as select * from public.create_invitation();
grant all on inv_a to public;
select test.ok((select length(token) from inv_a) = 40, 'token has 40 chars');
select test.ok((select expires_at from inv_a) between now() + interval '47 hours' and now() + interval '49 hours', 'invitation expires in ~48h');
select test.ok((select status from public.couple_spaces) = 'waiting', 'space starts as waiting');
select test.ok(public.get_open_invitation() is not null, 'open invitation is reported (expiry only)');

select test.superuser();
select test.ok((select count(*) from public.couple_invitations where token_hash = public.invitation_hash((select token from inv_a))) = 1, 'only the token hash is stored');
select test.ok((select count(*) from public.couple_invitations where encode(token_hash, 'escape') = (select token from inv_a)) = 0, 'raw token is not stored');

-- creating a second invitation revokes the first
select test.login(:a);
create temp table inv_a2 as select * from public.create_invitation();
grant all on inv_a2 to public;
select test.login(:b);
select test.ok(public.accept_invitation((select token from inv_a)) is null, 'revoked token is rejected');
select test.ok((select count(*) from public.peek_invitation((select token from inv_a))) = 0, 'peek on a revoked token returns nothing');
select test.ok((select inviter_name from public.peek_invitation((select token from inv_a2))) = 'Ana', 'peek shows who invited');

-- A stranger cannot see the waiting space
select test.login(:c);
select test.ok(test.count_of('select * from public.couple_spaces') = 0, 'stranger cannot see the space');
select test.ok(test.count_of('select * from public.profiles where id <> auth.uid()') = 0, 'stranger cannot see other profiles');
select test.ok(public.accept_invitation('not-a-real-token') is null, 'garbage token is rejected without an error');
select test.throws($$select public.send_message('hi', 'little_note', gen_random_uuid())$$, 'no_active_space', 'cannot send without a partner');

-- Inviter cannot accept their own invitation
select test.login(:a);
select test.throws(format('select public.accept_invitation(%L)', (select token from inv_a2)), 'own_invitation', 'cannot accept your own invitation');

-- B accepts
select test.login(:b);
select test.ok(public.accept_invitation((select token from inv_a2)) is not null, 'B accepts the invitation');
select test.ok((select status from public.couple_spaces) = 'active', 'space becomes active');
select test.ok(test.count_of('select * from public.couple_members') = 2, 'both members visible to each other');
select test.ok(test.count_of('select * from public.profiles') = 2, 'partner profile is visible');

-- single use
select test.login(:c);
select test.ok(public.accept_invitation((select token from inv_a2)) is null, 'used token cannot be reused');
select test.ok(test.count_of('select * from public.couple_spaces') = 0, 'C still sees nothing');

-- a full space cannot issue invitations nor take members
select test.login(:a);
select test.throws('select public.create_invitation()', 'space_full', 'full space cannot create invitations');
select test.throws($$insert into public.couple_members (couple_space_id, user_id) values (public.my_space_id(), 'cccccccc-0000-0000-0000-000000000003')$$, 'permission denied', 'clients cannot insert members');
select test.superuser();
select test.throws($$insert into public.couple_members (couple_space_id, user_id) select couple_space_id, 'cccccccc-0000-0000-0000-000000000003' from public.couple_members limit 1$$, 'space_full', 'trigger enforces max two members even for privileged inserts');

-- expired invitation (C creates, we age it, D tries)
select test.login(:c);
create temp table inv_c as select * from public.create_invitation();
grant all on inv_c to public;
select test.superuser();
update public.couple_invitations set expires_at = now() - interval '1 minute';
select test.login(:d);
select test.ok(public.accept_invitation((select token from inv_c)) is null, 'expired invitation is rejected');
select test.superuser();
update public.couple_invitations set expires_at = now() + interval '1 day' where accepted_at is null and revoked_at is null;

-- A user already in a full space cannot join another one
select test.login(:a);
select test.throws(format('select public.accept_invitation(%L)', (select token from inv_c)), 'already_in_space', 'user in a couple cannot switch partner');

-- ---- messaging ----
select test.login(:a);
select test.throws($$insert into public.messages (couple_space_id, sender_id, recipient_id, content, message_type, client_id) values (public.my_space_id(), auth.uid(), 'bbbbbbbb-0000-0000-0000-000000000002', 'x', 'little_note', gen_random_uuid())$$, 'permission denied', 'clients cannot insert messages directly (no forged sender)');
select test.throws($$select public.send_message('   ', 'little_note', gen_random_uuid())$$, 'invalid_content', 'empty content rejected');
select test.throws($$select public.send_message(repeat('x', 281), 'little_note', gen_random_uuid())$$, 'invalid_content', 'little note over 280 chars rejected');
select test.throws($$select public.send_message(repeat('x', 3001), 'love_letter', gen_random_uuid())$$, 'invalid_content', 'letter over 3000 chars rejected');
select test.throws($$select public.send_message('hi', 'bogus', gen_random_uuid())$$, 'invalid_message_type', 'unknown type rejected');

create temp table sent1 as select public.send_message('Good morning, love.', 'love_letter', '11111111-1111-1111-1111-111111111111') as r;
grant all on sent1 to public;
select test.ok((select (r->>'is_new')::boolean from sent1), 'message created');
select test.ok((select r->'message'->>'sender_id' from sent1) = :a::text, 'sender derived from auth.uid()');
select test.ok((select r->'message'->>'recipient_id' from sent1) = :b::text, 'recipient derived from the space');
select test.ok((select r->'message'->>'read_at' from sent1) is null, 'new message is unread');
-- idempotency
select test.ok(not (public.send_message('Good morning, love.', 'love_letter', '11111111-1111-1111-1111-111111111111')->>'is_new')::boolean, 'same client_id returns the existing message');
select test.superuser();
select test.ok((select count(*) from public.messages) = 1, 'duplicate send did not create a second row');

-- visibility
select test.login(:b);
select test.ok(test.count_of('select * from public.messages') = 1, 'recipient can read');
select test.login(:c);
select test.ok(test.count_of('select * from public.messages') = 0, 'outsider cannot read the message');
select test.throws($$update public.messages set content = 'hacked'$$, 'permission denied', 'clients cannot update messages');
select test.throws($$delete from public.messages$$, 'permission denied', 'clients cannot delete messages');
select test.throws($$select public.mark_message_read('00000000-0000-0000-0000-000000000000')$$, 'not_found', 'cannot mark unknown message');
select test.throws(format('select public.mark_message_read(%L)', (select r->'message'->>'id' from sent1)), 'not_found', 'outsider cannot mark read');

-- read / react rules
select test.login(:a);
select test.throws(format('select public.mark_message_read(%L)', (select r->'message'->>'id' from sent1)), 'not_found', 'sender cannot mark their own message as read');
select test.login(:b);
select test.throws(format($$select public.react_to_message(%L, 'love')$$, (select r->'message'->>'id' from sent1)), 'not_found', 'cannot react before opening the message');
select test.ok(public.mark_message_read((select (r->'message'->>'id')::uuid from sent1)) is not null, 'recipient marks as read');
select test.throws(format($$select public.react_to_message(%L, 'rocket')$$, (select r->'message'->>'id' from sent1)), 'invalid_reaction', 'unknown reaction rejected');
select public.react_to_message((select (r->'message'->>'id')::uuid from sent1), 'love');
select test.login(:a);
select test.ok((select reaction from public.messages) = 'love', 'sender sees the reaction');
select test.throws(format($$select public.react_to_message(%L, 'love')$$, (select r->'message'->>'id' from sent1)), 'not_found', 'sender cannot react to their own message');

-- push_status is not client-writable
select test.throws($$update public.messages set push_status = 'sent'$$, 'permission denied', 'clients cannot change push_status');

-- rate limit
select test.login(:b);
do $$
declare i int;
begin
  for i in 1..30 loop
    perform public.send_message('hello ' || i, 'little_note', gen_random_uuid());
  end loop;
end $$;
select test.throws($$select public.send_message('one too many', 'little_note', gen_random_uuid())$$, 'rate_limited', 'message rate limit kicks in (30 / 10 min)');
select test.ok((public.send_message('hello 1', 'little_note', (select client_id from public.messages where sender_id = auth.uid() limit 1))->>'is_new')::boolean = false, 'idempotent retries are not rate limited');

-- profile / prefs permissions
select test.login(:a);
update public.profiles set display_name = 'Ana M' where id = :a;
select test.ok((select display_name from public.profiles where id = :a) = 'Ana M', 'user can update own profile');
with u as (update public.profiles set display_name = 'Pwned' where id = :b returning 1)
select test.ok((select count(*) from u) = 0, 'user cannot update the partner profile');
select test.throws($$update public.profiles set avatar_url = 'http://insecure.example/a.png' where id = auth.uid()$$, 'violates check constraint', 'avatar must be https');
select test.throws($$update public.profiles set id = gen_random_uuid() where id = auth.uid()$$, 'permission denied', 'profile id is immutable for clients');
update public.user_preferences set notification_preview_mode = 'full' where user_id = :a;
select test.ok((select notification_preview_mode from public.user_preferences where user_id = :a) = 'full', 'user can change own notification privacy mode');
select test.throws($$update public.user_preferences set notification_preview_mode = 'bogus' where user_id = auth.uid()$$, 'violates check constraint', 'invalid preview mode rejected');
with u as (update public.user_preferences set notification_preview_mode = 'full' where user_id = :b returning 1)
select test.ok((select count(*) from u) = 0, 'user cannot change partner preferences');
select test.ok(test.count_of('select * from public.user_preferences') = 1, 'preferences are private');
update public.couple_members set partner_nickname = 'Bunny' where user_id = :a;
select test.ok((select partner_nickname from public.couple_members where user_id = :a) = 'Bunny', 'user can set their own nickname for the partner');
with u as (update public.couple_members set partner_nickname = 'Nope' where user_id = :b returning 1)
select test.ok((select count(*) from u) = 0, 'user cannot rename how the partner calls them');
select test.throws($$update public.couple_members set couple_space_id = gen_random_uuid() where user_id = auth.uid()$$, 'permission denied', 'members cannot move themselves to another space');

-- ---- push subscriptions ----
select test.login(:b);
select public.register_push_subscription('https://push.example/endpoint-b', 'p256-b', 'auth-b', 'UA-B');
select test.ok(test.count_of('select id from public.push_subscriptions') = 1, 'user sees own subscription metadata');
select test.throws('select p256dh from public.push_subscriptions', 'permission denied', 'subscription keys are not readable by clients');
select test.throws('select endpoint from public.push_subscriptions', 'permission denied', 'subscription endpoint is not readable by clients');
select test.throws($$select public.register_push_subscription('http://insecure.example/x', 'k', 'a', 'UA')$$, 'violates check constraint', 'non-https endpoint rejected');
select test.login(:a);
select test.ok(test.count_of('select id from public.push_subscriptions') = 0, 'partner cannot see my subscriptions');
select public.remove_push_subscription('https://push.example/endpoint-b');
select test.superuser();
select test.ok((select count(*) from public.push_subscriptions) = 1, 'removing someone else''s endpoint has no effect');
select test.login(:a);
select public.register_push_subscription('https://push.example/endpoint-b', 'p256-a', 'auth-a', 'UA-A');
select test.superuser();
select test.ok((select user_id from public.push_subscriptions) = :a::uuid, 'endpoint re-registered on a shared device moves to the new user');
select test.ok((select count(*) from public.push_subscriptions) = 1, 'still a single row per endpoint');

-- ---- generic limiter is not callable by clients; the test-push wrapper is ----
select test.login(:a);
select test.throws($$select public.consume_rate_limit('x', 100000, interval '1 hour')$$, 'permission denied', 'clients cannot call the generic rate limiter');
select public.consume_test_push_limit();
select public.consume_test_push_limit();
select public.consume_test_push_limit();
select test.throws('select public.consume_test_push_limit()', 'rate_limited', 'test notification is limited to 3 per 10 minutes');

-- ---- brute force: failed token guesses are counted ----
select test.login(:d);
do $$
declare i int;
begin
  for i in 1..9 loop perform public.accept_invitation('guess-' || i); end loop;
end $$;
select test.throws($$select public.accept_invitation('guess-final')$$, 'rate_limited', 'failed invitation guesses are rate limited (10 / 10 min)');
select test.throws($$select * from public.peek_invitation('guess-final')$$, 'rate_limited', 'peek shares the same limiter');

-- ---- leaving ----
select test.login(:b);
select public.leave_space();
select test.ok(test.count_of('select * from public.messages') = 0, 'leaver loses access to the letters');
select test.ok(test.count_of('select * from public.couple_spaces') = 0, 'leaver no longer sees the space');
select test.ok(test.count_of('select * from public.profiles where id <> auth.uid()') = 0, 'leaver no longer sees the ex-partner profile');
select test.login(:a);
select test.ok((select status from public.couple_spaces) = 'ended', 'space is marked ended for the remaining person');
select test.ok(test.count_of('select * from public.messages') > 0, 'remaining person keeps their letters');
select test.throws($$select public.send_message('hello?', 'little_note', gen_random_uuid())$$, 'no_active_space', 'cannot send in an ended space');
select test.throws('select public.create_invitation()', 'space_ended', 'cannot re-invite into a space that holds old letters');
select public.leave_space();
select test.superuser();
select test.ok((select count(*) from public.couple_spaces where id in (select couple_space_id from public.messages)) = 0, 'space is deleted when the last person leaves');
select test.ok((select count(*) from public.messages) = 0, 'letters are deleted with the space');
select test.login(:a);
select test.ok((select count(*) from public.create_invitation()) = 1, 'after leaving, a user can start a fresh space');

-- ---- account deletion cleans up ----
select test.superuser();
delete from auth.users where id = :c;
select test.ok((select count(*) from public.couple_spaces where created_by = :c) = 0, 'deleting an account removes its solo space');
select test.ok((select count(*) from public.profiles where id = :c) = 0, 'deleting an account removes the profile');
