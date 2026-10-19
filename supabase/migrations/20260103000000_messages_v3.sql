-- Messages v3: quick messages, "thinking of you", voice notes, drawings, scheduled delivery (time capsule).
-- Also flips notification privacy to "show the message" by default, as the product intends.

-- 1) New message types ---------------------------------------------------------
alter table public.messages drop constraint messages_message_type_check;
alter table public.messages add constraint messages_message_type_check check (message_type in (
  'love_letter', 'little_note', 'heart_message', 'hug_in_words', 'secret_message', 'old_letter',
  'quick', 'thinking_of_you', 'voice_note', 'drawing'));

-- 2) Attachments (voice note / drawing live in the private storage bucket) and delivery time -
alter table public.messages
  add column attachment_path    text,
  add column attachment_seconds integer,
  add column deliver_at         timestamptz,
  -- the moment a message "arrives" for the recipient: used for ordering
  add column sort_at            timestamptz generated always as (coalesce(deliver_at, created_at)) stored;

alter table public.messages add constraint messages_attachment_check check (
  (message_type in ('voice_note', 'drawing')) = (attachment_path is not null)
  and (attachment_path is not null or attachment_seconds is null)
  and (attachment_path is null or (
        attachment_path ~ ('^' || couple_space_id::text || '/(voice|drawing)/[0-9a-f-]{36}\.(webm|m4a|mp4|ogg|png|jpg)$')
        and (message_type <> 'voice_note' or attachment_path like '%/voice/%')
        and (message_type <> 'drawing' or attachment_path like '%/drawing/%')
        and (attachment_seconds is null or attachment_seconds between 1 and 120)))
);
alter table public.messages add constraint messages_deliver_check check (deliver_at is null or deliver_at > created_at);
create index messages_space_sort_idx on public.messages (couple_space_id, sort_at desc);
create index messages_due_idx on public.messages (deliver_at) where deliver_at is not null and push_status = 'pending';

-- 3) Scheduled messages stay hidden from the recipient until they are due --------------
drop policy messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (
    couple_space_id = (select public.my_space_id())
    and (
      sender_id = (select auth.uid())
      or (recipient_id = (select auth.uid()) and (deliver_at is null or deliver_at <= now()))
    )
  );

create or replace function public.mark_message_read(p_id uuid) returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  stamp timestamptz;
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  update public.messages set read_at = coalesce(read_at, now())
    where id = p_id and recipient_id = (select auth.uid()) and (deliver_at is null or deliver_at <= now())
    returning read_at into stamp;
  if not found then raise exception 'not_found'; end if;
  return stamp;
end;
$$;

create or replace function public.react_to_message(p_id uuid, p_reaction text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated'; end if;
  if p_reaction is not null and p_reaction not in ('love', 'smile', 'miss', 'thanks', 'hug') then
    raise exception 'invalid_reaction';
  end if;
  update public.messages
    set reaction = p_reaction, reacted_at = case when p_reaction is null then null else now() end
    where id = p_id and recipient_id = (select auth.uid()) and read_at is not null
      and (deliver_at is null or deliver_at <= now());
  if not found then raise exception 'not_found'; end if;
end;
$$;

-- 4) Show the message in notifications by default ---------------------------------
alter table public.user_preferences alter column notification_preview_mode set default 'full';
update public.user_preferences set notification_preview_mode = 'full';

-- 5) send_message v3 -------------------------------------------------------------
drop function public.send_message(text, text, uuid, jsonb);

create function public.send_message(
  p_content text, p_type text, p_client_id uuid,
  p_song jsonb default null, p_attachment jsonb default null, p_deliver_at timestamptz default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  sp uuid;
  sp_status text;
  rcpt uuid;
  clean text := btrim(coalesce(p_content, ''));
  max_len integer;
  att_path text;
  att_secs integer;
  existing public.messages;
  created public.messages;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_client_id is null then raise exception 'invalid_content'; end if;

  max_len := case p_type
    when 'thinking_of_you' then 100
    when 'little_note' then 280
    when 'voice_note' then 300
    when 'drawing' then 300
    when 'quick' then 500
    when 'heart_message' then 500
    when 'hug_in_words' then 1000
    when 'secret_message' then 1500
    when 'love_letter' then 3000
    when 'old_letter' then 3000
    else null end;
  if max_len is null then raise exception 'invalid_message_type'; end if;
  if clean = '' and p_type = 'voice_note' then clean := 'Voice note'; end if;
  if clean = '' and p_type = 'drawing' then clean := 'Drawing'; end if;
  if char_length(clean) = 0 or char_length(clean) > max_len then raise exception 'invalid_content'; end if;
  if p_song is not null and jsonb_typeof(p_song) <> 'object' then raise exception 'invalid_song'; end if;
  if p_type in ('thinking_of_you', 'voice_note', 'drawing') and p_song is not null then raise exception 'invalid_song'; end if;

  sp := public.my_space_id();
  select status into sp_status from public.couple_spaces where id = sp;
  if sp is null or sp_status <> 'active' then raise exception 'no_active_space'; end if;
  rcpt := public.partner_of(sp);
  if rcpt is null then raise exception 'no_active_space'; end if;

  -- attachment: required for voice notes and drawings, forbidden otherwise
  if p_type in ('voice_note', 'drawing') then
    if p_attachment is null or jsonb_typeof(p_attachment) <> 'object' then raise exception 'invalid_attachment'; end if;
    att_path := p_attachment ->> 'path';
    begin
      att_secs := (p_attachment ->> 'seconds')::integer;
    exception when others then
      raise exception 'invalid_attachment';
    end;
    if att_path is null or position(sp::text || '/' in att_path) <> 1 then raise exception 'invalid_attachment'; end if;
    if not exists (select 1 from storage.objects where bucket_id = 'couple-media' and name = att_path) then
      raise exception 'invalid_attachment';
    end if;
  elsif p_attachment is not null then
    raise exception 'invalid_attachment';
  end if;

  if p_deliver_at is not null then
    if p_type = 'thinking_of_you' or p_deliver_at < now() + interval '1 minute' or p_deliver_at > now() + interval '5 years' then
      raise exception 'invalid_schedule';
    end if;
  end if;

  select * into existing from public.messages where sender_id = uid and client_id = p_client_id;
  if found then
    return jsonb_build_object('message', to_jsonb(existing), 'is_new', false);
  end if;

  perform public.consume_rate_limit('message', 30, interval '10 minutes');
  if p_type = 'thinking_of_you' then
    perform public.consume_rate_limit('ping', 10, interval '10 minutes');
  end if;

  begin
    insert into public.messages (
      couple_space_id, sender_id, recipient_id, content, message_type, client_id, deliver_at,
      attachment_path, attachment_seconds,
      song_track_id, song_title, song_artist, song_preview_url, song_artwork_url, song_start, song_duration
    ) values (
      sp, uid, rcpt, clean, p_type, p_client_id, p_deliver_at,
      att_path, att_secs,
      p_song ->> 'track_id', p_song ->> 'title', p_song ->> 'artist', p_song ->> 'preview_url', p_song ->> 'artwork_url',
      (p_song ->> 'start')::integer, (p_song ->> 'duration')::integer
    )
    returning * into created;
  exception
    when unique_violation then
      select * into existing from public.messages where sender_id = uid and client_id = p_client_id;
      return jsonb_build_object('message', to_jsonb(existing), 'is_new', false);
    when check_violation or invalid_text_representation or numeric_value_out_of_range then
      raise exception '%', case when p_song is not null then 'invalid_song' else 'invalid_attachment' end;
  end;
  return jsonb_build_object('message', to_jsonb(created), 'is_new', true);
end;
$$;

revoke all on function public.send_message(text, text, uuid, jsonb, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.send_message(text, text, uuid, jsonb, jsonb, timestamptz) to authenticated;
