-- Adds the "old_letter" message style and an optional song clip attachment.
--
-- A song clip is a 30-second preview from the Apple iTunes catalogue plus the part the sender picked.
-- The database only accepts Apple-hosted https URLs, so a message can never carry an arbitrary link.

-- 1) New message style --------------------------------------------------------
alter table public.messages drop constraint messages_message_type_check;
alter table public.messages add constraint messages_message_type_check
  check (message_type in ('love_letter', 'little_note', 'heart_message', 'hug_in_words', 'secret_message', 'old_letter'));

-- 2) Song attachment ----------------------------------------------------------
alter table public.messages
  add column song_track_id    text,
  add column song_title       text,
  add column song_artist      text,
  add column song_preview_url text,
  add column song_artwork_url text,
  add column song_start       integer,
  add column song_duration    integer;

alter table public.messages add constraint messages_song_check check (
  (song_track_id is null and song_title is null and song_artist is null and song_preview_url is null
     and song_artwork_url is null and song_start is null and song_duration is null)
  or (
    song_track_id ~ '^[0-9]{1,20}$'
    and char_length(btrim(song_title)) between 1 and 200
    and char_length(btrim(song_artist)) between 1 and 200
    and song_preview_url ~ '^https://([a-z0-9-]+\.)*(itunes\.apple\.com|mzstatic\.com)/[^\s]*$'
    and char_length(song_preview_url) <= 1000
    and (song_artwork_url is null
         or (song_artwork_url ~ '^https://([a-z0-9-]+\.)*mzstatic\.com/[^\s]*$' and char_length(song_artwork_url) <= 1000))
    and song_start between 0 and 29
    and song_duration between 3 and 30
    and song_start + song_duration <= 30
  )
);

-- 3) send_message now accepts an optional song ---------------------------------
drop function public.send_message(text, text, uuid);

create function public.send_message(p_content text, p_type text, p_client_id uuid, p_song jsonb default null) returns jsonb
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
    when 'old_letter' then 3000
    else null end;
  if max_len is null then raise exception 'invalid_message_type'; end if;
  if char_length(clean) = 0 or char_length(clean) > max_len then raise exception 'invalid_content'; end if;
  if p_song is not null and jsonb_typeof(p_song) <> 'object' then raise exception 'invalid_song'; end if;

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
    insert into public.messages (
      couple_space_id, sender_id, recipient_id, content, message_type, client_id,
      song_track_id, song_title, song_artist, song_preview_url, song_artwork_url, song_start, song_duration
    ) values (
      sp, uid, rcpt, clean, p_type, p_client_id,
      p_song ->> 'track_id', p_song ->> 'title', p_song ->> 'artist', p_song ->> 'preview_url', p_song ->> 'artwork_url',
      (p_song ->> 'start')::integer, (p_song ->> 'duration')::integer
    )
    returning * into created;
  exception
    when unique_violation then
      select * into existing from public.messages where sender_id = uid and client_id = p_client_id;
      return jsonb_build_object('message', to_jsonb(existing), 'is_new', false);
    when check_violation or invalid_text_representation or numeric_value_out_of_range then
      raise exception 'invalid_song';
  end;
  return jsonb_build_object('message', to_jsonb(created), 'is_new', true);
end;
$$;

-- 4) Throttle for song search (30 per 10 minutes) -------------------------------
create function public.consume_song_search_limit() returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.consume_rate_limit('song_search', 30, interval '10 minutes');
end;
$$;

revoke all on function public.send_message(text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.consume_song_search_limit() from public, anon, authenticated;
grant execute on function public.send_message(text, text, uuid, jsonb) to authenticated;
grant execute on function public.consume_song_search_limit() to authenticated;
