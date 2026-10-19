-- US — a little place for two
-- Initial schema: profiles, couple spaces, invitations, messages, push subscriptions.
--
-- Security model
--   * Every table has RLS enabled. Clients get SELECT on the rows they may see and
--     nothing else; every write goes through a SECURITY DEFINER function that derives
--     the acting user from auth.uid() and never trusts ids sent by the client.
--   * A user can belong to at most one couple space and a space has at most two members
--     (unique(user_id) + trigger).
--   * Invitation tokens are never stored, only their SHA-256 hash.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  avatar_url   text check (avatar_url is null or (avatar_url ~ '^https://' and char_length(avatar_url) <= 500)),
  created_at   timestamptz not null default now()
);

create table public.user_preferences (
  user_id                   uuid primary key references auth.users (id) on delete cascade,
  notifications_enabled     boolean not null default true,
  notification_preview_mode text not null default 'generic' check (notification_preview_mode in ('generic', 'full')),
  theme                     text not null default 'system' check (theme in ('system', 'light', 'dark')),
  updated_at                timestamptz not null default now()
);

create table public.couple_spaces (
  id         uuid primary key default gen_random_uuid(),
  status     text not null default 'waiting' check (status in ('waiting', 'active', 'ended')),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.couple_members (
  couple_space_id  uuid not null references public.couple_spaces (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  partner_nickname text check (partner_nickname is null or char_length(btrim(partner_nickname)) between 1 and 40),
  joined_at        timestamptz not null default now(),
  primary key (couple_space_id, user_id),
  -- a user can only ever be in one space
  unique (user_id)
);
create index couple_members_space_idx on public.couple_members (couple_space_id);

create table public.couple_invitations (
  id              uuid primary key default gen_random_uuid(),
  couple_space_id uuid not null references public.couple_spaces (id) on delete cascade,
  token_hash      bytea not null unique,
  expires_at      timestamptz not null,
  accepted_at     timestamptz,
  accepted_by     uuid references auth.users (id) on delete set null,
  revoked_at      timestamptz,
  created_by      uuid not null references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now()
);
create index couple_invitations_space_idx on public.couple_invitations (couple_space_id);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  couple_space_id uuid not null references public.couple_spaces (id) on delete cascade,
  sender_id       uuid not null references auth.users (id) on delete cascade,
  recipient_id    uuid not null references auth.users (id) on delete cascade,
  content         text not null check (char_length(btrim(content)) between 1 and 3000),
  message_type    text not null check (message_type in ('love_letter', 'little_note', 'heart_message', 'hug_in_words', 'secret_message')),
  -- client-generated idempotency key: a retry of the same draft never creates a second message
  client_id       uuid not null,
  created_at      timestamptz not null default now(),
  read_at         timestamptz,
  reaction        text check (reaction is null or reaction in ('love', 'smile', 'miss', 'thanks', 'hug')),
  reacted_at      timestamptz,
  -- 'sent' means the push service ACCEPTED the notification. It is not proof of delivery.
  push_status     text not null default 'pending' check (push_status in ('pending', 'sent', 'failed', 'skipped')),
  check (sender_id <> recipient_id),
  unique (sender_id, client_id)
);
create index messages_space_created_idx on public.messages (couple_space_id, created_at desc);
create index messages_recipient_unread_idx on public.messages (recipient_id) where read_at is null;

create table public.push_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  endpoint         text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 2048),
  p256dh           text not null check (char_length(p256dh) <= 256),
  auth             text not null check (char_length(auth) <= 256),
  user_agent       text check (user_agent is null or char_length(user_agent) <= 300),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  last_success_at  timestamptz,
  failure_count    integer not null default 0
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Generic per-user event log used for rate limiting. Never readable by clients.
create table public.rate_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null,
  created_at timestamptz not null default now()
);
create index rate_events_lookup_idx on public.rate_events (user_id, kind, created_at desc);

-- ---------------------------------------------------------------------------
-- Privileges: start from zero, then grant the minimum.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
-- Functions are locked down at the end of this file, once they all exist
-- (Postgres grants EXECUTE to PUBLIC on creation, which `in schema` defaults cannot undo).

grant select on public.profiles, public.user_preferences, public.couple_spaces, public.couple_members, public.messages to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
grant update (notifications_enabled, notification_preview_mode, theme, updated_at) on public.user_preferences to authenticated;
grant update (partner_nickname) on public.couple_members to authenticated;
-- Push subscription keys are NOT readable by clients, only harmless metadata.
grant select (id, user_id, user_agent, created_at, updated_at, last_success_at) on public.push_subscriptions to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.my_space_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select couple_space_id from public.couple_members where user_id = (select auth.uid()) $$;

create function public.partner_of(p_space uuid) returns uuid
language sql stable security definer set search_path = ''
as $$
  select user_id from public.couple_members
  where couple_space_id = p_space and user_id <> (select auth.uid())
  limit 1
$$;

-- Raises 'rate_limited' when the caller exceeded p_max events of p_kind within p_window.
create function public.consume_rate_limit(p_kind text, p_max integer, p_window interval)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  recent integer;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  delete from public.rate_events where user_id = uid and created_at < now() - interval '1 day';
  select count(*) into recent from public.rate_events
    where user_id = uid and kind = p_kind and created_at > now() - p_window;
  if recent >= p_max then raise exception 'rate_limited'; end if;
  insert into public.rate_events (user_id, kind) values (uid, p_kind);
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

alter table public.profiles           enable row level security;
alter table public.user_preferences   enable row level security;
alter table public.couple_spaces      enable row level security;
alter table public.couple_members     enable row level security;
alter table public.couple_invitations enable row level security;
alter table public.messages           enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.rate_events        enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or id in (select user_id from public.couple_members where couple_space_id = (select public.my_space_id())));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy prefs_select on public.user_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy prefs_update on public.user_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy spaces_select on public.couple_spaces for select to authenticated
  using (id = (select public.my_space_id()));

create policy members_select on public.couple_members for select to authenticated
  using (couple_space_id = (select public.my_space_id()));
create policy members_update_self on public.couple_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Only the two people involved can read a message, and only inside their own space.
create policy messages_select on public.messages for select to authenticated
  using (
    couple_space_id = (select public.my_space_id())
    and (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()))
  );

create policy push_select_own on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

-- couple_invitations and rate_events: RLS on, no policies => no client access at all.

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- New auth user => profile + default preferences.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  raw_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(raw_name, nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Me'), 40));
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- A space never has more than two members, even under concurrent inserts.
create function public.enforce_max_two_members() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform 1 from public.couple_spaces where id = new.couple_space_id for update;
  if (select count(*) from public.couple_members where couple_space_id = new.couple_space_id) >= 2 then
    raise exception 'space_full';
  end if;
  return new;
end;
$$;
create trigger couple_members_max_two before insert on public.couple_members
  for each row execute function public.enforce_max_two_members();

-- When someone leaves (or their account is deleted):
--   * nobody left  => the space and all its letters are deleted
--   * one left     => the space becomes 'ended' (read-only for the remaining person)
create function public.handle_member_removed() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.couple_members where couple_space_id = old.couple_space_id) then
    delete from public.couple_spaces where id = old.couple_space_id;
  else
    update public.couple_spaces set status = 'ended' where id = old.couple_space_id;
    update public.couple_invitations set revoked_at = now()
      where couple_space_id = old.couple_space_id and accepted_at is null and revoked_at is null;
  end if;
  return null;
end;
$$;
create trigger couple_members_removed after delete on public.couple_members
  for each row execute function public.handle_member_removed();

-- ---------------------------------------------------------------------------
-- Invitation flow
-- ---------------------------------------------------------------------------

create function public.invitation_hash(p_token text) returns bytea
language sql immutable set search_path = ''
as $$ select sha256(convert_to(btrim(p_token), 'utf8')) $$;

-- Creates (or reuses) the caller's space and returns a fresh one-time token.
-- The raw token is returned once and never stored.
create function public.create_invitation()
returns table (token text, expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  sp uuid;
  sp_status text;
  raw text;
  exp timestamptz := now() + interval '48 hours';
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  perform public.consume_rate_limit('invite', 5, interval '1 hour');

  select couple_space_id into sp from public.couple_members where user_id = uid;
  if sp is null then
    insert into public.couple_spaces (created_by) values (uid) returning id into sp;
    insert into public.couple_members (couple_space_id, user_id) values (sp, uid);
  else
    select status into sp_status from public.couple_spaces where id = sp;
    if sp_status = 'active' then raise exception 'space_full'; end if;
    if sp_status = 'ended' then raise exception 'space_ended'; end if;
  end if;

  update public.couple_invitations set revoked_at = now()
    where couple_space_id = sp and accepted_at is null and revoked_at is null;

  raw := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  raw := left(raw, 40);
  insert into public.couple_invitations (couple_space_id, token_hash, expires_at, created_by)
  values (sp, public.invitation_hash(raw), exp, uid);

  return query select raw, exp;
end;
$$;

-- Expiry of the caller's currently open invitation (the token itself cannot be recovered).
create function public.get_open_invitation() returns timestamptz
language sql stable security definer set search_path = ''
as $$
  select max(i.expires_at) from public.couple_invitations i
  where i.couple_space_id = (select public.my_space_id())
    and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
$$;

create function public.revoke_invitations() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  update public.couple_invitations set revoked_at = now()
    where couple_space_id = (select public.my_space_id()) and accepted_at is null and revoked_at is null;
end;
$$;

-- Lets the invited person see who invited them before accepting.
create function public.peek_invitation(p_token text)
returns table (inviter_name text)
language plpgsql security definer set search_path = ''
as $$
declare
  inv public.couple_invitations;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  perform public.consume_rate_limit('join_attempt', 10, interval '10 minutes');
  select * into inv from public.couple_invitations where token_hash = public.invitation_hash(p_token);
  -- An invalid token returns no row instead of raising, so the failed attempt stays counted
  -- by the rate limiter (an exception would roll the counter back).
  if not found or inv.accepted_at is not null or inv.revoked_at is not null or inv.expires_at <= now() then
    return;
  end if;
  return query select p.display_name from public.profiles p where p.id = inv.created_by;
end;
$$;

-- Atomically links the caller to the inviter's space. Single use, expiring, never overfills a space.
-- Returns the space id, or NULL for any invalid/used/expired/revoked token (never raises for those,
-- so failed guesses are still counted by the rate limiter).
create function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  inv public.couple_invitations;
  mine uuid;
  target_status text;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  perform public.consume_rate_limit('join_attempt', 10, interval '10 minutes');

  select * into inv from public.couple_invitations
    where token_hash = public.invitation_hash(p_token) for update;
  if not found or inv.accepted_at is not null or inv.revoked_at is not null or inv.expires_at <= now() then
    return null;
  end if;
  if inv.created_by = uid then raise exception 'own_invitation'; end if;

  select status into target_status from public.couple_spaces where id = inv.couple_space_id for update;
  if target_status is distinct from 'waiting'
     or (select count(*) from public.couple_members where couple_space_id = inv.couple_space_id) <> 1 then
    return null;
  end if;

  select couple_space_id into mine from public.couple_members where user_id = uid;
  if mine is not null then
    -- Only an empty, never-used solo space may be discarded to accept an invitation.
    if mine = inv.couple_space_id
       or (select count(*) from public.couple_members where couple_space_id = mine) > 1
       or exists (select 1 from public.messages where couple_space_id = mine)
       or (select status from public.couple_spaces where id = mine) <> 'waiting' then
      raise exception 'already_in_space';
    end if;
    delete from public.couple_spaces where id = mine;
  end if;

  insert into public.couple_members (couple_space_id, user_id) values (inv.couple_space_id, uid);
  update public.couple_spaces set status = 'active' where id = inv.couple_space_id;
  update public.couple_invitations set accepted_at = now(), accepted_by = uid where id = inv.id;
  return inv.couple_space_id;
end;
$$;

-- Explicit, safe exit. See handle_member_removed for what happens to the space.
create function public.leave_space() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  delete from public.couple_members where user_id = (select auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------

-- Sender and recipient are derived on the server: the client only supplies content, type and an idempotency key.
-- Returns { message: <row>, is_new: boolean }.
create function public.send_message(p_content text, p_type text, p_client_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  sp uuid;
  sp_status text;
  rcpt uuid;
  clean text := btrim(coalesce(p_content, ''));
  max_len integer;
  existing public.messages;
  created public.messages;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_client_id is null then raise exception 'invalid_content'; end if;

  max_len := case p_type
    when 'little_note' then 280
    when 'heart_message' then 500
    when 'secret_message' then 1500
    when 'hug_in_words' then 1000
    when 'love_letter' then 3000
    else null end;
  if max_len is null then raise exception 'invalid_message_type'; end if;
  if char_length(clean) = 0 or char_length(clean) > max_len then raise exception 'invalid_content'; end if;

  sp := public.my_space_id();
  select status into sp_status from public.couple_spaces where id = sp;
  if sp is null or sp_status <> 'active' then raise exception 'no_active_space'; end if;
  rcpt := public.partner_of(sp);
  if rcpt is null then raise exception 'no_active_space'; end if;

  select * into existing from public.messages where sender_id = uid and client_id = p_client_id;
  if found then
    return jsonb_build_object('message', to_jsonb(existing), 'is_new', false);
  end if;

  perform public.consume_rate_limit('message', 30, interval '10 minutes');

  begin
    insert into public.messages (couple_space_id, sender_id, recipient_id, content, message_type, client_id)
    values (sp, uid, rcpt, clean, p_type, p_client_id)
    returning * into created;
  exception when unique_violation then
    select * into existing from public.messages where sender_id = uid and client_id = p_client_id;
    return jsonb_build_object('message', to_jsonb(existing), 'is_new', false);
  end;
  return jsonb_build_object('message', to_jsonb(created), 'is_new', true);
end;
$$;

-- Only the recipient can mark a message as read; sending a notification never does.
create function public.mark_message_read(p_id uuid) returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  stamp timestamptz;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  update public.messages set read_at = coalesce(read_at, now())
    where id = p_id and recipient_id = (select auth.uid())
    returning read_at into stamp;
  if not found then raise exception 'not_found'; end if;
  return stamp;
end;
$$;

create function public.react_to_message(p_id uuid, p_reaction text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  if p_reaction is not null and p_reaction not in ('love', 'smile', 'miss', 'thanks', 'hug') then
    raise exception 'invalid_reaction';
  end if;
  update public.messages
    set reaction = p_reaction, reacted_at = case when p_reaction is null then null else now() end
    where id = p_id and recipient_id = (select auth.uid()) and read_at is not null;
  if not found then raise exception 'not_found'; end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Push subscriptions
-- ---------------------------------------------------------------------------

-- An endpoint belongs to the last user who registered it (shared device after login switch).
create function public.register_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  perform public.consume_rate_limit('push_register', 30, interval '1 hour');
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, updated_at = now(), failure_count = 0;
end;
$$;

create function public.remove_push_subscription(p_endpoint text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = (select auth.uid());
end;
$$;

-- Throttle for the "send me a test notification" button (3 per 10 minutes).
create function public.consume_test_push_limit() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.consume_rate_limit('push_test', 3, interval '10 minutes');
end;
$$;

-- ---------------------------------------------------------------------------
-- Execute grants: only the functions clients may call.
-- ---------------------------------------------------------------------------

do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as sig from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn.sig);
  end loop;
end $$;

grant execute on function
  public.my_space_id(),
  public.create_invitation(),
  public.get_open_invitation(),
  public.revoke_invitations(),
  public.peek_invitation(text),
  public.accept_invitation(text),
  public.leave_space(),
  public.send_message(text, text, uuid),
  public.mark_message_read(uuid),
  public.react_to_message(uuid, text),
  public.register_push_subscription(text, text, text, text),
  public.remove_push_subscription(text),
  public.consume_test_push_limit()
to authenticated;
