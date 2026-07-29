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
