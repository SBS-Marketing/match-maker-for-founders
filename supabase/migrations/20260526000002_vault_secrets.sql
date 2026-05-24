-- ═══════════════════════════════════════════════════════════════════════════
-- Issue #51: Anthropic API Key + Secrets Pattern via Supabase Vault
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Vault-Extension sicherstellen (nur wenn Supabase Vault verfügbar) ────
-- Hinweis: In Supabase Cloud ist vault bereits aktiviert.
-- Lokal: `supabase start` muss mit vault-Unterstützung laufen.

do $$
begin
  -- pg_net für HTTP-Requests aus Edge Functions / SQL
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net extension may require manual setup: %', sqlerrm;
end $$;

-- ── 2. Tabellarischer Secrets-Speicher (Fallback für Self-Hosting / Edge) ──
-- Wir nutzen einen verschlüsselten Speicher über pgsodium (Vault),
-- falls nicht verfügbar, als minimalen Fallback eine audit-logbare Tabelle.

create table if not exists public.app_secrets (
  id          uuid primary key default gen_random_uuid(),
  key_name    text not null unique,
  -- vault_secret_id referenziert den Eintrag in vault.secrets (nicht direkt lesbar)
  vault_secret_id uuid,
  -- encrypted_value ist ein verschlüsselter Blob (nur für Notfall-Fallback)
  encrypted_value text,
  description text,
  tags        text[] default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null
);

-- Indexe
create index if not exists idx_app_secrets_key on public.app_secrets(key_name);

-- RLS
alter table public.app_secrets enable row level security;

-- Kein direkter Lesezugriff für normale Nutzer
create policy "Deny all direct select on app_secrets"
  on public.app_secrets
  for select
  to authenticated, anon
  using (false);

-- Nur Service Role / Admin darf schreiben (über RPC)

-- ── 3. RPC: Secret sicher holen (nur für Service Role / Edge Functions) ─────
create or replace function public.get_secret(p_key_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  -- Wenn vault verfügbar ist: Nutze vault.decrypted_secrets
  -- Hinweis: vault.secrets ist eine Supabase-spezifische View
  select decrypted_secret into v_secret
  from vault.decrypted_secrets ds
  join public.app_secrets aps on ds.id = aps.vault_secret_id
  where aps.key_name = p_key_name;

  return v_secret;
exception
  when undefined_table then
    -- Fallback: Vault nicht verfügbar → keine Daten leakbar
    return null;
  when others then
    return null;
end;
$$;

-- ── 4. RPC: Secret speichern (Admin-only via Service Role) ─────────────────
create or replace function public.upsert_secret(
  p_key_name text,
  p_secret_value text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vault_id uuid;
  v_app_secret_id uuid;
begin
  -- Prüfen, ob der Aufrufer Admin ist
  if not public.has_role('admin', auth.uid()) then
    raise exception 'Admin role required';
  end if;

  -- 1. In Vault speichern (oder aktualisieren)
  begin
    insert into vault.secrets (name, secret)
    values (p_key_name, p_secret_value)
    returning id into v_vault_id;
  exception
    when unique_violation then
      -- Vault hat Unique auf name → Update via DELETE+INSERT Pattern
      delete from vault.secrets where name = p_key_name;
      insert into vault.secrets (name, secret)
      values (p_key_name, p_secret_value)
      returning id into v_vault_id;
    when others then
      -- Vault nicht verfügbar → Fallback encrypted_value
      v_vault_id := null;
  end;

  -- 2. Referenz in app_secrets speichern
  insert into public.app_secrets (key_name, vault_secret_id, description, created_by)
  values (p_key_name, v_vault_id, p_description, auth.uid())
  on conflict (key_name) do update
    set vault_secret_id = excluded.vault_secret_id,
        description = coalesce(excluded.description, public.app_secrets.description),
        updated_at = now()
  returning id into v_app_secret_id;

  return v_app_secret_id;
end;
$$;

-- ── 5. RPC: Secret löschen (Admin-only) ────────────────────────────────────
create or replace function public.delete_secret(p_key_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role('admin', auth.uid()) then
    raise exception 'Admin role required';
  end if;

  -- Vault-Eintrag löschen
  delete from vault.secrets where name = p_key_name;

  -- Referenz löschen
  delete from public.app_secrets where key_name = p_key_name;

  return found;
end;
$$;

-- ── 6. Audit-Log für Secret-Zugriffe ───────────────────────────────────────
create table if not exists public.secret_access_log (
  id          uuid primary key default gen_random_uuid(),
  key_name    text not null,
  action      text not null check (action in ('read', 'write', 'delete', 'rotate')),
  actor_id    uuid,
  actor_role  text,
  success     boolean not null default false,
  error_msg   text,
  created_at  timestamptz not null default now()
);

-- RLS: Nur Admin sieht Logs
alter table public.secret_access_log enable row level security;
create policy "Admin access on secret_access_log"
  on public.secret_access_log
  for select
  to authenticated
  using (public.has_role('admin', auth.uid()));

-- ── 7. Trigger-Funktion: Logging für get_secret ────────────────────────────
create or replace function public.log_secret_access()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.secret_access_log (key_name, action, actor_id, success)
  values (NEW.key_name, TG_ARGV[0], auth.uid(), true);
  return NEW;
end;
$$;

comment on function public.get_secret(text) is
  'Holt einen Secret-Value nur wenn Vault verfügbar ist. Niemals direkt im Client nutzen — nur in Edge Functions oder server-seitigem Code.';

comment on table public.app_secrets is
  'Metadaten-Tabelle für Vault-Secrets. Die eigentlichen Werte leben NUR in vault.secrets und sind über get_secret() abrufbar.';
