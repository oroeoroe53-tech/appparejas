-- Dreams & bucket list, love coupons, and the shared playlist.

-- 1) Dreams -----------------------------------------------------------------------------------
create table public.dreams (
  id              uuid primary key default gen_random_uuid(),
  couple_space_id uuid not null references public.couple_spaces (id) on delete cascade,
  title           text not null check (char_length(btrim(title)) between 1 and 120),
  note            text check (note is null or char_length(note) <= 500),
  target_date     date check (target_date is null or target_date between date '1950-01-01' and date '2100-12-31'),
  done            boolean not null default false,
  done_at         timestamptz,
  created_by      uuid not null references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now()
);
create index dreams_space_idx on public.dreams (couple_space_id, done, created_at desc);
create trigger dreams_owner before insert on public.dreams for each row execute function public.set_shared_row_owner();

create function public.set_dream_done_at() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.done and not old.done then new.done_at := now();
  elsif not new.done then new.done_at := null;
  end if;
  return new;
end;
$$;
create trigger dreams_done_at before update on public.dreams for each row execute function public.set_dream_done_at();

alter table public.dreams enable row level security;
create policy dreams_select on public.dreams for select to authenticated using (couple_space_id = (select public.my_space_id()));
create policy dreams_insert on public.dreams for insert to authenticated
  with check (couple_space_id = (select public.my_space_id()) and created_by = (select auth.uid()));
create policy dreams_update on public.dreams for update to authenticated
  using (couple_space_id = (select public.my_space_id())) with check (couple_space_id = (select public.my_space_id()));
create policy dreams_delete on public.dreams for delete to authenticated
  using (couple_space_id = (select public.my_space_id()) and created_by = (select auth.uid()));
grant select, delete on public.dreams to authenticated;
grant insert (title, note, target_date) on public.dreams to authenticated;
grant update (title, note, target_date, done) on public.dreams to authenticated;

-- 2) Love coupons ---------------------------------------------------------------------------------
create table public.coupons (
  id              uuid primary key default gen_random_uuid(),
  couple_space_id uuid not null references public.couple_spaces (id) on delete cascade,
  giver_id        uuid not null references auth.users (id) on delete cascade,
  receiver_id     uuid not null references auth.users (id) on delete cascade,
  title           text not null check (char_length(btrim(title)) between 1 and 80),
  description     text check (description is null or char_length(description) <= 300),
  status          text not null default 'available' check (status in ('available', 'used')),
  created_at      timestamptz not null default now(),
  used_at         timestamptz,
  check (giver_id <> receiver_id)
);
create index coupons_space_idx on public.coupons (couple_space_id, created_at desc);
alter table public.coupons enable row level security;
create policy coupons_select on public.coupons for select to authenticated using (couple_space_id = (select public.my_space_id()));
grant select on public.coupons to authenticated;

create function public.give_coupon(p_title text, p_description text default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  sp uuid := public.my_space_id();
  rcpt uuid;
  row_ public.coupons;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if sp is null or (select status from public.couple_spaces where id = sp) <> 'active' then raise exception 'no_active_space'; end if;
  rcpt := public.partner_of(sp);
  if rcpt is null then raise exception 'no_active_space'; end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 80 then raise exception 'invalid_content'; end if;
  if (select count(*) from public.coupons where couple_space_id = sp) >= 500 then raise exception 'limit_reached'; end if;
  perform public.consume_rate_limit('coupon', 20, interval '1 hour');
  insert into public.coupons (couple_space_id, giver_id, receiver_id, title, description)
  values (sp, uid, rcpt, btrim(p_title), nullif(left(btrim(coalesce(p_description, '')), 300), ''))
  returning * into row_;
  return to_jsonb(row_);
end;
$$;

-- Only the person who RECEIVED a coupon can use it.
create function public.redeem_coupon(p_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  row_ public.coupons;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  update public.coupons set status = 'used', used_at = now()
    where id = p_id and receiver_id = (select auth.uid()) and status = 'available'
    returning * into row_;
  if not found then raise exception 'not_found'; end if;
  return to_jsonb(row_);
end;
$$;

-- The giver can take back a coupon that has not been used.
create function public.withdraw_coupon(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  delete from public.coupons where id = p_id and giver_id = (select auth.uid()) and status = 'available';
  if not found then raise exception 'not_found'; end if;
end;
$$;

-- 3) Shared playlist ----------------------------------------------------------------------------------
create table public.playlist_songs (
  id               uuid primary key default gen_random_uuid(),
  couple_space_id  uuid not null references public.couple_spaces (id) on delete cascade,
  added_by         uuid not null references auth.users (id) on delete cascade,
  song_track_id    text not null check (song_track_id ~ '^[0-9]{1,20}$'),
  song_title       text not null check (char_length(btrim(song_title)) between 1 and 200),
  song_artist      text not null check (char_length(btrim(song_artist)) between 1 and 200),
  song_preview_url text not null check (song_preview_url ~ '^https://([a-z0-9-]+\.)*(itunes\.apple\.com|mzstatic\.com)/[^\s]*$' and char_length(song_preview_url) <= 1000),
  song_artwork_url text check (song_artwork_url is null or (song_artwork_url ~ '^https://([a-z0-9-]+\.)*mzstatic\.com/[^\s]*$' and char_length(song_artwork_url) <= 1000)),
  note             text check (note is null or char_length(note) <= 140),
  created_at       timestamptz not null default now(),
  unique (couple_space_id, song_track_id)
);
alter table public.playlist_songs enable row level security;
create policy playlist_select on public.playlist_songs for select to authenticated using (couple_space_id = (select public.my_space_id()));
grant select on public.playlist_songs to authenticated;

create function public.add_playlist_song(p_song jsonb, p_note text default null) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  sp uuid := public.my_space_id();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if sp is null or (select status from public.couple_spaces where id = sp) <> 'active' then raise exception 'no_active_space'; end if;
  if p_song is null or jsonb_typeof(p_song) <> 'object' then raise exception 'invalid_song'; end if;
  if (select count(*) from public.playlist_songs where couple_space_id = sp) >= 300 then raise exception 'limit_reached'; end if;
  perform public.consume_rate_limit('playlist', 40, interval '1 hour');
  begin
    insert into public.playlist_songs (couple_space_id, added_by, song_track_id, song_title, song_artist, song_preview_url, song_artwork_url, note)
    values (sp, uid, p_song ->> 'track_id', p_song ->> 'title', p_song ->> 'artist', p_song ->> 'preview_url', p_song ->> 'artwork_url',
            nullif(left(btrim(coalesce(p_note, '')), 140), ''));
  exception
    when unique_violation then raise exception 'already_added';
    when check_violation or not_null_violation then raise exception 'invalid_song';
  end;
end;
$$;

create function public.remove_playlist_song(p_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  delete from public.playlist_songs where id = p_id and added_by = (select auth.uid());
  if not found then raise exception 'not_found'; end if;
end;
$$;

revoke all on function public.give_coupon(text, text), public.redeem_coupon(uuid), public.withdraw_coupon(uuid),
  public.add_playlist_song(jsonb, text), public.remove_playlist_song(uuid) from public, anon, authenticated;
grant execute on function public.give_coupon(text, text), public.redeem_coupon(uuid), public.withdraw_coupon(uuid),
  public.add_playlist_song(jsonb, text), public.remove_playlist_song(uuid) to authenticated;
