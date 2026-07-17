-- ═══════════════════════════════════════════════════════════════════════════
-- matchfoundr · Cron für den 8-Uhr-Morgenreport
-- Ruft die morning-report Edge Function werktäglich + Wochenende um
-- 06:00 UTC auf = 08:00 deutscher Sommerzeit (07:00 im Winter — pg_cron
-- kennt keine Zeitzonen; bei Winterzeit auf '0 7 * * *' umstellen).
--
-- VORAUSSETZUNG wie beim daily-digest (einmalig im SQL-Editor):
--   select public.upsert_secret('project_url', 'https://<ref>.supabase.co');
--   select public.upsert_secret('service_role_key', '<service-role-key>');
-- Migration ist idempotent und no-op ohne Vault-Secrets.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
declare
  v_url text;
  v_key text;
begin
  create extension if not exists pg_cron;
  create extension if not exists pg_net;

  begin
    perform cron.unschedule('matchfoundr-morning-report');
  exception when others then
    null;
  end;

  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'project_url';
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key';
  exception when others then
    v_url := null;
    v_key := null;
  end;

  if v_url is null or v_key is null then
    raise notice 'morning-report cron NICHT geplant: Vault-Secrets project_url/service_role_key fehlen. Secrets setzen und Migration erneut ausführen.';
    return;
  end if;

  perform cron.schedule(
    'matchfoundr-morning-report',
    '0 6 * * *',
    format(
      $job$ select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || %L),
        body := '{}'::jsonb
      ); $job$,
      v_url || '/functions/v1/morning-report',
      v_key
    )
  );

  raise notice 'morning-report cron geplant: täglich 06:00 UTC (08:00 Berlin im Sommer).';
end $$;
