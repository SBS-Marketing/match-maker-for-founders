# matchfoundr · Konten-Verknüpfung & Morgenreport

Wie Gmail, Google Kalender und WhatsApp angebunden werden — und wie der
8-Uhr-Report des Co-Piloten läuft.

## Wie es funktioniert

```
Profil → „Konten & Automationen“ → Verbinden
   │
   ▼
connect-google (Edge Function) ──→ Google OAuth ──→ Tokens in account_tokens
                                                    Status in connected_accounts
   │
   ▼  täglich 06:00 UTC (pg_cron)
morning-report (Edge Function)
   ├─ Gmail: wichtige Mails der letzten 24h
   ├─ KI (Kimi K3): Tagesablauf, Prioritäten, Antwort-Entwürfe, Termine
   ├─ Gmail: Entwürfe als ECHTE Drafts anlegen
   ├─ Google Kalender: erkannte Termine als Events anlegen
   └─ daily_reports → „Heute“-Seite (Web) zeigt den Report
```

Ohne Verknüpfungen entsteht der Report aus App-Daten (Deadlines, Events).
Tokens liegen in `account_tokens` — RLS ohne Policies, nur Edge Functions
(Service Role) kommen ran. Der Client sieht nur Status + E-Mail-Label.

## Setup 1: Google (Gmail + Kalender)

1. [Google Cloud Console](https://console.cloud.google.com/) → Projekt anlegen →
   **APIs & Services**: „Gmail API“ und „Google Calendar API“ aktivieren.
2. **OAuth consent screen**: External, Scopes `gmail.readonly`, `gmail.compose`,
   `calendar.events` hinzufügen, dich selbst als Testnutzer eintragen.
3. **Credentials → OAuth Client ID** (Web application) mit Redirect-URI:
   `https://urjpyhyezrwhwgnkkxjv.supabase.co/functions/v1/connect-google`
4. Secrets setzen (Dashboard → Edge Functions → Secrets):
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL` (z.B. `https://matchfoundr.de`)
5. Deployen: `supabase functions deploy connect-google morning-report`

Danach im Profil auf „Verbinden“ — Google-Login öffnet sich, zurück geht es
automatisch ins Profil.

## Setup 2: Morgenreport-Cron (8:00)

Voraussetzung wie beim Digest (einmalig, SQL-Editor):

```sql
select public.upsert_secret('project_url', 'https://urjpyhyezrwhwgnkkxjv.supabase.co');
select public.upsert_secret('service_role_key', '<SERVICE_ROLE_KEY>');
```

Dann Migration `20260718091000_morning_report_cron.sql` ausführen (läuft bei
`db push` mit; ohne Vault-Secrets ist sie no-op → nach Secret-Setup erneut im
SQL-Editor ausführen). Zeitplan: **06:00 UTC = 08:00 Berlin (Sommerzeit)** —
im Winter auf `0 7 * * *` umstellen.

Manueller Test (erstellt den heutigen Report für einen Nutzer):

```bash
curl -X POST "https://urjpyhyezrwhwgnkkxjv.supabase.co/functions/v1/morning-report" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "<USER_UUID>"}'
```

## Setup 3: WhatsApp über open-wa

[open-wa/wa-automate](https://github.com/open-wa/wa-automate-nodejs) ist ein
selbst gehostetes Gateway: es loggt sich per QR-Code in WhatsApp Web ein und
leitet eingehende Nachrichten als Webhook weiter. Kein Meta-Business-Account
nötig — dafür läuft es auf eigener Infrastruktur (Server, Raspberry, NAS).

1. Secret setzen: `WHATSAPP_WEBHOOK_SECRET` (frei wählbarer String).
2. Function deployen: `supabase functions deploy whatsapp-webhook`
3. Gateway starten (Node ≥18 auf deinem Server):

```bash
npx @open-wa/wa-automate \
  --ev "https://urjpyhyezrwhwgnkkxjv.supabase.co/functions/v1/whatsapp-webhook" \
  --ev-simple-mode \
  # QR-Code scannen — danach läuft die Session dauerhaft
```

   Alternativ per Docker: `docker run openwa/wa-automate --ev <webhook-url>`.
   Der Webhook erwartet `x-webhook-secret: <WHATSAPP_WEBHOOK_SECRET>` — bei
   open-wa über `--webhook-headers` bzw. einen kleinen Relay setzen.
4. In der App: Profil → WhatsApp → „Verbinden“ (Status „wartet auf Gateway“,
   nach der ersten empfangenen Nachricht auf `connected` setzen — SQL:
   `update connected_accounts set status='connected' where provider='whatsapp';`).

Eingehende Nachrichten landen in `whatsapp_messages` und fließen als Zähler
in den Morgenreport ein („3 neue WhatsApp-Nachrichten“).

## Was wo liegt

| Baustein | Datei |
|---|---|
| OAuth-Flow | `supabase/functions/connect-google/index.ts` |
| Morgenreport | `supabase/functions/morning-report/index.ts` |
| WhatsApp-Webhook | `supabase/functions/whatsapp-webhook/index.ts` |
| Tabellen | `supabase/migrations/20260718090000_connected_accounts.sql` |
| Cron | `supabase/migrations/20260718091000_morning_report_cron.sql` |
| Profil-UI | `src/components/ConnectedAccounts.tsx` |
| Report auf „Heute“ | `src/components/MorningReport.tsx` |
