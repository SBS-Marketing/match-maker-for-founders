-- ═══════════════════════════════════════════════════════════════════════════
-- matchfoundr · Cron für den täglichen E-Mail-Digest
-- Ruft die daily-digest Edge Function jeden Morgen via pg_net auf.
--
-- VORAUSSETZUNG (einmalig, mit Service Role im SQL-Editor / via RPC):
--   select public.upsert_secret('project_url', 'https://<ref>.supabase.co');
--   select public.upsert_secret('service_role_key', '<dein-service-role-key>');
-- Außerdem im Edge-Function-Secret: RESEND_API_KEY (+ optional RESEND_FROM_EMAIL, APP_URL).
--
-- Diese Migration ist idempotent und no-op, wenn pg_cron/Vault nicht verfügbar
-- sind (z.B. lokal). Dann den Block nach dem Secrets-Setup erneut ausführen.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_url text;
  v_key text;
begin
  create extension if not exists pg_cron;
  create extension if not exists pg_net;

  -- Bestehenden Job entfernen (idempotent).
  begin
    perform cron.unschedule('matchfoundr-daily-digest');
  exception when others then
    null;
  end;

  -- Secrets aus Vault holen (vom Admin via upsert_secret gesetzt).
  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key';
  exception when others then
    v_url := null;
    v_key := null;
  end;

  if v_url is null or v_key is null then
    raise notice 'daily-digest cron NICHT geplant: Vault-Secrets project_url/service_role_key fehlen. Secrets setzen und Migration erneut ausführen.';
    return;
  end if;

  perform cron.schedule(
    'matchfoundr-daily-digest',
    '0 7 * * *', -- täglich 07:00 UTC
    format(
      $job$
        select net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || %L
          ),
          body := '{}'::jsonb
        );
      $job$,
      rtrim(v_url, '/') || '/functions/v1/daily-digest',
      v_key
    )
  );
  raise notice 'daily-digest cron geplant: täglich 07:00 UTC.';
exception when others then
  raise notice 'daily-digest cron Setup übersprungen: %', sqlerrm;
end $$;
