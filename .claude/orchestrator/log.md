# Log — matchfoundr-loop

Append-only. Ein Eintrag pro Zyklus.

## Zyklus 1 — 29.07.2026

**Entscheidung (hermes):** Kein Produkt bauen, sondern die Voraussetzungen schaffen — fremde Arbeit sichern und das Lint-Gate grün machen, bevor die Schleife regelmäßig läuft.

**Begründung:** Ohne grünes Gate kann der Loop kein „grün = übernehmen" fahren (es gibt keinen Test-Runner). Ohne sauberen Tree ist jeder künftige Branch-Diff kontaminiert. Der Sweep kollidierte heute mit null offenen Dateien, nach drei Feature-Zyklen mit allem. Verworfen: Prettier-Regel auf `warn` herunterdrehen — hätte das Problem umbenannt, nicht gelöst.

**Übernommen:**
- `b10d786` — 27 uncommittete Dateien (Co-Pilot, iOS, Edge Functions), 1398+/289−, inhaltlich ungeprüft gesichert
- `2974a52` — fünf Subagenten + Skill `matchfoundr-loop`, `settings.local.json` nach `.gitignore`
- `aa2ee36` — Merge von `loop/1-lint-gruen`: Lint 1844 → 0 Fehler (10 Warnungen bleiben, wie beauftragt)

**Geparkt:** Deploy und Push (Ein-Weg-Türen), Positionierungsfrage, Logo-Wall, drei alte Branches.

**Getestet:**
- `npx eslint .` → 0 Fehler / 10 Warnungen, auch **nach** `bun run build` (kritisch, siehe unten)
- `bun run build` grün, Tree nach zwei Builds sauber
- Web-Smoke: `/`, `/entdecken`, `/plan`, `/onboarding` — laden, null Konsolenfehler
- iOS: `xcodebuild` → **BUILD SUCCEEDED** (erster Beleg, dass der WIP-Stand baut)

**Was schiefging / gelernt:**
- Das Akzeptanzkriterium „`git diff -w` zeigt nur die Handfixes" war falsch formuliert — Prettier ändert auch Quotes, Semikolons und Arrow-Parens, das sind keine Whitespace-Änderungen. Der `developer` hat das gemeldet statt schöngeredet. Der `founding-engineer` hat es durch Prettier-Idempotenz (51/54 Dateien byte-identisch) und einen AST-Vergleich mit 10 Mutations-Tests ersetzt. **Für künftige Sweeps dieses Kriterium verwenden, nicht `-w`.**
- Das Lint-Gate war nur bis zum nächsten Build grün: vier vom Vite-MCP-Plugin generierte Routen werden bei jedem `build` neu geschrieben. Behoben in `e80e276`. Achtung: `src/routes/[.mcp]/` ist als Glob eine Zeichenklasse und greift nicht — escapte Klammern plus `/**` nötig.
- Die Agenten aus `.claude/agents/` waren in der Session nicht als Agent-Typen registriert (Session lief außerhalb des Repos). Behelf: `general-purpose` mit der Rollendatei als Auftragskontext.

**Nächste Vorschläge:**
- *Engineering:* (1) Match→Chat-Flow reparieren — `mutual_matches`, `conversations` und die RPC `perform_swipe` existieren in der Live-DB **nicht**, die deployte `swipe`-Function v8 liefert deshalb immer leere `match_id`/`conversation_id`. Der Fix liegt fertig in `b10d786`, ist aber nicht deployed, während die Copilot-Hälfte (v47) live ist. (2) `tsc --noEmit` als drittes Gate — `vite build` prüft keine Typen, genau ein Typfehler existiert heute auf `main` und kein Gate sieht ihn. (3) Migrations-Inventur: das Live-Ledger kennt zwei Einträge, im Repo liegen Dutzende.
- *Marketing:* (1) Landing auf Beleglage zurückbauen — die Seite nennt 1.647 aktive Kontakte, die Daten enthalten 28 Partner, 10 Grants, 0 Personenprofile; die Logo-Wall zeigt fremde Marken ohne jeden Beleg. (2) Positionierungs-Split auflösen: Hero spricht Padelhalle, alles darunter spricht Cap Table. (3) Waitlist-Feld statt Fake-Profile.

## Zyklus 2 — 29.07.2026

**Entscheidung (hermes):** Belegzyklus für die zwei Backend-MVP-Ziele. Feststellen, wo Onboarding→Plan→Aufgabe und der Co-Pilot tatsächlich brechen, und genau eine Sache sichtbar machen, die heute unsichtbar scheitert. Keine neuen Features, kein Deploy, Landing unangetastet, Match→Chat hinter allem.

**Vom User geändert (mitten im Zyklus):** MVP-Definition genannt — Onboarding→Plan→Aufgabe, Co-Pilot zuverlässig, iOS rund. Match→Chat ausdrücklich NICHT. Positionierung auf Solo-Gründer:innen festgelegt. Landing komplett vertagt bis zum Design-Update. Dadurch wurde der erste Zyklus-2-Zuschnitt verworfen und neu geschnitten.

**Übernommen:** `345a416` swipe-Deploy-Beleg · `1a0d3d7` Co-Pilot-Beleg + AGENTS.md korrigiert · `c45ad75` stiller Plan-Fallback sichtbar · `8f25ce9` Lint gegen Agenten-Worktrees.

**Getestet:**
- iOS-Smoke: alle 8 Onboarding-Schritte, kein Absturz, Plan wird erzeugt und ist auf Branche und Ort personalisiert
- `npx eslint .` 0 Fehler / 10 Warnungen — **4 Sekunden statt 14 Minuten**
- `bun run build` grün · `tsc --noEmit` weiterhin genau der eine bekannte `auth.tsx:82`-Fehler (gehört der Parallelsession des Users)
- `/plan`-Fallback am laufenden Preview verifiziert: erzwungener 401 → Badge sichtbar, echte Ursache im Log

**Die wichtigsten Funde:**
- **Live == lokal, byte-identisch** (0 Diff-Zeilen über drei Dateien). Damit sind die 192 ungeprüften Copilot-Zeilen aus `b10d786` live. Der vermeintliche „Deploy zwei Stunden vor dem Commit" war eine Zeitzonen-Täuschung: 22 Minuten, deployt aus dem damals uncommitteten Arbeitsbaum.
- **Der Co-Pilot-Worker scheitert nicht — er verwirft seine eigenen Antworten.** Kein Job `failed`, kein Timeout. Ein Vollständigkeits-Gate wird nie wahr. `answerFulfillsJob` verlangt per hartcodiertem Elektriker-Regex bei jeder „Startkosten"-Anfrage Geldspanne + Werkzeug + Fahrzeug.
- **Die 47-%-Ausfallquote war falsch** — sie mischte zwei Code-Stände. Auf dem heutigen sind es 3 von 10, bei einem User und einem Thema nicht belastbar. Der Agent hat das selbst korrigiert.
- **`/heute` liest nie den echten Plan** — baut den ersten Schritt selbst per Template, auch im Erfolgsfall. Strukturelles Auseinanderlaufen, nicht nur ein Fehlerfall.
- **Migrations-Drift:** Live-Ledger kennt 2 von 52 Migrationen, 19 Tabellen fehlen. Edge Functions wurden deployt, ihre Migrationen nie.
- **Der Chat-Einstieg hängt am Frontend-Deploy, nicht an der swipe-Function** — live existiert bereits ein Trigger, der `matches` befüllt.

**Was schiefging / gelernt:**
- **Die eigenen Agenten haben das Lint-Gate zerstört.** Worktrees unter `.claude/worktrees/` sind ungetrackt, aber eslint liest `.git/info/exclude` nicht — es lintete fremde Arbeitskopien mit: 1258 Fremdfehler, ~14 min Laufzeit. Behoben in `8f25ce9`. **Für künftige Zyklen: wenn das Gate ohne erkennbaren Grund rot wird, zuerst prüfen, ob es fremde Arbeitskopien mitliest.**
- Ein Agent hat aus dem Befund eine Rückprojektion auf Zyklus 1 gemacht („erklärt den Aufwand hinter 8948b3f"). Das stimmt nicht — die Worktrees entstanden erst in Zyklus 2. Befunde von Agenten gelten für den Zeitpunkt, an dem sie erhoben wurden.
- Die MVP-Frage hätte **vor** dem ersten Zuschnitt gestellt werden müssen. Hermes und der founding-engineer hatten Match→Chat als Prio 1 gesetzt; der User sieht es gar nicht im MVP. Ein halber Zyklus Planung war dadurch für die Tonne.
- Ein Agent hat von sich aus einen Worktree angelegt, als der Haupt-Tree belegt war. Richtige Entscheidung — sollte im Skill stehen, statt auf Eigeninitiative zu beruhen.

**Nächste Vorschläge:** siehe Board, nach MVP-Zielen sortiert. Kandidat für Zyklus 3: `/heute` an den echten Plan-Cache anbinden (Prio 1 des ersten MVP-Ziels) und der leerlaufende Drain-Cron.

## Zyklus 3 — 29./30.07.2026 — ABGEBROCHEN

**Entscheidung (hermes):** Den Plan zu **einer** Quelle zusammenführen und den Co-Pilot-Worker davon abbringen, fertige Antworten wegzuwerfen. Begründung: zwei Zyklen ohne sichtbares Ergebnis reichen; Auftrag 1 verändert, was im Browser zu sehen ist.

**Abbruchgrund:** Monatliches Spend-Limit erreicht. Auftrag 1 brach nach dem ersten Werkzeugaufruf ab, Auftrag 3 konnte nicht starten (Worktree-Isolation braucht ein Git-Repo als Session-cwd — die Session lief von `~/Desktop`). **Nichts committet, `main` unverändert auf `0b346df`.**

**Erledigt vor dem Abbruch:** Drain-Cron live von `* * * * *` auf `*/5 * * * *` (`cron.alter_job`, verifiziert). Kein Defekt behoben — der Cron ist das Recovery-Netz zum direkten Anstoß in `copilot/index.ts:569`, `202 idle` war seine Erfolgsmeldung. 1440 → 288 Aufrufe/Tag.

### Hermes' Zuschnitt — beim nächsten Anlauf direkt verwendbar

**Neue Befunde aus seiner Prüfung:**
- Der Server persistiert den Plan längst: `copilot/index.ts:2624` schreibt jeden `plan_generate`-Lauf als `copilot_documents`-Zeile (`type: "pitch_outline"`). Niemand liest das zurück. Damit ist „Plan überlebt Cache-Leerung und Gerätewechsel" **ohne Migration** erreichbar — die Migrations-Drift bleibt unangetastet.
- iOS hat eine **vierte** Plan-Liste: `AppState.swift:1029/1283` (`personalizedPlannerItems()` → UserDefaults `mf.planner.items`), ohne Kontakt zum Copilot-Plan. Der Plan hat nirgends einen Besitzer.
- Der `auth.tsx:82`-Typfehler steht noch — die Parallelsession des Users ist nicht durch, das tsc-Gate bleibt deshalb liegen.

**Auftrag 1 · `loop/3-plan-eine-quelle` · founding-engineer · Haupt-Tree (braucht Port 5173)**
Modul `src/lib/plan-store.ts`, das den Plan in fester Reihenfolge auflöst und die Quelle mitführt: localStorage → neuester `pitch_outline` aus `copilot_documents` → `plan_generate` → Template-Fallback. `plan.tsx` ersetzt seine Inline-Kaskade (Badge aus `c45ad75` bleibt), `heute.tsx:82` zieht `firstStep` aus demselben Store. Kein Plan da → Plan-Aufgabe wird gar nicht erzeugt. Dazu der geschluckte Sync-Fehler in `heute.tsx:100-106`.
*Erster Schritt:* live **nur lesend** prüfen, ob ein eingeloggter Client `copilot_documents` per RLS lesen darf. Wenn nein: Server-Zweig entfällt, Rest bleibt.
*Löst Board-Befunde 1, 2, 3 und 7 des ersten MVP-Ziels auf einmal.*
*Nicht drin:* `/aufgaben`, `founder_assessment`/`founder_skills`, `RadarChart`, `supabase/functions/**`, Migrationen, `auth.tsx`, iOS.

**Auftrag 2 · `loop/3-worker-wirft-nichts-weg` · developer · nur `copilot-worker/index.ts`**
Das Vollständigkeits-Gate (`:784-789`) bleibt, entscheidet aber nicht mehr über Wegwerfen: Ist der Job erschöpft (`step >= max_steps` oder `blocked`) und liegt eine Antwort ≥ 60 Zeichen vor, wird sie mit `partial: true` plus Hinweissatz ausgeliefert. `no_result` nur noch für „gar keine Antwort". Statt der Konstante in `:892` ein `result.gate`-Objekt mit einem Feld pro Konjunkt (`status_complete`, `adds_value`, `enough_sources`, `length_ok`, `fulfills_job`).
*Entschärft nebenbei das geparkte Elektriker-Regex, ohne die Produktfrage zu entscheiden.*
**Offene Frage von Hermes, unbeantwortet:** Wird `copilot-worker` am Zyklusende deployed? Wenn nein, zieht er Auftrag 2 raus und hängt stattdessen `/aufgaben` an denselben Plan-Store — das wird auch ohne Deploy sichtbar.

**Auftrag 3 · `loop/3-ios-tabs-sichtbar` · developer · nur `ios/`**
`--preview-tabs` als DEBUG-only-Gegenstück zu `--preview-onboarding` (`MatchfoundrApp.swift:24-30`). Machbarkeit geprüft: `isOnboarded` ist `profile != nil`, `completeOnboarding(with:)` setzt alles — kein Fake-Layer nötig. Dann Smoke über alle fünf Tabs mit Screenshots. Nur Abstürze und weiße Screens werden behoben, alles andere notiert. Plus: „zwei Courts" → „drei Courts" klären (Autokorrektur oder echtes Umschreiben).

**Verworfen von Hermes:** `founder_assessment`/`founder_skills` verdrahten — die Tabellen gehören zu den 19, die live fehlen; das zwingt in die Migrations-Drift und damit in einen Zyklus ohne Ergebnis.

**Kollisionen:** keine. Auftrag 1 nur `src/lib/` + `plan.tsx` + `heute.tsx`, Auftrag 2 nur `copilot-worker/index.ts`, Auftrag 3 nur `ios/`. `auth.tsx` in keinem.

**Für den nächsten Anlauf beachten:** Die Session aus dem Repo-Ordner starten (`~/Desktop/Projekte/projekt/match-maker-for-founders`) — dann sind die Agenten-Typen registriert (`@hermes` statt Behelf über `general-purpose`) und die Worktree-Isolation funktioniert.
