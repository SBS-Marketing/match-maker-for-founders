-- ═══════════════════════════════════════════════════════════════════════════
-- Issue #30: Waitlist-Tabelle + Resend.io Email-Bestätigung
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Waitlist-Table ──────────────────────────────────────────────────────
create table if not exists public.waitlist (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text,
  status        text not null default 'pending'
                check (status in ('pending', 'email_sent', 'confirmed', 'invited', 'declined')),
  token         text unique default encode(gen_random_bytes(24), 'hex'),
  resend_id     text,           -- Resend.io message ID für Tracking
  confirmed_at  timestamptz,
  invited_at    timestamptz,
  metadata      jsonb default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexe
create index if not exists idx_waitlist_status on public.waitlist(status);
create index if not exists idx_waitlist_token  on public.waitlist(token);

-- RLS aktivieren
alter table public.waitlist enable row level security;

-- Policy: Jeder kann sich eintragen (Insert)
drop policy if exists "Allow public insert to waitlist" on public.waitlist;
create policy "Allow public insert to waitlist"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);

-- Policy: Nur Admins können alles sehen
-- (admin-Check über bestehende has_role-Funktion)
drop policy if exists "Allow admin full access on waitlist" on public.waitlist;
create policy "Allow admin full access on waitlist"
  on public.waitlist
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ── 2. Updated-At Trigger ──────────────────────────────────────────────────
create or replace function public.handle_waitlist_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_waitlist_updated_at'
  ) then
    create trigger trg_waitlist_updated_at
      before update on public.waitlist
      for each row execute function public.handle_waitlist_updated_at();
  end if;
end $$;

-- ── 3. RPC: Waitlist-Eintrag + Bestätigungsmail auslösen ───────────────────
-- Wird von einer Edge Function (Resend.io) oder direkt vom Client aufgerufen

create or replace function public.join_waitlist(
  p_email text,
  p_name  text default null,
  p_metadata jsonb default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.waitlist (email, name, metadata)
  values (lower(trim(p_email)), p_name, p_metadata)
  on conflict (email) do update
    set name = coalesce(excluded.name, public.waitlist.name),
        metadata = public.waitlist.metadata || excluded.metadata,
        updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

-- ── 4. RPC: Bestätigung via Token ───────────────────────────────────────────
create or replace function public.confirm_waitlist_entry(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.waitlist
  set status = 'confirmed',
      confirmed_at = now(),
      updated_at = now()
  where token = p_token
    and status in ('pending', 'email_sent')
    and confirmed_at is null;

  return found;
end;
$$;

-- ── 5. RPC: Admin-Statistik ────────────────────────────────────────────────
create or replace function public.waitlist_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Admin role required' using errcode = '42501';
  end if;

  return (
    select jsonb_build_object(
      'total', count(*),
      'pending', count(*) filter (where status = 'pending'),
      'email_sent', count(*) filter (where status = 'email_sent'),
      'confirmed', count(*) filter (where status = 'confirmed'),
      'invited', count(*) filter (where status = 'invited'),
      'conversion_rate',
        case when count(*) > 0
          then round(count(*) filter (where status = 'confirmed')::numeric / count(*)::numeric * 100, 1)
          else 0
        end
    )
    from public.waitlist
  );
end;
$$;

-- ── 6. Enum: waitlist_status (für saubere Typisierung) ─────────────────────
-- Hinweis: Check-Constraint statt Enum für leichte Erweiterbarkeit

revoke all on function public.waitlist_stats() from public, anon, authenticated;
grant execute on function public.waitlist_stats() to authenticated, service_role;
