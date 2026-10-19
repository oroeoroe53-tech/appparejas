-- Plans & anniversaries, "our story" timeline, and the daily question.

-- Shared rows: the server decides the space and the author, never the client. -----------
create function public.set_shared_row_owner() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  n bigint;
begin
  new.couple_space_id := public.my_space_id();
  new.created_by := (select auth.uid());
  if new.couple_space_id is null or new.created_by is null
     or (select status from public.couple_spaces where id = new.couple_space_id) <> 'active' then
    raise exception 'no_active_space';
  end if;
  perform public.consume_rate_limit('shared_write', 120, interval '1 hour');
  execute format('select count(*) from %I.%I where couple_space_id = $1', tg_table_schema, tg_table_name)
    into n using new.couple_space_id;
  if n >= 500 then raise exception 'limit_reached'; end if;
  return new;
end;
$$;

-- 1) Plans, anniversaries, birthdays -------------------------------------------------------
create table public.couple_events (
  id              uuid primary key default gen_random_uuid(),
  couple_space_id uuid not null references public.couple_spaces (id) on delete cascade,
  title           text not null check (char_length(btrim(title)) between 1 and 80),
  note            text check (note is null or char_length(note) <= 300),
  event_date      date not null check (event_date between date '1950-01-01' and date '2100-12-31'),
  repeat_yearly   boolean not null default false,
  kind            text not null default 'plan' check (kind in ('anniversary', 'plan', 'birthday')),
  created_by      uuid not null references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now()
);
create index couple_events_space_date_idx on public.couple_events (couple_space_id, event_date);
create trigger couple_events_owner before insert on public.couple_events for each row execute function public.set_shared_row_owner();

-- 2) Our story: moments worth remembering ----------------------------------------------------
create table public.timeline_entries (
  id              uuid primary key default gen_random_uuid(),
  couple_space_id uuid not null references public.couple_spaces (id) on delete cascade,
  title           text not null check (char_length(btrim(title)) between 1 and 100),
  note            text check (note is null or char_length(note) <= 1000),
  happened_on     date not null check (happened_on between date '1950-01-01' and date '2100-12-31'),
  photo_path      text,
  created_by      uuid not null references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  check (photo_path is null or photo_path ~ ('^' || couple_space_id::text || '/story/[0-9a-f-]{36}\.(jpg|png|webp)$'))
);
create index timeline_space_date_idx on public.timeline_entries (couple_space_id, happened_on desc);
create trigger timeline_owner before insert on public.timeline_entries for each row execute function public.set_shared_row_owner();

-- RLS for both: members read; either can edit; only the author deletes.
alter table public.couple_events enable row level security;
alter table public.timeline_entries enable row level security;

create policy events_select on public.couple_events for select to authenticated using (couple_space_id = (select public.my_space_id()));
create policy events_insert on public.couple_events for insert to authenticated
  with check (couple_space_id = (select public.my_space_id()) and created_by = (select auth.uid()));
create policy events_update on public.couple_events for update to authenticated
  using (couple_space_id = (select public.my_space_id())) with check (couple_space_id = (select public.my_space_id()));
create policy events_delete on public.couple_events for delete to authenticated
  using (couple_space_id = (select public.my_space_id()) and created_by = (select auth.uid()));

create policy timeline_select on public.timeline_entries for select to authenticated using (couple_space_id = (select public.my_space_id()));
create policy timeline_insert on public.timeline_entries for insert to authenticated
  with check (couple_space_id = (select public.my_space_id()) and created_by = (select auth.uid()));
create policy timeline_update on public.timeline_entries for update to authenticated
  using (couple_space_id = (select public.my_space_id())) with check (couple_space_id = (select public.my_space_id()));
create policy timeline_delete on public.timeline_entries for delete to authenticated
  using (couple_space_id = (select public.my_space_id()) and created_by = (select auth.uid()));

grant select, delete on public.couple_events, public.timeline_entries to authenticated;
grant insert (title, note, event_date, repeat_yearly, kind) on public.couple_events to authenticated;
grant update (title, note, event_date, repeat_yearly, kind) on public.couple_events to authenticated;
grant insert (title, note, happened_on, photo_path) on public.timeline_entries to authenticated;
grant update (title, note, happened_on, photo_path) on public.timeline_entries to authenticated;

-- 3) Daily question -----------------------------------------------------------------------------
create table public.question_answers (
  couple_space_id uuid not null references public.couple_spaces (id) on delete cascade,
  day             date not null,
  user_id         uuid not null references auth.users (id) on delete cascade,
  answer          text not null check (char_length(btrim(answer)) between 1 and 500),
  created_at      timestamptz not null default now(),
  primary key (couple_space_id, day, user_id)
);
alter table public.question_answers enable row level security;

create function public.i_answered(p_space uuid, p_day date) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.question_answers where couple_space_id = p_space and day = p_day and user_id = (select auth.uid())) $$;

-- You always see your own answers; your partner's only once you have answered the same question.
create policy answers_select on public.question_answers for select to authenticated
  using (
    user_id = (select auth.uid())
    or (couple_space_id = (select public.my_space_id()) and (select public.i_answered(couple_space_id, day)))
  );
grant select on public.question_answers to authenticated;

create function public.answer_question(p_answer text) returns date
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  sp uuid := public.my_space_id();
  today date := (now() at time zone 'utc')::date;
  clean text := btrim(coalesce(p_answer, ''));
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if sp is null or (select status from public.couple_spaces where id = sp) <> 'active' then raise exception 'no_active_space'; end if;
  if char_length(clean) = 0 or char_length(clean) > 500 then raise exception 'invalid_content'; end if;
  perform public.consume_rate_limit('answer', 30, interval '1 hour');
  begin
    insert into public.question_answers (couple_space_id, day, user_id, answer) values (sp, today, uid, clean);
  exception when unique_violation then
    raise exception 'already_answered';
  end;
  return today;
end;
$$;

-- Lets the app say "Ben already answered, your turn" without revealing the answer.
create function public.partner_has_answered(p_day date) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.question_answers
    where couple_space_id = (select public.my_space_id()) and day = p_day and user_id <> (select auth.uid()))
$$;

revoke all on function public.answer_question(text), public.partner_has_answered(date), public.i_answered(uuid, date) from public, anon, authenticated;
grant execute on function public.answer_question(text), public.partner_has_answered(date) to authenticated;
-- i_answered is evaluated inside the RLS policy, which runs as the calling role.
grant execute on function public.i_answered(uuid, date) to authenticated;
