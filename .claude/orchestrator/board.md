# Board — matchfoundr-loop

Zustand der Entwicklungsschleife. Wird vom Skill `matchfoundr-loop` gepflegt.
Der User darf hier jederzeit von Hand Aufgaben eintragen — sie werden im nächsten Zyklus mit aufgenommen.

**MVP-Definition des Users (29.07.2026):** Onboarding → Plan → erste Aufgabe · Co-Pilot antwortet zuverlässig · iOS-App läuft rund.
Match→Chat gehört ausdrücklich **nicht** dazu. Positionierung: Solo-Gründer:innen (Praxis/Studio/Selbstständigkeit).

## Erledigt

| Zyklus | Aufgabe | Agent | Ergebnis |
|--------|---------|-------|----------|
| 1 | Fremde Arbeit sichern | Hauptsession | `b10d786` + `2974a52` |
| 1 | Bun installieren | Hauptsession | 1.3.14 |
| 1 | Lint-Gate grün | developer / founding-engineer | 1844 → 0 Fehler |
| 2 | swipe-Fix gegen Live-Schema belegen | founding-engineer | `docs/swipe-deploy-beleg.md` — Deploy wäre sicher, aber der Hebel liegt woanders |
| 2 | Co-Pilot-Belegzyklus | founding-engineer | `docs/MAT-8-copilot-beleg.md` + AGENTS.md korrigiert |
| 2 | Stillen Plan-Fallback beenden | developer | `c45ad75` — Badge + echte Fehlerursache im Log |
| 2 | Lint-Gate gegen Agenten-Worktrees | Hauptsession | `8f25ce9` — 14 min → 4 s |
| 2 | iOS-Smoke (8 Onboarding-Schritte) | Hauptsession | kein Absturz, Plan wird erzeugt |
| 2 | Drain-Cron entdramatisiert | Hauptsession | War kein Defekt, sondern das Recovery-Netz zum direkten Anstoß. Auf Wunsch auf `*/5 * * * *` (live, verifiziert). 1440 → 288 Aufrufe/Tag |
| 3 | **Plan hat eine Quelle** | founding-engineer | `01cd80e` — `src/lib/plan-store.ts`; `plan.tsx` und `heute.tsx` lesen denselben Store. **Löst die Befunde 1, 2, 3 und 7 des ersten MVP-Ziels auf einmal.** RLS live geprüft, der Server-Zweig trägt |
| 3 | **Worker wirft fertige Antworten nicht mehr weg** | developer | `471d57d` — erschöpfte Jobs liefern mit `partial: true` aus, `gate`-Objekt mit einem Feld pro Konjunkt statt einer Konstante. Vorher/Nachher mit derselben echten Antwort belegt. **Nicht deployed** |
| 3 | **iOS-Tabs ohne Login testbar** | developer | `b5547af` — `--preview-tabs`, DEBUG-only; Release-Binary mechanisch als unverändert belegt. Smoke über alle fünf Tabs: **kein Absturz, kein weißer Screen** |
| 3 | „zwei Courts" → „drei Courts" geklärt | developer | **Simulator-Autokorrektur**, nicht die App. QWERTZ-Host → `z` wird `y` → `Ywei` ist kein Wort → iOS schlägt `Drei` vor. Live im Screenshot erwischt |

## Offen — nach MVP-Zielen sortiert

### Ziel: Onboarding → Plan → erste Aufgabe

| Prio | Aufgabe | Befund |
|------|---------|--------|
| 1 | **Login-Durchlauf fehlt** (2 Min Handarbeit beim User) | Der End-to-End-Beweis für den Server-Zweig braucht eine eingeloggte Session — Anmelden ist Agenten verboten. Belegt sind RLS-Leseerlaubnis und Parse-Logik gegen echten Zeileninhalt; es fehlt nur der Netz-Hop. Ablauf: einloggen → Plan erzeugen → `mf_plan_slides` in DevTools löschen → `/heute` neu laden. Erwartung: derselbe Modellschritt, Quelle `document` |
| 2 | **`copilot_documents.content` ist bei vier Live-Zeilen abgeschnitten** | Rohe Modellausgabe im ```json-Block, mitten im String beendet (`metadata.slides_count = 0`). `parsePlanSlides` birgt daraus vollständige Objekte, aber diese vier liefern keinen `first_step`. Alle vom 03.06.2026. Deutet darauf, dass die **live laufende** `copilot`-Function den `finish_reason === "length"`-Guard aus dem Repo noch nicht hat |
| 3 | **`founder_assessment` / `founder_skills` werden nie geschrieben** | Der Co-Pilot liest sie (`copilot/index.ts:2582`), bekommt immer `null`. Fragebögen (`onboarding/assessment.ts`, `skills.ts`) und `RadarChart.tsx` unverdrahtet — totes Feature. **Achtung:** die Tabellen gehören zu den 19, die live fehlen → zwingt in die Migrations-Drift |
| 4 | **`profiles`-Felder werden beim Copilot-Call nicht gelesen** | `copilot/index.ts:1757` selektiert nur `display_name, founder_type`, obwohl Onboarding auch `industry`, `location`, `vision`, `skills` schreibt. Kommt nur über den localStorage-Snapshot — Gerätewechsel verliert alles |
| 5 | `/aufgaben` ist eine dritte, unsynchronisierte Liste | eigener localStorage-Key, unabhängig von `daily_tasks` und Plan. Kandidat: an `plan-store.ts` hängen |
| 6 | iOS hat eine **vierte** Plan-Liste | `AppState.swift:1029/1283` (`personalizedPlannerItems()` → UserDefaults `mf.planner.items`), ohne Kontakt zum Copilot-Plan |

### Ziel: Co-Pilot antwortet zuverlässig

| Prio | Aufgabe | Befund |
|------|---------|--------|
| 1 | **`partial` wird im Client nicht angezeigt** | `CopilotView.swift:1741` selektiert nur `status,progress_text,current_step,max_steps`; `result` liest im ganzen Repo niemand. Die Teilantwort-Kennzeichnung steht nur im Antworttext. Ein Badge im UI wäre eine eigene Aufgabe |
| 2 | **Routing-Fehler eine Ebene höher** | Ein Kalender-Kontext wurde in den Recherche-Worker geroutet, dessen einziges Werkzeug `searchWeb()` ist. Bleibt korrekt `no_result` — der Fehler sitzt im Routing, nicht im Gate |
| 3 | **`answerFulfillsJob` hat ein hartcodiertes Elektriker-Regex** | Zeile 386-408: Jede Anfrage mit „Startkosten" muss Geldspanne **plus** Werkzeug **plus** Fahrzeug enthalten. Produktentscheidung über Antwortqualität. Nach Prio 1 nicht mehr tödlich |
| 4 | **`daily-digest` und `morning-report` laufen live gar nicht** | Es existiert **nur ein** Cron-Job. Ihre Migrationen liegen im Repo, sind nie angewendet worden |

### Ziel: iOS läuft rund

| Prio | Aufgabe | Befund |
|------|---------|--------|
| 1 | **Community-Tab ist komplett blockiert — HTTP 400** | `column community_events.source_url does not exist`. Live fehlen `source_url` **und** `booking_url`; `select=id,title` liefert 200 mit echten Events („Meister BAföG Seminar", „Senkrechtstarter Award 2026"). Die Migration `20260722132000_community_event_external_links.sql` liegt im Repo, ist nicht angewandt. **Eine einzige Migration blockiert den ganzen Tab** |
| 2 | **`mcp-act` ist nicht deployed** | iOS ruft es in `SupabaseService.swift:569/576/583` auf — drei 404er. Im Smoke nie gefeuert: sie hängen an `postSlackMessage`/`sendGmailMessage`/`fetchMCPActionCapabilities` und liegen nicht auf dem Render-Pfad der Tabs |
| 3 | `xcodegen generate` rollt die Build-Nummer zurück | Setzt `CFBundleVersion` von `20260727` auf `1` und fügt `UIUserInterfaceStyle: Light` ein, weil `project.yml` die Build-Nummer nicht deklariert. In AGENTS.md dokumentiert, Ursache offen |
| 4 | Profil zeigt „5 Swipes heute" bei leerem Deck | Freemium-Zähler-Default, kein Absturz |
| 5 | Community-„Puls"-Karte kollabiert bei leerem Deck | Avatar-`ZStack` behält ihre 92×46-Fläche. Layout-Schwäche, kein Fehler |

### Querschnitt

| Aufgabe | Befund |
|---------|--------|
| **Migrations-Drift** | Das Live-Ledger kennt **2 von 52** Migrationen, 19 deklarierte Tabellen fehlen. Muster: Edge Functions wurden deployt, ihre Migrationen nie. `founder-radar`, `whatsapp-webhook`, `mcp-connect`, `mcp-act` laufen gegen Tabellen, die es nicht gibt. **`supabase db push` wäre gefährlich.** Auch der Cron-Wechsel auf `*/5` steht nur live, nicht im Repo |
| **Realtime im Chat ist tot** | `public.messages` fehlt in der `supabase_realtime`-Publication → der Channel in `matches.$id.tsx` liefert nie ein Event. *(Eigene Session des Users arbeitet daran)* |
| Pricing-Widerspruch | iOS zeigt „Pro · 9 €/Monat nach 3 Tagen", die Web-Landing sagt „Preise wachsen mit dem Produkt" |
| Toter Code | `src/hooks/useSwiping.ts`, `conversation_id` im Frontend unbenutzt, `RadarChart.tsx` nie gerendert |
| `INTEGRATIONS.md` | zeigt noch auf die tote Supabase-Ref `urjpyhyezrwhwgnkkxjv` |

## Geparkt — braucht eine Entscheidung des Users

| Aufgabe | Was zu entscheiden ist |
|---------|------------------------|
| **`copilot-worker` deployen?** | Der Fix liegt fertig auf `main` (`471d57d`), wirkt aber erst live. **Ohne Deploy verwirft der Worker in Produktion weiter fertige Antworten.** |
| **`copilot` neu deployen?** | Die vier abgeschnittenen Dokumente deuten darauf, dass live der `finish_reason`-Guard fehlt |
| **`mcp-act`** | Deployen oder die drei iOS-Aufrufe entfernen |
| **Elektriker-Regex** | Lockern? Produktfrage über Antwortqualität |
| **Frontend-Deploy** | Es gibt keinen CI-Job, der die React-App deployt — der eigentliche Hebel für den Chat-Einstieg |
| **`swipe` v9 deployen** | Wäre sicher, aber nur mit `--no-verify-jwt` (sonst kippt die Live-Config von `false` auf `true`) |
| Push nach GitHub | Netlify/Cloudflare deployen von `main` |
| Landing / Positionierung | Wartet auf das Design-Update, erst final wenn App MVP-fähig |
| Logo-Wall-Firmen als Akquise-Ziele | Bird & Bird, Osborne Clarke, SignalIduna, n26·labs — als Partner gewinnen |
| Alte Branches | `codex/admin-panel`, `codex/mobile-first-platform-shell`, `backup/admin-panel-before-push-all` |
