-- Private media storage (photos, voice notes, drawings) and photo albums.
--
-- Every file lives under  <couple_space_id>/<kind>/<uuid>.<ext>  in the private "couple-media" bucket,
-- and storage policies only let the two members of that space touch that folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('couple-media', 'couple-media', false, 6291456,
        array['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/x-m4a'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "couple media: members read" on storage.objects for select to authenticated
  using (bucket_id = 'couple-media' and (storage.foldername(name))[1] = (select public.my_space_id())::text);

create policy "couple media: members upload to their folder" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'couple-media'
    and (storage.foldername(name))[1] = (select public.my_space_id())::text
    and (select status from public.couple_spaces where id = (select public.my_space_id())) = 'active'
  );

-- You can only delete files you uploaded yourself.
create policy "couple media: uploader deletes" on storage.objects for delete to authenticated
  using (
    bucket_id = 'couple-media'
    and (storage.foldername(name))[1] = (select public.my_space_id())::text
    and owner_id = (select auth.uid())::text
  );

-- Albums ----------------------------------------------------------------------------------------
create table public.albums (
  id              uuid primary key default gen_random_uuid(),
  couple_space_id uuid not null references public.couple_spaces (id) on delete cascade,
  title           text not null check (char_length(btrim(title)) between 1 and 80),
  created_by      uuid not null references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now()
);
create index albums_space_idx on public.albums (couple_space_id, created_at desc);
create trigger albums_owner before insert on public.albums for each row execute function public.set_shared_row_owner();

create table public.photos (
  id              uuid primary key default gen_random_uuid(),
  album_id        uuid not null references public.albums (id) on delete cascade,
  couple_space_id uuid not null references public.couple_spaces (id) on delete cascade,
  storage_path    text not null,
  caption         text check (caption is null or char_length(caption) <= 200),
  taken_on        date check (taken_on is null or taken_on between date '1950-01-01' and date '2100-12-31'),
  created_by      uuid not null references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (storage_path),
  check (storage_path ~ ('^' || couple_space_id::text || '/photos/[0-9a-f-]{36}\.(jpg|png|webp)$'))
);
create index photos_album_idx on public.photos (album_id, created_at desc);
create trigger photos_owner before insert on public.photos for each row execute function public.set_shared_row_owner();

-- A photo row must point to a real uploaded file, and to an album of the same couple.
create function public.verify_photo() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.albums where id = new.album_id and couple_space_id = new.couple_space_id) then
    raise exception 'invalid_album';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'couple-media' and name = new.storage_path) then
    raise exception 'invalid_file';
  end if;
  return new;
end;
$$;
-- Runs after set_shared_row_owner (triggers fire alphabetically): "photos_owner" < "photos_verify".
create trigger photos_verify before insert on public.photos for each row execute function public.verify_photo();

alter table public.albums enable row level security;
alter table public.photos enable row level security;

create policy albums_select on public.albums for select to authenticated using (couple_space_id = (select public.my_space_id()));
create policy albums_insert on public.albums for insert to authenticated
  with check (couple_space_id = (select public.my_space_id()) and created_by = (select auth.uid()));
create policy albums_update on public.albums for update to authenticated
  using (couple_space_id = (select public.my_space_id())) with check (couple_space_id = (select public.my_space_id()));
create policy albums_delete on public.albums for delete to authenticated
  using (couple_space_id = (select public.my_space_id()) and created_by = (select auth.uid()));

create policy photos_select on public.photos for select to authenticated using (couple_space_id = (select public.my_space_id()));
create policy photos_insert on public.photos for insert to authenticated
  with check (couple_space_id = (select public.my_space_id()) and created_by = (select auth.uid()));
create policy photos_update on public.photos for update to authenticated
  using (couple_space_id = (select public.my_space_id())) with check (couple_space_id = (select public.my_space_id()));
create policy photos_delete on public.photos for delete to authenticated
  using (couple_space_id = (select public.my_space_id()) and created_by = (select auth.uid()));

grant select, delete on public.albums, public.photos to authenticated;
grant insert (title) on public.albums to authenticated;
grant update (title) on public.albums to authenticated;
grant insert (album_id, storage_path, caption, taken_on) on public.photos to authenticated;
grant update (caption, taken_on) on public.photos to authenticated;
