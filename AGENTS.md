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

Funktionen: `copilot`, `copilot-worker`, `matching`, `swipe`, `daily-digest`, `morning-report`, `founder-radar`, `mcp-act`, `mcp-connect`, `migrate-helper`, `resend-confirm`, `anthropic-proxy`, `github-proxy`, `connect-google`, `whatsapp-webhook`.

### Co-Pilot

Edge Function `copilot`, Modelle **kimi-k3** (primär) + **Sonnet** (Fallback) über OpenRouter. Latenz ~20 s ist modellbedingt, kein Bug. `verify_jwt = false` für copilot → der Chat-Task läuft ohne User; `daily_brief` und `plan_generate` brauchen dagegen einen User.

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
