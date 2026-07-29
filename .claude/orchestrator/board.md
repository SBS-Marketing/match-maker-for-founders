# Board — matchfoundr-loop

Zustand der Entwicklungsschleife. Wird vom Skill `matchfoundr-loop` gepflegt.
Der User darf hier jederzeit von Hand Aufgaben eintragen — sie werden im nächsten Zyklus mit aufgenommen.

Status: `offen` · `läuft` · `review` · `übernommen` · `geparkt`

**MVP-Definition des Users (29.07.2026):** Onboarding → Plan → erste Aufgabe · Co-Pilot antwortet zuverlässig · iOS-App läuft rund.
Match→Chat gehört ausdrücklich **nicht** dazu. Positionierung: Solo-Gründer:innen (Praxis/Studio/Selbstständigkeit).

## Erledigt

| Zyklus | Aufgabe | Agent | Ergebnis |
|--------|---------|-------|----------|
| 1 | Fremde Arbeit sichern | Hauptsession | b10d786 + 2974a52 |
| 1 | Bun installieren | Hauptsession | 1.3.14 |
| 1 | Lint-Gate grün | developer / founding-engineer | 1844 → 0 Fehler |
| 2 | swipe-Fix gegen Live-Schema belegen | founding-engineer | `docs/swipe-deploy-beleg.md` — Deploy wäre sicher, aber der Hebel liegt woanders |
| 2 | Co-Pilot-Belegzyklus | founding-engineer | `docs/MAT-8-copilot-beleg.md` + AGENTS.md korrigiert |
| 2 | Stillen Plan-Fallback beenden | developer | c45ad75 — Badge + echte Fehlerursache im Log |
| 2 | Lint-Gate gegen Agenten-Worktrees | Hauptsession | 8f25ce9 — 14 min → 4 s |
| 2 | iOS-Smoke (8 Onboarding-Schritte) | Hauptsession | kein Absturz, Plan wird erzeugt |

## Offen — nach MVP-Zielen sortiert

### Ziel: Onboarding → Plan → erste Aufgabe

| Prio | Aufgabe | Befund |
|------|---------|--------|
| 1 | **`/heute` liest nie den echten Plan** | `heute.tsx:82-88` baut den „ersten Schritt" selbst per `buildLocalPlanSlides()` statt den Cache `mf_plan_slides` zu lesen. Die Aufgabe in `daily_tasks` sieht **immer** die Template-Variante, nie das Modell-Ergebnis — auch im Erfolgsfall. |
| 2 | **`plan_generate` wird nie aufgerufen** | Nicht die Edge Function bricht ab — `plan.tsx` steigt vorher aus (Cache-Treffer oder `!user \|\| isDemo \|\| !session`). Der Zweig hat früher funktioniert: 18 `pitch_outline`-Dokumente, letztes vom 03.06.2026. |
| 3 | **Plan lebt nur im Browser** | Nur `localStorage`. Der Server schreibt zwar nach `copilot_documents`, aber nichts liest das je zurück — Write-only-Log. Cache leeren = Plan weg. |
| 4 | **`founder_assessment` / `founder_skills` werden nie geschrieben** | Der Co-Pilot liest sie (`copilot/index.ts:2582`), bekommt immer `null`. Die Fragebögen (`onboarding/assessment.ts`, `skills.ts`) und `RadarChart.tsx` sind unverdrahtet — totes Feature. |
| 5 | **`profiles`-Felder werden beim Copilot-Call nicht gelesen** | `copilot/index.ts:1757` selektiert nur `display_name, founder_type`, obwohl Onboarding auch `industry`, `location`, `vision`, `skills` schreibt. Kommt nur über den localStorage-Snapshot — Gerätewechsel verliert alles. |
| 6 | `/aufgaben` ist eine dritte, unsynchronisierte Liste | eigener localStorage-Key, unabhängig von `daily_tasks` und Plan |
| 7 | Stiller Sync-Fehler in `/heute` | `heute.tsx:100-106` schluckt Fehler ohne Log |

### Ziel: Co-Pilot antwortet zuverlässig

| Prio | Aufgabe | Befund |
|------|---------|--------|
| 1 | **Worker verwirft eigene Antworten** | Kein Job ist `failed`, keiner läuft in ein Timeout. Ein Vollständigkeits-Gate (`copilot-worker/index.ts:784-789`) wird nie wahr. Zwei identische Anfragen — eine `completed`, eine `no_result`. |
| 2 | **`answerFulfillsJob` hat ein hartcodiertes Elektriker-Regex** | Zeile 386-408: Jede Anfrage mit „Startkosten" muss eine Geldspanne **plus** Werkzeug **plus** Fahrzeug enthalten. Produktentscheidung über Antwortqualität, keine technische. |
| 3 | **Fehlerursache ist nicht auswertbar** | `copilot-worker/index.ts:892` schreibt für alle Jobs dieselbe Konstante. Ein Feld pro Konjunkt macht daraus eine SQL-Abfrage. |
| 4 | **Drain-Cron läuft leer** | Edge-Logs der letzten 24 h zu 100 % `copilot-worker → 202 idle`, im Minutentakt, ~1440 Aufrufe/Tag seit zwei Tagen. Kostet Geld, bringt nichts. |

### Ziel: iOS läuft rund

| Prio | Aufgabe | Befund |
|------|---------|--------|
| 1 | **`mcp-act` ist nicht deployed** | iOS ruft es in `SupabaseService.swift:569/576/583` auf — drei 404er. Entweder deployen oder die Aufrufe entfernen. |
| 2 | Onboarding-Eingabe prüfen | Im Smoke-Test wurde „zwei Courts" als „drei Courts" angezeigt. `OnboardingView.swift:1090` setzt den Text unverändert ein — **unbestätigt**, evtl. Autokorrektur des Simulators. Billig zu prüfen. |
| 3 | Preview-Hook für die fünf Tabs | Es gibt nur `--preview-onboarding`. Ohne Gegenstück für `MainTabView` sind die Tabs ohne Login nicht testbar. |

### Querschnitt

| Aufgabe | Befund |
|---------|--------|
| **Migrations-Drift** | Das Live-Ledger kennt **2 von 52** Migrationen, 19 deklarierte Tabellen fehlen. Muster: Edge Functions wurden deployt, ihre Migrationen nie. `founder-radar`, `whatsapp-webhook`, `mcp-connect`, `mcp-act` laufen gegen Tabellen, die es nicht gibt. **`supabase db push` wäre gefährlich.** |
| **Realtime im Chat ist tot** | `public.messages` fehlt in der `supabase_realtime`-Publication → der Channel in `matches.$id.tsx` liefert nie ein Event, Nachrichten erscheinen erst nach Reload. |
| Pricing-Widerspruch | iOS zeigt „Pro · 9 €/Monat nach 3 Tagen", die Web-Landing sagt „Preise wachsen mit dem Produkt". |
| Toter Code | `src/hooks/useSwiping.ts`, `conversation_id` im Frontend unbenutzt, `RadarChart.tsx` nie gerendert |
| `INTEGRATIONS.md` | zeigt noch auf die tote Supabase-Ref `urjpyhyezrwhwgnkkxjv` |

## Geparkt — braucht eine Entscheidung des Users

| Aufgabe | Was zu entscheiden ist |
|---------|------------------------|
| **`mcp-act`** | Deployen oder die drei iOS-Aufrufe entfernen |
| **Elektriker-Regex in `answerFulfillsJob`** | Lockern? Produktfrage über Antwortqualität |
| **Leerlaufender Drain-Cron** | Abstellen — kostet täglich ~1440 Aufrufe |
| **Frontend-Deploy** | Der eigentliche Hebel für den Chat-Einstieg. Es gibt keinen CI-Job, der die React-App deployt |
| **`swipe` v9 deployen** | Wäre sicher, aber nur mit `--no-verify-jwt` (sonst kippt die Live-Config von `false` auf `true`) |
| Push nach GitHub | Netlify/Cloudflare deployen von `main` |
| Landing / Positionierung | Wartet auf das Design-Update, erst final wenn App MVP-fähig |
| Logo-Wall-Firmen als Akquise-Ziele | Bird & Bird, Osborne Clarke, SignalIduna, n26·labs — der User will sie als Partner gewinnen |
| Alte Branches | `codex/admin-panel`, `codex/mobile-first-platform-shell`, `backup/admin-panel-before-push-all` |
