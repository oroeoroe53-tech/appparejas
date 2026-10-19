-- Characters (each person designs the OTHER), daily mood, and "together since".

-- 1) Together since ---------------------------------------------------------------
alter table public.couple_spaces
  add column together_since date check (together_since is null or together_since >= date '1950-01-01');

create function public.set_together_since(p_date date) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  sp uuid := public.my_space_id();
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  if sp is null then raise exception 'no_active_space'; end if;
  if p_date is not null and (p_date < date '1950-01-01' or p_date > (now() at time zone 'utc')::date + 1) then
    raise exception 'invalid_date';
  end if;
  update public.couple_spaces set together_since = p_date where id = sp;
end;
$$;

-- 2) Characters ---------------------------------------------------------------------
-- One row per designer: the portrait they made of their partner. Both people can read both rows.
create table public.characters (
  couple_space_id uuid not null references public.couple_spaces (id) on delete cascade,
  designer_id     uuid not null references auth.users (id) on delete cascade,
  config          jsonb not null,
  updated_at      timestamptz not null default now(),
  primary key (couple_space_id, designer_id)
);
alter table public.characters enable row level security;
create policy characters_select on public.characters for select to authenticated
  using (couple_space_id = (select public.my_space_id()));
grant select on public.characters to authenticated;

create function public.save_character(p_config jsonb) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  sp uuid := public.my_space_id();
  allowed text[] := array['head','hair','hairColor','skinColor','eyes','eyebrows','nose','mouth','glasses','beard',
                          'earrings','freckles','hairAccessories','backgroundColor','eyesColor','eyebrowsColor',
                          'glassesColor','mouthColor'];
  k text;
  v jsonb;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  if sp is null or (select status from public.couple_spaces where id = sp) <> 'active' then raise exception 'no_active_space'; end if;
  if p_config is null or jsonb_typeof(p_config) <> 'object' or octet_length(p_config::text) > 1200 then
    raise exception 'invalid_character';
  end if;
  for k, v in select * from jsonb_each(p_config) loop
    if not (k = any (allowed)) or jsonb_typeof(v) <> 'string' or (v #>> '{}') !~ '^[A-Za-z0-9]{1,16}$' then
      raise exception 'invalid_character';
    end if;
  end loop;
  perform public.consume_rate_limit('character', 60, interval '1 hour');
  insert into public.characters (couple_space_id, designer_id, config)
  values (sp, (select auth.uid()), p_config)
  on conflict (couple_space_id, designer_id) do update set config = excluded.config, updated_at = now();
end;
$$;

-- 3) Mood: the latest mood of each person ---------------------------------------------
create table public.moods (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  couple_space_id uuid not null references public.couple_spaces (id) on delete cascade,
  mood            text not null check (mood in ('happy', 'loved', 'calm', 'excited', 'tired', 'sad', 'stressed')),
  note            text check (note is null or char_length(note) <= 100),
  updated_at      timestamptz not null default now()
);
create index moods_space_idx on public.moods (couple_space_id);
alter table public.moods enable row level security;
create policy moods_select on public.moods for select to authenticated
  using (couple_space_id = (select public.my_space_id()));
grant select on public.moods to authenticated;

-- p_mood null clears it.
create function public.set_mood(p_mood text, p_note text default null) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  sp uuid := public.my_space_id();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if sp is null then raise exception 'no_active_space'; end if;
  if p_mood is null then
    delete from public.moods where user_id = uid;
    return;
  end if;
  perform public.consume_rate_limit('mood', 40, interval '1 hour');
  insert into public.moods (user_id, couple_space_id, mood, note)
  values (uid, sp, p_mood, nullif(left(btrim(coalesce(p_note, '')), 100), ''))
  on conflict (user_id) do update
    set couple_space_id = excluded.couple_space_id, mood = excluded.mood, note = excluded.note, updated_at = now();
exception when check_violation then
  raise exception 'invalid_mood';
end;
$$;

-- 4) When someone leaves, their mood and the portraits they made leave with them -------
create or replace function public.handle_member_removed() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.moods where user_id = old.user_id;
  delete from public.characters where designer_id = old.user_id and couple_space_id = old.couple_space_id;
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

revoke all on function public.set_together_since(date), public.save_character(jsonb), public.set_mood(text, text) from public, anon, authenticated;
grant execute on function public.set_together_since(date), public.save_character(jsonb), public.set_mood(text, text) to authenticated;
