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
| 1 | **Worker verwirft eigene Antworten** | Kein Job ist `failed`, keiner läuft in ein Timeout. Ein fünffaches UND (`copilot-worker/index.ts:784-789`) wird nie wahr. Zwei identische Anfragen — eine `completed`, eine `no_result`. **Hermes' Zuschnitt liegt fertig im Log** (Zyklus 3, Auftrag 2) |
| 2 | **`answerFulfillsJob` hat ein hartcodiertes Elektriker-Regex** | Zeile 386-408: Jede Anfrage mit „Startkosten" muss Geldspanne **plus** Werkzeug **plus** Fahrzeug enthalten. Produktentscheidung über Antwortqualität. Nach Prio 1 nicht mehr tödlich |
| 3 | **Fehlerursache ist nicht auswertbar** | `copilot-worker/index.ts:892` schreibt für alle Jobs dieselbe Konstante. Ein Feld pro Konjunkt macht daraus eine SQL-Abfrage |
| 4 | **`daily-digest` und `morning-report` laufen live gar nicht** | Es existiert **nur ein** Cron-Job. Ihre Migrationen liegen im Repo, sind nie angewendet worden |

### Ziel: iOS läuft rund

| Prio | Aufgabe | Befund |
|------|---------|--------|
| 1 | **Preview-Hook für die fünf Tabs** | Es gibt nur `--preview-onboarding`. Ohne Gegenstück für `MainTabView` sind die Tabs ohne Login nicht testbar. **Hermes' Zuschnitt liegt fertig im Log** (Zyklus 3, Auftrag 3) — Machbarkeit ist geprüft, kein Fake-Layer nötig |
| 2 | **`mcp-act` ist nicht deployed** | iOS ruft es in `SupabaseService.swift:569/576/583` auf — drei 404er |
| 3 | Onboarding-Eingabe prüfen | Im Smoke-Test wurde „zwei Courts" als „drei Courts" angezeigt. `OnboardingView.swift:1090` setzt den Text unverändert ein — **unbestätigt**, vermutlich Autokorrektur des Simulators. Billig zu prüfen |

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
| **`copilot-worker` deployen?** | Hermes' offene Frage. Wenn nein, zieht er Auftrag 2 raus und hängt stattdessen `/aufgaben` an den Plan-Store — das wird auch ohne Deploy sichtbar |
| **`copilot` neu deployen?** | Die vier abgeschnittenen Dokumente deuten darauf, dass live der `finish_reason`-Guard fehlt |
| **`mcp-act`** | Deployen oder die drei iOS-Aufrufe entfernen |
| **Elektriker-Regex** | Lockern? Produktfrage über Antwortqualität |
| **Frontend-Deploy** | Es gibt keinen CI-Job, der die React-App deployt — der eigentliche Hebel für den Chat-Einstieg |
| **`swipe` v9 deployen** | Wäre sicher, aber nur mit `--no-verify-jwt` (sonst kippt die Live-Config von `false` auf `true`) |
| Push nach GitHub | Netlify/Cloudflare deployen von `main` |
| Landing / Positionierung | Wartet auf das Design-Update, erst final wenn App MVP-fähig |
| Logo-Wall-Firmen als Akquise-Ziele | Bird & Bird, Osborne Clarke, SignalIduna, n26·labs — als Partner gewinnen |
| Alte Branches | `codex/admin-panel`, `codex/mobile-first-platform-shell`, `backup/admin-panel-before-push-all` |
