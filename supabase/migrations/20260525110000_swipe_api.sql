-- ─────────────────────────────────────────────────────────────
-- matchfoundr · Issue #13 — Swipe-API: Mutual Match Trigger
-- Automatische Erkennung wenn beide Seiten liken
-- ─────────────────────────────────────────────────────────────

-- Trigger: Nach Swipe-Insert prüfen ob Gegenseite auch geliked hat
create or replace function public.handle_swipe_mutual_match()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  reverse_swipe public.swipes%rowtype;
  existing_match public.mutual_matches%rowtype;
  new_conv_id uuid;
begin
  -- Nur bei 'like' prüfen
  if new.direction != 'like' then
    return new;
  end if;

  -- Gucken ob der Target auch den Swiper geliked hat
  select * into reverse_swipe
  from public.swipes
  where swiper_id = new.target_id
    and target_id = new.swiper_id
    and direction = 'like'
  limit 1;

  if not found then
    return new;  -- Noch kein Mutual Match
  end if;

  -- Prüfen ob Match schon existiert
  select * into existing_match
  from public.mutual_matches
  where (user_a = new.swiper_id and user_b = new.target_id)
     or (user_a = new.target_id and user_b = new.swiper_id)
  limit 1;

  if found then
    return new;  -- Bereits ein Match
  end if;

  -- Conversation erstellen
  insert into public.conversations (user_a, user_b, is_active)
  values (
    least(new.swiper_id, new.target_id),
    greatest(new.swiper_id, new.target_id),
    true
  )
  returning id into new_conv_id;

  -- Mutual Match anlegen
  insert into public.mutual_matches (
    user_a,
    user_b,
    status,
    conversation_id
  ) values (
    least(new.swiper_id, new.target_id),
    greatest(new.swiper_id, new.target_id),
    'new',
    new_conv_id
  );

  return new;
end $$;

-- Trigger nur anlegen wenn nicht existiert
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_swipes_mutual_match'
  ) then
    create trigger trg_swipes_mutual_match
      after insert on public.swipes
      for each row execute function public.handle_swipe_mutual_match();
  end if;
end $$;

-- Index für schnelle Reverse-Swipe Suche
create index if not exists idx_swipes_reverse
  on public.swipes(target_id, direction, swiper_id);

-- Funktion: Swipe durchführen (idempotent)
create or replace function public.perform_swipe(
  p_swiper_id uuid,
  p_target_id uuid,
  p_direction public.swipe_direction
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  result jsonb;
  is_mutual boolean := false;
begin
  -- Idempotenter Upsert
  insert into public.swipes (swiper_id, target_id, direction)
  values (p_swiper_id, p_target_id, p_direction)
  on conflict (swiper_id, target_id) do update set
    direction = excluded.direction,
    created_at = now();

  -- Bei Like: Prüfen ob Mutual Match entstanden
  if p_direction = 'like' then
    select exists(
      select 1 from public.swipes
      where swiper_id = p_target_id and target_id = p_swiper_id and direction = 'like'
    ) into is_mutual;
  end if;

  return jsonb_build_object(
    'success', true,
    'mutual_match', is_mutual,
    'direction', p_direction
  );
end $$;
