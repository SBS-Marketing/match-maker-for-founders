# AGENTS.md — matchfoundr

Betriebswissen für Agenten, die an diesem Repo arbeiten. **Vor der ersten Änderung lesen.**

## Was das ist

Matchmaking-Plattform für Gründer:innen — Co-Founder, Kapital, Förderung, Recht, Steuer, Mentoren, Talent, Growth — mit KI-Co-Pilot. Zielgruppe: Solo-Gründer:innen (Praxis/Studio/Selbstständigkeit). Oberfläche ist deutsch.

- **Web:** React 19 + TanStack Router/Start, Vite, Tailwind v4, Radix/shadcn
- **iOS:** SwiftUI, Bundle `de.matchfoundr.app`, 5 Tabs (Heute · Entdecken · Community · Business · Profil — maßgeblich ist `MainTabView` in `MatchfoundrApp.swift`, nicht ältere Doku)
- **Backend:** Supabase (Postgres + Edge Functions, Deno)
- **Paketmanager:** Bun (`bun.lock` ist maßgeblich — `package-lock.json` liegt zwar da, ist aber nicht die Quelle der Wahrheit)
- **Deploy:** Cloudflare / Netlify / GitHub Pages, siehe `DEPLOY.md`

## Supabase

**Aktuelle Project-Ref: `rzmcoxnfcpqqyxgkafwk`** — die alte `urjpyhyezrwhwgnkkxjv` ist tot. Wenn irgendwo noch die alte Ref steht (die Web-`.env` zeigte zuletzt noch dorthin), ist das der Bug.

### Edge Functions deployen

```bash
npx supabase login   # einmalig, interaktiv — kein SUPABASE_ACCESS_TOKEN hinterlegt
npx supabase functions deploy <name> --project-ref rzmcoxnfcpqqyxgkafwk
```

> **Nicht** über den Supabase-MCP (`deploy_edge_function`) mit von Hand reproduziertem Inhalt deployen. Das hat die Live-`copilot`-Function schon einmal zerstört: bei ~2700 Zeilen entstehen Platzhalter und Transkriptionsfehler. Die CLI liest byte-genau von der Platte und respektiert `verify_jwt` aus `supabase/config.toml`.

Im Repo liegen 15 Funktionen, **live sind 14**. `mcp-act` ist nicht deployt — `npx supabase functions list --project-ref rzmcoxnfcpqqyxgkafwk` (geprüft 29.07.2026) führt es nicht auf. `ios/Matchfoundr/Backend/SupabaseService.swift:569/576/583` ruft es trotzdem auf; das sind drei 404er.

Live: `copilot`, `copilot-worker`, `matching`, `swipe`, `daily-digest`, `morning-report`, `founder-radar`, `mcp-connect`, `migrate-helper`, `resend-confirm`, `anthropic-proxy`, `github-proxy`, `connect-google`, `whatsapp-webhook`.

### Co-Pilot

Edge Function `copilot` (live v47, 28.07.2026) + `copilot-worker` (live v12, 26.07.2026). Beide sind byte-identisch mit dem Repo-Stand auf `main` — nachgewiesen per `functions download` + `diff`, 0 Abweichungen in allen drei Dateien (29.07.2026).

**Modelle** (`copilot/index.ts:31-39`): **Gemini 2.5 Flash primär**, Kimi K3 für Heavy-Tasks, Sonnet 4.6 als Fallback. Kimi timeoutet auf dem aktuellen OpenRouter-Konto zuverlässig — deshalb steht `KIMI_TIMEOUT_MS` auf 6 s, damit `callKimiWithFallback` (Zeile 266-282) schnell auf Sonnet fällt.

**Latenz** — gemessen, nicht geschätzt (`ai_usage`, 181 Zeilen ab 18.07.2026):

| Modell | Aufrufe | Median | Max | zuletzt |
|---|---|---|---|---|
| `google/gemini-2.5-flash` | 112 | 1,6 s | 5,7 s | 28.07. |
| `anthropic/claude-sonnet-4-6` | 40 | 10,1 s | 17,7 s | 26.07. |
| `moonshotai/kimi-k3` | 28 | 8,0 s | 12,0 s | 26.07. |

Die frühere Notiz „Latenz ~20 s ist modellbedingt, kein Bug" gilt nicht mehr: seit dem Wechsel auf Gemini (`c7d2157`) liegt der Median bei 1,6 s. Ein Chat, der 20 s braucht, ist heute ein Bug.

**Auth:** `verify_jwt = false` für `copilot` (live bestätigt). Der Riegel sitzt stattdessen im Code — `copilot/index.ts:1719` antwortet für **jeden** Task außer `chat` mit 401, wenn kein User am Request hängt. Das Token-Gate (Zeile 1810) feuert derzeit nie: `ai_token_grants` ist leer, ohne Grant-Zeile wird die Bedingung nie wahr.

**Alle `ai_usage`-Zeilen tragen `task = "chat"`.** Kein anderer Task hat seit dem 18.07. ein Modell aufgerufen. Für `plan_generate` liegt die Ursache im Client, nicht in der Function — Details und Beleg in [`docs/MAT-8-copilot-beleg.md`](docs/MAT-8-copilot-beleg.md).

**Asynchrone Jobs:** `copilot_execution_jobs` — 15 Jobs, 8 `completed`, 7 `no_result`, keiner `failed`, `error` überall NULL. `no_result` ist kein Absturz, sondern ein Qualitäts-Gate (`copilot-worker/index.ts:784-789`, Statuszeile 883): Der Worker verwirft die eigene Antwort, wenn sie die Vollständigkeitsprüfung nicht besteht. Auf dem aktuellen Worker-Stand (ab v12) sind es 3 von 10 Jobs; die 47 % über alle Jobs mischen zwei Code-Stände. Welche Bedingung im Einzelfall gegriffen hat, ist aus der DB **nicht** ablesbar — `result.reason` ist eine Konstante.

## iOS bauen

```bash
xcodebuild -project ios/Matchfoundr.xcodeproj -scheme Matchfoundr \
  -destination 'platform=iOS Simulator,id=7F2BCAA3-8AB3-4D64-9B50-B99B8B893C99' \
  -derivedDataPath <dir> build
```

> **Keine Offline-SPM-Flags verwenden** — `-onlyUsePackageVersionsFromResolvedFile`, `-disableAutomaticPackageResolution`, `-clonedSourcePackagesDirPath` lassen `xcodebuild` beim Package-Graph bei 0 % CPU hängen. Die Standard-Resolution funktioniert, der globale SPM-Cache hat die Packages.

Simulator: iPhone 16 Pro Max, UDID `7F2BCAA3-8AB3-4D64-9B50-B99B8B893C99`.

## Fallen

- **Grant-Slugs** kommen aus `src/data/grants.generated.ts` — z. B. EXIST ist `exist-gruenderstipendium`, nicht `exist`. Slugs nicht raten.
- **Onboarding/Today liegen hinter Auth.** Sich einzuloggen ist tabu. Zum Screenshotten den env-gated Preview-Branch in `MatchfoundrApp.swift` nutzen (`MF_PREVIEW_TODAY=1`), danach zurücksetzen. Beim ersten Start liegt ein „Start-Assistent"-Sheet über Today → „Später" tippen.
- **Nicht verwechseln:** `/Users/beavy/Desktop/projekt/CLAUDE.md` beschreibt ein anderes Projekt (Chat-Moderator-Bots FPC/CHB/SA) und wird beim Öffnen des Elternordners automatisch geladen. Es hat nichts mit matchfoundr zu tun.

## Brand

Quelle: `brand/brand-book.html` und `public/favicon.svg`.

| | |
|---|---|
| BG | `#FBFAF7` |
| Ink | `#15140F` |
| Muted | `#6B635A` |
| Akzent-Orange | `#E2511C` (deep `#B23B0E` / `#C4400C` für kleinen Text auf Creme, hell `#F0843A`, soft `#FCE4D5`) |
| Sekundär-Lila | `#7B2FE0` |

Fonts: **Geist** (Sans) + **Geist Mono**, Variable Font. Logo: Chevron-Mark `›•‹` — dunkler Chevron links (`#15140F`), oranger rechts (`#E2511C`), Punkt in der Mitte, SVG viewBox `0 0 140 100`.

## Stand des Repos

Der lokale Ordner ist die Quelle der Wahrheit, **nicht GitHub** — `main` ist hier deutlich weiter als `origin/main`. Vor jeder Arbeit `git status` und `git log origin/main..HEAD` prüfen, statt vom Remote-Stand auszugehen.
