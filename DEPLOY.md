# matchfoundr · Deploy-Runbook

Alles, was für einen Launch auf einer frischen Umgebung nötig ist.
Projekt-Ref (Supabase): `urjpyhyezrwhwgnkkxjv`

## 1. Frontend

```bash
npm install
npm run build        # Vite-Build (Cloudflare-Worker + Client)
```

Deploy-Ziele sind bereits konfiguriert:
- **Cloudflare**: `wrangler.jsonc` (`npx wrangler deploy`)
- **Netlify**: `netlify.toml`
- **GitHub Pages** (Marketing/`docs/`): wird über den `docs/`-Ordner ausgeliefert.

Env (Client): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (siehe `.env`).

## 2. Datenbank-Migrationen

```bash
supabase link --project-ref urjpyhyezrwhwgnkkxjv
supabase db push
```

Wichtige neue Migrationen:
- `20260529120000_notification_prefs.sql` — Opt-out-Tabelle für den E-Mail-Digest
- `20260529120100_daily_digest_cron.sql` — pg_cron-Job (no-op bis Vault-Secrets gesetzt sind, danach erneut ausführen)
- `20260715120000_admin_and_content.sql` — `ai_usage` (KI-Kosten-Log) + `guides` (Redaktion)
- `20260717090000_community_events_admin.sql` — Admin-Policies auf `community_events` + `community_event_registrations`
- `20260717120000_partner_offers_admin.sql` — Admins dürfen `partner_offers` verwalten
- `20260717130000_partner_offers_branding.sql` — Spalten `logo_url` + `banner_url`
- `20260717140000_partner_offers_catalog.sql` — 28 kuratierte Partner für alle 7 Entdecken-Kategorien inkl. gescrapter Logos/Banner
- `20260718090000_connected_accounts.sql` — Konten-Verknüpfung, Tokens, Morgenreports, WhatsApp-Inbox
- `20260718091000_morning_report_cron.sql` — 8-Uhr-Report-Cron (no-op bis Vault-Secrets gesetzt, siehe INTEGRATIONS.md)

## 3. Edge Functions

```bash
supabase functions deploy copilot        # Pflicht: schnellerer Chat-Pfad + strukturierte App-Aktionen
supabase functions deploy connect-google # Konten-Verknüpfung Gmail/Kalender (INTEGRATIONS.md)
supabase functions deploy morning-report # 8-Uhr-Report des Co-Piloten (INTEGRATIONS.md)
supabase functions deploy whatsapp-webhook
supabase functions deploy matching
supabase functions deploy swipe
supabase functions deploy resend-confirm
supabase functions deploy daily-digest
```

> Hinweis Co-Pilot V2: Der `chat`-Task nutzt jetzt Gesprächsverlauf, Seitenkontext
> (`extra.surface`), Client-Memory (`extra.memory`) und liefert `navigation` +
> `new_facts` zurück. Das Frontend funktioniert auch mit der alten Function
> (Felder fehlen dann einfach), aber erst nach dem Redeploy ist der Co-Pilot komplett.

### Function-Secrets (Dashboard → Edge Functions → Secrets)
| Secret | Genutzt von |
|---|---|
| `OPENROUTER_API_KEY` | copilot (Kimi + Sonnet via OpenRouter), morning-report |
| `BRAVE_SEARCH_API_KEY` | copilot Web-Recherche (Pflichten/Ansprechpartner-Quellen). Ohne Key nur schwacher DuckDuckGo-Fallback — Key ist kostenlos: https://brave.com/search/api/ |
| `RESEND_API_KEY` | resend-confirm, daily-digest |
| `RESEND_FROM_EMAIL` (optional) | resend-confirm, daily-digest |
| `APP_URL` (optional, Default matchfoundr.de) | resend-confirm, daily-digest |

## 4. Täglicher E-Mail-Digest aktivieren

Einmalig im SQL-Editor (Service Role):

```sql
select public.upsert_secret('project_url', 'https://urjpyhyezrwhwgnkkxjv.supabase.co');
select public.upsert_secret('service_role_key', '<SERVICE_ROLE_KEY>');
```

Danach die Cron-Migration erneut ausführen (Inhalt von
`supabase/migrations/20260529120100_daily_digest_cron.sql` im SQL-Editor) —
der Job `matchfoundr-daily-digest` läuft dann täglich 07:00 UTC.

Manueller Test:
```bash
curl -X POST "https://urjpyhyezrwhwgnkkxjv.supabase.co/functions/v1/daily-digest" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```
Antwort: `{ ok, sent, skipped, errors }`. Nutzer ohne offene Tasks/Deadlines werden übersprungen;
Opt-out über das Profil (Tabelle `notification_prefs`).

## 5. Admin-Bereich freischalten

Der Admin-Bereich liegt unter **`/admin`** (Insights · Events · Guides) und ist über
RLS abgesichert: nur Accounts mit der Rolle `admin` in `user_roles` sehen echte Daten.

Rolle vergeben (SQL-Editor, die User-ID steht unter Authentication → Users):

```sql
insert into public.user_roles (user_id, role)
values ('<USER_UUID>', 'admin')
on conflict do nothing;
```

Danach zeigt die Sidebar dem Account den Admin-Link. Ohne Login im Demo-Modus
zeigt `/admin` nur Beispieldaten (RLS blockt alles Echte).

- **Insights**: KI-Tokens + Kosten (aus `ai_usage`, sobald die Copilot-Function
  Usage-Logging schreibt), Plattform-Zahlen, Status der Datenquellen.
- **Events**: legt Einträge in `community_events` an (samt Banner-Upload in den
  `media`-Bucket) — dieselbe Tabelle liest die iOS-App im Community-Tab.
  Anmeldungen landen in `community_event_registrations`.
- **Guides**: redaktionelle Guides in der `guides`-Tabelle, veröffentlichte sind öffentlich lesbar.
- **Partner**: Katalog der Entdecken-Sektion (`partner_offers`) — anlegen, bearbeiten,
  Fit-Score, aktiv/inaktiv. Neu befüllen: Pipeline laufen lassen
  (`python3.11+ scrapers/partners_curated.py && scripts/normalize_partners.py &&
  scripts/build_partners_json.py && scripts/build_partner_offers_sql.py`), dann `db push`.

## 6. Typen nach Schema-Änderungen

```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

`types.ts` wurde manuell auf den Stand der Migrationen gebracht
(`profiles.venture_term/partner_term`, `notification_prefs`) — nach dem nächsten
`db push` einmal regenerieren, dann ist alles wieder aus einer Quelle.

## 7. Smoke-Test nach Deploy

1. `/` Landing lädt ohne App-Shell.
2. `/auth` → Konto anlegen / Google SSO → Redirect auf `/onboarding` bzw. `/heute`.
3. `/heute` zeigt Tageszusammenfassung (Co-Pilot-Quelle bei eingeloggtem Nutzer).
4. `/foerderung/exist-gruenderstipendium` → „Antrag ausfüllen" → Co-Pilot-Fill → PDF-Export.
5. `/firma` → Block per Drag&Drop verschieben → Vorschau → Link kopieren.
6. Mobile (375px): Bottom-Tabs + „Mehr Bereiche"-Menü funktionieren.
