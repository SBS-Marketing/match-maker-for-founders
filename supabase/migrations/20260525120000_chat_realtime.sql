-- ─────────────────────────────────────────────────────────────
-- matchfoundr · Issue #14 — Chat Realtime Trigger
-- Automatische Aktualisierung von unread counts und last_message
-- ─────────────────────────────────────────────────────────────

-- Trigger: Nach Message-Insert Conversation aktualisieren
create or replace function public.handle_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  conv record;
  other_user uuid;
begin
  -- Nur wenn conversation_id gesetzt
  if new.conversation_id is null then
    return new;
  end if;

  select * into conv from public.conversations where id = new.conversation_id;
  if not found then
    return new;
  end if;

  -- Bestimme den anderen User
  if new.sender_id = conv.user_a then
    other_user := conv.user_b;
  else
    other_user := conv.user_a;
  end if;

  -- Unread count erhöhen für den anderen
  if other_user = conv.user_a then
    update public.conversations
    set unread_count_a = unread_count_a + 1,
        last_message_at = new.created_at,
        last_message_preview = left(new.body, 100)
    where id = new.conversation_id;
  else
    update public.conversations
    set unread_count_b = unread_count_b + 1,
        last_message_at = new.created_at,
        last_message_preview = left(new.body, 100)
    where id = new.conversation_id;
  end if;

  return new;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_messages_insert'
  ) then
    create trigger trg_messages_insert
      after insert on public.messages
      for each row execute function public.handle_new_message();
  end if;
end $$;

-- Funktion: Unread counts zurücksetzen wenn User Conversation öffnet
create or replace function public.mark_conversation_read(p_conversation_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'Not allowed to mark another user conversation as read' using errcode = '42501';
  end if;

  update public.conversations
  set unread_count_a = case when user_a = p_user_id then 0 else unread_count_a end,
      unread_count_b = case when user_b = p_user_id then 0 else unread_count_b end
  where id = p_conversation_id
    and (user_a = p_user_id or user_b = p_user_id);
end $$;

-- Funktion: Nachricht senden (inkl. Validierung)
create or replace function public.send_message(
  p_conversation_id uuid,
  p_sender_id uuid,
  p_body text,
  p_reply_to_id uuid default null,
  p_attachments jsonb default '[]'
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_msg_id uuid;
  conv record;
begin
  if coalesce(auth.role(), '') <> 'service_role' and auth.uid() is distinct from p_sender_id then
    raise exception 'Not allowed to send as another user' using errcode = '42501';
  end if;

  -- Prüfen ob User Teil der Conversation ist
  select * into conv from public.conversations
  where id = p_conversation_id and (user_a = p_sender_id or user_b = p_sender_id);

  if not found then
    raise exception 'Nicht autorisiert oder Conversation nicht gefunden';
  end if;

  insert into public.messages (
    conversation_id, sender_id, body, reply_to_id, attachments, status, match_id
  ) values (
    p_conversation_id,
    p_sender_id,
    p_body,
    p_reply_to_id,
    p_attachments,
    'sent',
    conv.match_id
  )
  returning id into new_msg_id;

  return new_msg_id;
end $$;

revoke all on function public.mark_conversation_read(uuid, uuid) from public, anon;
revoke all on function public.send_message(uuid, uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.mark_conversation_read(uuid, uuid) to authenticated, service_role;
grant execute on function public.send_message(uuid, uuid, text, uuid, jsonb) to authenticated, service_role;
