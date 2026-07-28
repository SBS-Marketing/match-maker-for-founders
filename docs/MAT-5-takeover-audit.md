# MAT-5 Takeover Audit — Matchfoundr App und Website

Stand: 2026-07-28 00:45 CEST  
Issue: MAT-5 Audit existing Matchfoundr app and website

## Kurzfazit

Der vorhandene Code ist weit genug, um übernommen und fertiggestellt zu werden. Ein Rewrite ist nach dieser Prüfung nicht gerechtfertigt: Web baut erfolgreich, iOS hat eine klare native App-Struktur, Supabase-Migrationen und Edge Functions decken die zentralen Produktflüsse ab. Die größten Risiken liegen nicht in fehlender Grundarchitektur, sondern in Konfigurationsdrift, Umgebung/Deploy-Dokumentation, unvollständig verifizierter iOS-Buildbarkeit und externen Secrets/OAuth/Cron-Abhängigkeiten.

## Repo-Stand

- Arbeitsverzeichnis: `/Users/beavy/Desktop/Projekte/projekt/match-maker-for-founders`
- `git status --short`: untracked `.claude/settings.local.json`; nicht verändert.
- Lokaler `main` ist deutlich vor `origin/main`; `git log origin/main..HEAD` zeigt u. a. Co-Pilot-Rebuild, Realtime-Chat, Onboarding, Achievements und Web/iOS Today-Arbeiten. Der lokale Ordner ist daher die Quelle der Wahrheit.
- Paketmanager laut Repo-Wissen: Bun, `bun.lock` maßgeblich. In dieser Umgebung ist `bun` aber nicht in `PATH`.

## Setup- und Verifikationsversuche

| Zweck | Befehl | Ergebnis |
|---|---|---|
| Bun prüfen | `bun --version` | Fehlgeschlagen: `zsh:1: command not found: bun`. |
| Node prüfen | `node --version` | Erfolgreich: `v25.7.0`. |
| Xcode prüfen | `xcodebuild -version` | Erfolgreich: Xcode `26.6`, Build `17F113`. |
| Web-Build | `npm run build` | Erfolgreich. Vite/Nitro baut Client, SSR und Cloudflare-Modul. Warnungen: großer Client-Chunk (`index-NneuwXKS.js` ca. 759 kB gzip 221 kB), viele ignorierte `"use client"` directives, `Unknown input options: platform`, und Nitro meldet, dass Cloudflare `wrangler` `main` überschrieben wird. |
| Supabase CLI | `npx supabase --version` | Kein Terminalergebnis; unter eingeschränkter Netzwerk-/Package-Resolution nach ca. 60 s abgebrochen (`Ctrl-C`, Exit 130). |
| iOS-Build sandboxed | `xcodebuild -project ios/Matchfoundr.xcodeproj -scheme Matchfoundr -destination 'platform=iOS Simulator,id=7F2BCAA3-8AB3-4D64-9B50-B99B8B893C99' -derivedDataPath "$PAPERCLIP_RUN_SCRATCH_DIR/ios-derived-data" build` | Fehlgeschlagen vor Compilation: CoreSimulatorService nicht erreichbar und SPM kann GitHub nicht auflösen (`Could not resolve host: github.com`) für `supabase-swift`, `swift-clocks`, `swift-crypto`, `swift-http-types`, `swift-asn1`, `swift-concurrency-extras`, `xctest-dynamic-overlay`. |
| iOS-Build escalated | gleicher Befehl mit anderem `derivedDataPath` und eskalierten Rechten | Kein Terminalergebnis nach ca. 120 s; manuell abgebrochen (`Ctrl-C`, Exit 130). Keine Compile-Fehler beobachtet, aber iOS-Build ist nicht verifiziert. |
| Lint | `npm run lint` | Kein Terminalergebnis nach ca. 90 s; manuell abgebrochen (`Ctrl-C`, Exit 130`). Vermutlich scannt ESLint zu breit, u. a. Build-/Output-Verzeichnisse, muss separat eingegrenzt werden. |

## Web-App Stack

- React 19, TanStack Router/Start, Vite 7, Nitro Cloudflare preset.
- Tailwind v4, Radix/shadcn UI, lucide-react, framer-motion, TanStack Query.
- Supabase JS v2 für Auth, REST, Realtime und Edge Functions.
- Lovable/TanStack config wrapper in `vite.config.ts`; Kommentar warnt davor, TanStack/React/Tailwind/Cloudflare-Plugins doppelt zu registrieren.
- Root routing in `src/routes/__root.tsx`: Landing `/` und öffentliche Firmenprofile `/s/...` ohne App-Chrome; `/auth` und `/onboarding` als Fullscreen-Flows; alle anderen Routen im `AppShell`.
- Auth-Kontext in `src/hooks/useAuth.tsx` unterstützt echte Supabase-Sessions plus lokalen Demo-Modus (`matchfoundr_demo_auth`).

## Web-Routen und Flows

Öffentlich / Einstieg:
- `/` Landing.
- `/auth`, `/auth/callback`, `/auth/update-password`, `/auth/waitlist-confirm`.
- `/s/$slug` öffentliche Firmenprofile.
- Lovable/MCP/OAuth-Hilfsrouten: `/.lovable.oauth.consent`, `/.well-known/oauth-protected-resource`, `/.mcp/list-tools`, `/.mcp/invoke-tool/$tool`, `/mcp`, `/api/stt`.

App-Shell:
- Core Navigation: `/heute`, `/discover` (als Swipe bezeichnet), `/marketplace`, `/matches`, `/guides`, `/co-pilot`.
- Tools: `/events`, `/firma`, `/foerderung`, `/aufgaben`, `/kanban`, `/kalender`, `/unterlagen`, `/team`.
- Service-Kategorien: `/kapital`, `/recht`, `/steuer`, `/mentoren`, `/talent`, `/growth`, `/co-founder`; viele mit Index- und Detail-Slug.
- Admin: `/admin`, `/admin/events`, `/admin/guides`, `/admin/partner`, `/admin/copilot`; Admin-Link ist UI-seitig rollenabhängig, RLS bleibt Backend-Absicherung.

Kernflüsse:
- Auth: E-Mail/Passwort, Magic Link, Google/Apple via Lovable Cloud Auth, Demo-Modus ohne Login.
- Onboarding: Name/Geburtsdatum/Ort, Gründer- oder Skill-Modus, Branche/Skills, Kurzprofil, optional verbundene Konten; speichert Plan-Kontext lokal und Profile in Supabase, wenn echte Session vorhanden.
- Heute: Tagesfokus, Morning Report, Achievements, lokale und Cloud-synchronisierte `daily_tasks`, kurzer Co-Pilot-Einstieg.
- Discover/Swipe/Matches: Matching/Swipe-Hooks plus `matching`/`swipe` Edge Functions; Chat/Matches über Tabellen und Realtime-Migrationen.
- Firma: Firmenprofil-Blöcke, Drag & Drop, veröffentlichbare `/s/$slug` Profile.
- Förderung: Grants aus `src/data/grants.generated.ts`, Förderdetail, Antragsformular und Co-Pilot-Fill.
- Integrationen: verbundene Konten, Morning Report, Gmail/Calendar/WhatsApp, MCP-Verbindungen und MCP-Aktionen.

## iOS-App Stack

- SwiftUI App `ios/Matchfoundr`, Bundle laut Repo-Wissen `de.matchfoundr.app`.
- Projektdateien: `ios/Matchfoundr.xcodeproj`, `ios/project.yml`, SPM Packages über Xcode workspace.
- Native, weitgehend dependency-free Supabase REST/Edge-Function-Schicht in `ios/Matchfoundr/Backend/SupabaseService.swift`; zusätzlich SPM-Abhängigkeiten im Projektgraph, u. a. Supabase Swift und Point-Free/Apple-Pakete.
- `AppState` ist zentrale lokale Quelle der Wahrheit mit `UserDefaults`-Persistenz und Supabase-Sync für Auth, Profile, Partner, Events, verbundene Konten, Morning Report, Founder Radar, Co-Pilot.
- Haupttabs in `MatchfoundrApp.swift`: Heute, Entdecken, Community, Business, Profil. Das weicht von älterer Repo-Doku mit 5 Tabs Heute/Swipe/Chats/Guides/Pilot ab und sollte bewusst akzeptiert oder angepasst werden.

## Backend und Datenmodell

Backend ist Supabase Postgres plus Edge Functions (Deno). Aktuelle Project-Ref in `supabase/config.toml`: `rzmcoxnfcpqqyxgkafwk`.

Wichtige Tabellen aus Migrationen:
- Identität/Rollen/Profile: `profiles`, `user_roles`, `founder_skills`, `founder_assessment`, `profile_embeddings`.
- Matching/Kommunikation: `swipes`, `matches`, `messages`, `conversations`, `match_results`, `match_interactions`, `mutual_matches`, `service_saves`.
- Co-Pilot: `copilot_sessions`, `copilot_context`, `copilot_messages`, `deadlines`, `copilot_documents`, `advisor_recommendations`, `copilot_execution_jobs`, `copilot_execution_agents`, `copilot_execution_events`, `founder_radar_briefs`.
- Daily/Productivity: `daily_tasks`, `notification_prefs`, `daily_reports`, `activity_events`.
- Content/Marketplace: `services`, `partner_offers`, `guides`, `community_events`, `community_event_registrations`, `partner_applications`.
- Company/Documents: `company_profiles`.
- Integrations/MCP: `connected_accounts`, `account_tokens`, `whatsapp_messages`, `mcp_connections`, `mcp_oauth_tokens`, `mcp_action_logs`.
- Admin/secrets/usage: `ai_usage`, `ai_token_grants`, `waitlist`, `app_secrets`, `secret_access_log`.

RLS ist breit aktiviert. Muster: Nutzer verwalten eigene Datensätze; Public Read für veröffentlichte Guides/Events/Partner/Firmenprofile; Admins über `user_roles`; service-role-only Daten wie Tokens sind clientseitig nicht direkt lesbar.

Edge Functions:
- `copilot`, `copilot-worker`, `founder-radar`, `morning-report`, `daily-digest`.
- `matching`, `swipe`.
- `connect-google`, `whatsapp-webhook`, `mcp-connect`, `mcp-act`.
- `resend-confirm`, `github-proxy`, `anthropic-proxy`, `migrate-helper`.

`supabase/config.toml` setzt `verify_jwt = false` für `copilot`, `copilot-worker`, `connect-google`, `mcp-connect`, `mcp-act`, `migrate-helper`; übrige Functions nutzen Standardverhalten.

## Integrationen und Env

Client-/SSR-Env:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- optional `VITE_SUPABASE_EDGE_FUNCTION_URL`
- serverseitig zusätzlich `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

Edge Function Secrets:
- Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` für migrate-helper.
- KI: `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, `BRAVE_SEARCH_API_KEY`.
- Mail: `RESEND_API_KEY`, optional `RESEND_FROM_EMAIL`, `APP_URL`.
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL`.
- GitHub: `GITHUB_TOKEN`, plus OAuth `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` für MCP connector.
- WhatsApp: `WHATSAPP_WEBHOOK_SECRET`.

Konfigurationsdrift:
- `.env.example` zeigt noch die alte Supabase-Ref `urjpyhyezrwhwgnkkxjv`.
- `DEPLOY.md` zeigt ebenfalls noch die alte Ref in Runbook, Migrationen, Cron-Secret und Smoke-Test-URLs.
- Web- und iOS-Clients haben öffentliche Fallbacks auf die neue Ref `rzmcoxnfcpqqyxgkafwk`.
- `supabase/config.toml` ist korrekt auf `rzmcoxnfcpqqyxgkafwk`.

## Deployment-Konfiguration

- Cloudflare: `wrangler.jsonc` mit `name = "tanstack-start-app"`, `main = "src/server.ts"`, `nodejs_compat`; Nitro generiert beim Build eigene `.output/server/wrangler.json` und warnt, dass Wrangler `main` überschrieben wird.
- Netlify Root: `netlify.toml` ist für `public` als pure HTML ohne Build konfiguriert, mit Edge Function `netlify/edge-functions/github-proxy` und Redirects auf statische `/board.html`, `/admin.html`, `/deals.html`. Das wirkt wie eine ältere/statische Site-Konfiguration, nicht wie der aktuelle TanStack-App-Deploy.
- `docs/netlify.toml` und `public/netlify.toml` existieren zusätzlich; sollte vor Launch entwirrt werden.
- GitHub Pages: laut `DEPLOY.md` über `docs/`, vermutlich Marketing/Legacy.
- Supabase: CLI-Deploy der Functions ist der sichere Pfad; keine manuelle MCP-Reproduktion großer Functions.

## Was aktuell funktioniert

- Web-Produktionbuild läuft durch.
- Routing-/App-Shell-Struktur ist konsistent und breit implementiert.
- Demo-Modus erlaubt Web-Nutzung ohne Login.
- Supabase Project-Ref in Code-Fallbacks und `supabase/config.toml` ist aktuell.
- Datenmodell deckt Auth, Matching, Chat, Co-Pilot, Aufgaben, Events, Partner, Guides, Firmenprofile, Integrationen und Admin ab.
- iOS-Code ist strukturiert und produktnah, mit klarer lokaler State-/Backend-Schicht.

## Was aktuell gebrochen oder riskant ist

1. Kritisch: `.env.example` und `DEPLOY.md` referenzieren die tote Supabase-Ref `urjpyhyezrwhwgnkkxjv`. Neue Umgebungen werden dadurch falsch verbunden, wenn jemand dem Runbook folgt.
2. Kritisch: iOS-Build ist in dieser Umgebung nicht verifiziert. Sandboxed Build scheitert an GitHub DNS/CoreSimulator; escalated Build hing ohne Terminalergebnis und wurde abgebrochen.
3. Hoch: Supabase CLI-Verfügbarkeit/Deploy-Pfad ist nicht lokal verifiziert; `npx supabase --version` hing unter aktueller Umgebung.
4. Hoch: Lint ist nicht als schneller Qualitätsgate nutzbar; `eslint .` lieferte nach ca. 90 s kein Ergebnis. Wahrscheinlich müssen Build-/artifact-Verzeichnisse ausgeschlossen werden.
5. Hoch: Deploy-Konfigurationen sind widersprüchlich: aktueller Vite/TanStack/Nitro/Cloudflare-Build vs. Root-Netlify als pure `public` HTML. Launch-Ziel muss fixiert und alte Configs müssen klar als legacy markiert oder entfernt werden.
6. Mittel: Öffentliche Supabase anon keys sind hart als Fallback im Web- und iOS-Code hinterlegt. Das ist bei anon keys grundsätzlich erlaubt, aber erhöht Drift-Risiko und sollte bewusst dokumentiert/automatisiert werden.
7. Mittel: Web-Client-Build hat großen Hauptchunk und mehrere Build-Warnungen. Kein Launch-Stopper, aber Performance-/DX-Schuld.
8. Mittel: iOS Tab-Struktur und Repo-Doku weichen ab; Produktentscheidung nötig, ob aktuelle Tabs bleiben.

## Unbekannt

- Live Supabase-Migrationsstatus gegen Project `rzmcoxnfcpqqyxgkafwk`; nicht geprüft, weil CLI/remote access nicht stabil verifiziert wurde.
- Live Edge Function Deploymentstand; insbesondere ob `copilot`/`copilot-worker` der lokalen Version entsprechen.
- Secrets im Supabase-Dashboard: OpenRouter, Resend, Google, GitHub, WhatsApp, Vault `project_url`/`service_role_key`.
- Auth/OAuth Redirect-Konfiguration in Supabase, Google, Lovable und Apple.
- Runtime-Smokes gegen echte Deploy-URLs und echte Accounts; bewusst nicht eingeloggt.
- iOS Simulator runtime state auf der Maschine.

## Launch-Blocker in Abhängigkeitsreihenfolge

1. Fix Supabase ref drift: `.env.example`, `DEPLOY.md`, Cron SQL examples and smoke-test URLs must use `rzmcoxnfcpqqyxgkafwk`.
2. Pick the production deploy target: Cloudflare TanStack/Nitro or Netlify/static legacy. Remove or clearly isolate stale configs so the wrong artifact cannot ship.
3. Verify Supabase CLI locally or in CI; run `supabase link --project-ref rzmcoxnfcpqqyxgkafwk`, inspect migration status, and deploy Functions via CLI from disk.
4. Verify required Supabase secrets and OAuth redirects for OpenRouter, Resend, Google, GitHub/MCP, WhatsApp, Vault cron secrets.
5. Make lint/quality gates usable by excluding generated/build directories, then run lint/type/build in CI.
6. Verify iOS build on the documented simulator with standard SPM resolution and no offline flags; if it still hangs, inspect package graph and CoreSimulator health.
7. Run authenticated smoke tests for Web: signup/login, onboarding, `/heute`, matching/swipe, chats, grant detail/fill, company publish, connected accounts.
8. Run iOS smoke tests after build: auth, onboarding, today, discover/swipe, community, business workspace, profile, Co-Pilot.

## Recommendation

Continue from the existing codebase. The next engineering task should be a stabilization pass, not a rewrite: correct config drift, choose one deploy path, verify Supabase live state and secrets, make lint/CI deterministic, then run product smokes on Web and iOS.
