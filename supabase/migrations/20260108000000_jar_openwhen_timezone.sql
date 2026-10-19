-- Reasons jar, "open when…" letters, and each person's time zone.

-- 1) Time zone ------------------------------------------------------------------------------
alter table public.profiles add column timezone text check (timezone is null or timezone ~ '^[A-Za-z0-9_+/-]{1,64}$');

create function public.set_my_timezone(p_tz text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  if p_tz is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_tz) then
    raise exception 'invalid_timezone';
  end if;
  update public.profiles set timezone = p_tz where id = (select auth.uid()) and timezone is distinct from p_tz;
end;
$$;

-- 2) Jar of reasons ----------------------------------------------------------------------------
create table public.reasons (
  id              uuid primary key default gen_random_uuid(),
  couple_space_id uuid not null references public.couple_spaces (id) on delete cascade,
  content         text not null check (char_length(btrim(content)) between 1 and 200),
  created_by      uuid not null references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now()
);
create index reasons_space_idx on public.reasons (couple_space_id, created_at desc);
create trigger reasons_owner before insert on public.reasons for each row execute function public.set_shared_row_owner();
alter table public.reasons enable row level security;
create policy reasons_select on public.reasons for select to authenticated using (couple_space_id = (select public.my_space_id()));
create policy reasons_insert on public.reasons for insert to authenticated
  with check (couple_space_id = (select public.my_space_id()) and created_by = (select auth.uid()));
create policy reasons_delete on public.reasons for delete to authenticated
  using (couple_space_id = (select public.my_space_id()) and created_by = (select auth.uid()));
grant select, delete on public.reasons to authenticated;
grant insert (content) on public.reasons to authenticated;

-- 3) "Open when…" letters ----------------------------------------------------------------------
-- The label and status are visible to both; the text stays locked for the recipient until they open it.
create table public.open_when_letters (
  id              uuid primary key default gen_random_uuid(),
  couple_space_id uuid not null references public.couple_spaces (id) on delete cascade,
  author_id       uuid not null references auth.users (id) on delete cascade,
  recipient_id    uuid not null references auth.users (id) on delete cascade,
  label           text not null check (char_length(btrim(label)) between 1 and 60),
  style           text not null default 'love_letter' check (style in ('love_letter', 'old_letter', 'little_note', 'heart_message', 'hug_in_words', 'secret_message')),
  created_at      timestamptz not null default now(),
  opened_at       timestamptz,
  check (author_id <> recipient_id)
);
create index open_when_space_idx on public.open_when_letters (couple_space_id, created_at desc);

create table public.open_when_bodies (
  letter_id uuid primary key references public.open_when_letters (id) on delete cascade,
  content   text not null check (char_length(btrim(content)) between 1 and 3000)
);

alter table public.open_when_letters enable row level security;
alter table public.open_when_bodies enable row level security;
create policy open_when_select on public.open_when_letters for select to authenticated
  using (couple_space_id = (select public.my_space_id()));
create policy open_when_body_select on public.open_when_bodies for select to authenticated
  using (exists (
    select 1 from public.open_when_letters l
    where l.id = letter_id
      and (l.author_id = (select auth.uid()) or (l.recipient_id = (select auth.uid()) and l.opened_at is not null))
  ));
grant select on public.open_when_letters, public.open_when_bodies to authenticated;

create function public.write_open_when(p_label text, p_content text, p_style text default 'love_letter') returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  sp uuid := public.my_space_id();
  rcpt uuid;
  new_id uuid;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if sp is null or (select status from public.couple_spaces where id = sp) <> 'active' then raise exception 'no_active_space'; end if;
  rcpt := public.partner_of(sp);
  if rcpt is null then raise exception 'no_active_space'; end if;
  if char_length(btrim(coalesce(p_label, ''))) not between 1 and 60
     or char_length(btrim(coalesce(p_content, ''))) not between 1 and 3000 then
    raise exception 'invalid_content';
  end if;
  if (select count(*) from public.open_when_letters where couple_space_id = sp) >= 100 then raise exception 'limit_reached'; end if;
  perform public.consume_rate_limit('open_when', 20, interval '1 hour');
  begin
    insert into public.open_when_letters (couple_space_id, author_id, recipient_id, label, style)
    values (sp, uid, rcpt, btrim(p_label), coalesce(p_style, 'love_letter'))
    returning id into new_id;
  exception when check_violation then
    raise exception 'invalid_content';
  end;
  insert into public.open_when_bodies (letter_id, content) values (new_id, btrim(p_content));
  return new_id;
end;
$$;

-- Only the recipient can open it, and opening is what unlocks the text for them.
create function public.open_open_when(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l public.open_when_letters;
  body text;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  update public.open_when_letters set opened_at = coalesce(opened_at, now())
    where id = p_id and recipient_id = (select auth.uid())
    returning * into l;
  if not found then raise exception 'not_found'; end if;
  select content into body from public.open_when_bodies where letter_id = l.id;
  return jsonb_build_object('id', l.id, 'label', l.label, 'style', l.style, 'author_id', l.author_id, 'opened_at', l.opened_at, 'content', body);
end;
$$;

-- The author can still take a letter back as long as it has not been opened.
create function public.delete_open_when(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  delete from public.open_when_letters where id = p_id and author_id = (select auth.uid()) and opened_at is null;
  if not found then raise exception 'not_found'; end if;
end;
$$;

revoke all on function public.set_my_timezone(text), public.write_open_when(text, text, text), public.open_open_when(uuid), public.delete_open_when(uuid) from public, anon, authenticated;
grant execute on function public.set_my_timezone(text), public.write_open_when(text, text, text), public.open_open_when(uuid), public.delete_open_when(uuid) to authenticated;
