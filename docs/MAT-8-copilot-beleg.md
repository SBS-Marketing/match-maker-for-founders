# MAT-8 — Co-Pilot: Belegzyklus 2

Stand: 2026-07-29 · Branch `loop/2-copilot-beleg` · Basis `aa2ee36` · **rein lesend** (kein Deploy, kein DDL)

Alle Zeitangaben UTC. Live-Projekt `rzmcoxnfcpqqyxgkafwk`.

Dieser Zyklus beantwortet drei Fragen, die vorher unter dem Satz „Co-Pilot antwortet
zuverlässig" zusammengefallen sind. Jede Aussage unten hat eine Quelle: eine Zeile im
Code, eine Zeile in der Live-DB, oder eine Ausgabe der Supabase-CLI. Wo ein Beleg
fehlt, steht das ausdrücklich dabei.

---

## Kurzfassung

| Frage | Antwort |
|---|---|
| (a) Ist live gleich lokal? | **Ja, byte-identisch.** Alle drei Dateien, 0 Diff-Zeilen. |
| (b) Warum scheitern die Jobs? | **Nicht ein Fehler, sondern ein Qualitäts-Gate.** Kein einziger Job ist abgestürzt — `error` ist bei allen `no_result`-Jobs NULL. Der Worker verwirft die Antwort selbst. |
| (c) Wo bricht `plan_generate` ab? | **Gar nicht in der Edge Function.** Der Abbruch liegt im Client, `src/routes/plan.tsx:33-43` bzw. `:48-52`, vor dem Netzwerkaufruf. |

Zwei von Hermes' drei Verdächtigen für (c) sind **widerlegt**: das Token-Gate kann
nicht feuern (Tabelle leer), `verify_jwt` steht live auf `false`. Der dritte
(fehlender User) wird nie erreicht, weil der Client vorher aussteigt.

---

## (a) Ist live gleich lokal?

**Ja — byte-identisch, 0 Abweichungen.**

Vorgehen: deployten Stand über die CLI in ein temporäres Verzeichnis geladen, gegen
den Arbeitsbaum auf `aa2ee36` diffen.

```bash
npx supabase functions download copilot        --project-ref rzmcoxnfcpqqyxgkafwk
npx supabase functions download copilot-worker --project-ref rzmcoxnfcpqqyxgkafwk
```

| Datei | Zeilen live | Zeilen lokal | Diff-Zeilen |
|---|---|---|---|
| `supabase/functions/copilot/index.ts` | 2823 | 2823 | **0** |
| `supabase/functions/copilot/prompts.ts` | 1202 | 1202 | **0** |
| `supabase/functions/copilot-worker/index.ts` | 997 | 997 | **0** |

### Die offene Frage aus Zyklus 1 ist damit beantwortet

Hermes hatte notiert, dass `copilot` v47 **zwei Stunden vor** dem Commit `b10d786`
deployt wurde, und dass deshalb offen sei, ob die 192 ungeprüften Zeilen live sind.

Sie sind live. Die Zeitrechnung war nur eine Zeitzonen-Täuschung:

- `copilot` v47 deployt: **2026-07-28 23:13:47 UTC**
- `b10d786` committet: `Wed Jul 29 01:35:23 2026 +0200` = **2026-07-28 23:35:23 UTC**

Also 22 Minuten Abstand, nicht zwei Stunden — und der Deploy kam **vor** dem Commit,
weil aus dem damals noch uncommitteten Arbeitsbaum deployt wurde. Der byte-genaue
Diff oben beweist, dass exakt dieser Stand live liegt. `b10d786` hat `copilot/index.ts`
(+192) und `copilot/prompts.ts` (+71) angefasst; beide sind live.

**Konsequenz:** Die 192 Zeilen sind nicht mehr „ungeprüft und vielleicht nicht live".
Sie sind ungeprüft **und** live. Das ist die schlechtere der beiden Varianten.

### Nebenbefund: der Funktions-Bestand

`npx supabase functions list` liefert **14** Funktionen. Das Repo hat 15 Verzeichnisse.
Die Differenz ist `mcp-act` — **nicht deployt**, bestätigt.

```
anthropic-proxy   v7    2026-07-21T22:59:42Z   verify_jwt=false
connect-google    v8    2026-07-21T22:59:42Z   verify_jwt=false
copilot           v47   2026-07-28T23:13:47Z   verify_jwt=false
copilot-worker    v12   2026-07-26T20:13:07Z   verify_jwt=false
daily-digest      v8    2026-07-21T22:59:42Z   verify_jwt=false
founder-radar     v8    2026-07-21T22:59:42Z   verify_jwt=false
github-proxy      v8    2026-07-21T22:59:42Z   verify_jwt=false
matching          v8    2026-07-21T22:59:42Z   verify_jwt=false
mcp-connect       v4    2026-07-21T22:59:42Z   verify_jwt=false
migrate-helper    v16   2026-07-26T18:26:50Z   verify_jwt=false
morning-report    v8    2026-07-21T22:59:42Z   verify_jwt=false
resend-confirm    v8    2026-07-21T22:59:42Z   verify_jwt=false
swipe             v8    2026-07-21T22:59:42Z   verify_jwt=false
whatsapp-webhook  v8    2026-07-21T22:59:42Z   verify_jwt=false
```

`ios/Matchfoundr/Backend/SupabaseService.swift:569/576/583` ruft `mcp-act` auf. Das
sind drei 404er. (Korrektur zu Zyklus 1: die Datei liegt unter `Backend/`, nicht
`Services/`. Und `swipe` v8 stammt vom **21.07.**, nicht vom 17.07. — alle v8-Funktionen
teilen denselben Bulk-Deploy-Zeitstempel.)

---

## (b) Warum scheitern die Jobs?

### Zuerst: „scheitern" ist das falsche Wort

`copilot_execution_jobs` hat 15 Zeilen: 8 `completed`, 7 `no_result`. Es gibt **keinen
einzigen** Job mit Status `failed`, und bei **allen sieben** `no_result`-Jobs ist die
Spalte `error` NULL.

Kein Timeout. Kein Crash. Kein Modellfehler. Der Worker hat in allen sieben Fällen
sauber gearbeitet, eine Antwort erzeugt, sie gegen ein Qualitäts-Gate gehalten,
verworfen und dem User geschrieben: *„Ich beende den Auftrag hier, statt dir etwas zu
erfinden."*

Das ist ein designtes Verhalten (`copilot-worker/index.ts:866-869`), kein Bug. Die
Frage ist nicht „warum stürzt es ab", sondern „ist das Gate richtig kalibriert".

### Der Beleg: was fehlt, ist immer dasselbe

`copilot_execution_events` schreibt pro Schritt ein Event. Der Event-Typ hängt an
genau einer Bedingung (`copilot-worker/index.ts:806`):

```ts
kind: complete ? "response" : "tool_result",
```

Die Auswertung über alle 15 Jobs:

- **Alle 8 `completed`-Jobs** haben genau 1 `response`-Event.
- **Kein einziger `no_result`-Job** hat ein `response`-Event.

Das lokalisiert den Bruch auf eine einzige Stelle — den Vollständigkeits-Ausdruck in
`copilot-worker/index.ts:784-789`:

```ts
let complete =
  decision.status === "complete" &&
  decision.adds_value === true &&
  enoughSources &&
  answer.length >= 60 &&
  answerFulfillsJob(job, answer);
const exhausted = step >= job.max_steps || decision.status === "blocked";
```

Ist `complete` false und `exhausted` true, läuft der Job in Zeile 865 → 883 und wird
`no_result`. Es gibt im ganzen Repo genau **eine** Stelle, die diesen Status schreibt
(`copilot-worker/index.ts:883`); in der DB gibt es **keine** Funktion, die `no_result`
erwähnt (Prüfung über `pg_proc`: 0 Treffer). Der Pfad ist damit eindeutig.

### Die 47 % sind eine Vermischung zweier Code-Stände

`copilot-worker` v12 ist am **2026-07-26 20:13:07 UTC** deployt worden. Vier der
sieben `no_result`-Jobs sind **davor** entstanden und liefen auf einer Version, die
heute nicht mehr existiert und nicht mehr abrufbar ist.

| Zeitraum | Jobs | davon `no_result` | Quote |
|---|---|---|---|
| vor v12 (≤ 26.07. 20:13) | 5 | 4 | 80 % |
| **ab v12 (heutiger Code)** | **10** | **3** | **30 %** |
| gesamt | 15 | 7 | 47 % |

Die 47 % aus Zyklus 1 sind rechnerisch richtig, als Aussage über den heutigen Stand
aber irreführend. Für den aktuellen Code sind es 30 % — bei einer Stichprobe von 10
Jobs, alle vom selben User, alle zum selben Thema (Elektriker-Gründung). Als Metrik
für „antwortet zuverlässig" ist das noch nicht belastbar.

### Ursache pro Job

Ab v12, also für den Code der heute live liegt:

**1 · `794f71a4` — „KALENDER-KONTEXT" (26.07. 20:40)**
Ursache: **Das Modell hat im ersten Schritt `blocked` zurückgegeben.**
Beleg: einziges Event, `payload.status = "blocked"`, `step = 1`, `source_count = 0`.
Damit greift der zweite Disjunkt in Zeile 790 (`decision.status === "blocked"`),
`exhausted` wird sofort true, und der Job endet nach einem Schritt.
Der `progress_text` nennt den Grund: Kalender-Kontext und Business-Memory
widersprechen sich, das Modell wollte eine Klärung statt einer Antwort.

Der eigentliche Fehler liegt eine Ebene höher: Ein Kalender-Kontext ist keine
Web-Recherche. Der Auftrag wurde trotzdem in den Recherche-Worker geroutet, dessen
einziges Werkzeug `searchWeb()` ist. Für diese Aufgabe gibt es dort keine richtige
Antwort. Es sind 0 Quellen und 0 Findings entstanden — der Worker hat nichts zu tun
gehabt.

**2 · `5c8e3d60` — „ONBOARDING-GRÜNDUNGSCHECK" (27.07. 05:46)**
Ursache: **Das Modell hat in keinem der vier Schritte `complete` gemeldet**
(`payload.status = "continue"` bei step 1, 2, 3 und 4). Der erste Konjunkt in Zeile
785 war also nie erfüllt. Danach lief der Synthese-Fallback (Zeile 795-798) — die
Voraussetzungen dafür sind belegt erfüllt: 12 Quellen, 20 Findings im
`working_memory`, step ≥ 2. Dessen Ergebnis ist an Zeile 798 gescheitert.

Dieser Job ist der aussagekräftigste im ganzen Satz, weil es einen direkten
Vergleichsfall gibt: `8ff53c27` (27.07. 20:56) hatte **dieselbe** `request_message`
und **dasselbe** Assignment und ist `completed`. Gleicher Code, gleicher Prompt,
gegenteiliges Ergebnis. Das Gate ist nicht deterministisch — es hängt daran, ob das
Modell zufällig eine Formulierung trifft, die durch die Regex in `answerFulfillsJob`
passt.

**3 · `83283198` — „Such so ein Rechner für meine Branche" (27.07. 20:58)**
Ursache: **`answerFulfillsJob` (`copilot-worker/index.ts:386-408`) kann für diese
Anfrage prinzipiell nicht erfüllt werden.**

Das ist der klarste Befund. Das Gate schaltet allein anhand des *Frage*-Textes:

```ts
const asksForCosts = /startkosten|startkapital|gründungskosten|.../.test(request);
if (asksForCosts) {
  const electrical = /elektriker|elektroniker|elektrobetrieb|elektrofirma/.test(request);
  if (electrical) {
    const coversCoreEquipment =
      /werkzeug|messgerät|messgeraet/i.test(answer) && /fahrzeug|transporter/i.test(answer);
    return hasMoneyRange && coversCoreEquipment && excludesOpenEndedRange;
  }
}
```

Das Assignment lautet: *„Finde einen Kostenrechner für die Selbstständigkeit im
Elektroniker-Handwerk, der Startkosten und laufende Kosten berücksichtigt."* Es
enthält „Startkosten" und „Elektroniker" — also verlangt das Gate von der Antwort
eine Geldspanne **plus** die Wörter Werkzeug/Messgerät **plus** Fahrzeug/Transporter.

Der User wollte aber einen **Link auf einen Rechner**, keine Kostenschätzung. Eine
korrekte Antwort auf die gestellte Frage kann diese Prüfung nicht bestehen. Der Job
lief vier Schritte, sammelte 10 Quellen und 18 Findings und wurde am Ende verworfen.
Der `progress_text` bestätigt es: *„weitere Quellen zur Kostenplanung gefunden, aber
noch keinen spezifischen Kostenrechner"*.

Vor v12, nur zur Vollständigkeit (Code nicht mehr abrufbar, daher keine
Zeilen-Zuordnung möglich):

- `c3c0910b` („Und?", 26.07. 19:01) — 0 Quellen in allen 4 Schritten, `working_memory.sources` leer. Ohne Quellen ist `enoughSources` false, damit auch `synthesisReady`; es lief nie eine Synthese.
- `c80d29f2` („Okay", 26.07. 19:00) — 4 Quellen am Ende, aber 0 Findings in jedem Event.
- `f70de5c5` („Welche Genehmigung…", 26.07. 18:58) — 2 Quellen, 0 Findings.
- `41e2a4d7` („Such nochmal", 26.07. 17:59) — Sonderfall: **keine Events, `current_step = 0`, `attempts = 0`, `last_heartbeat_at` und `result_sent_at` NULL, `result` NULL.** Der heutige Code kann diesen Zustand nicht erzeugen: Zeile 727 setzt `step = current_step + 1 ≥ 1`, und Zeile 883-897 schreibt immer `result` **und** `result_sent_at`. Der Job stammt aus einer Vorgängerversion.

### Der Befund hinter dem Befund

Bei `5c8e3d60` und `83283198` lässt sich **nicht** entscheiden, ob
`synthesis.addsValue` oder `answerFulfillsJob` die Antwort verworfen hat. Zeile 798
wertet beides in einem Ausdruck aus und protokolliert nichts. Was in der DB landet,
ist eine Konstante (`copilot-worker/index.ts:892`):

```ts
result: { reason: "No sufficiently grounded result", sources: allSources },
```

Für alle sieben Jobs steht dieselbe Zeichenkette in der Datenbank. Das ist der
Grund, warum diese Frage überhaupt eine Untersuchung gebraucht hat: **der Worker
protokolliert nicht, an welcher Bedingung er eine Antwort verwirft.** Solange das so
bleibt, ist jede weitere Diagnose wieder Rekonstruktion aus Code-Lektüre statt
Ablesen.

### Nebenbefund: ein Cron-Job läuft ins Leere

Die Edge-Function-Logs der letzten 24 h enthalten **ausschließlich**
`POST /copilot-worker → 202`, im Minutentakt, ~100 Aufrufe. Kein einziger Aufruf von
`copilot`. Der 202 kommt aus `copilot-worker/index.ts:717` (`status: "idle"` — kein
Job in der Queue); der letzte echte Job stammt vom 27.07. Ein Drain-Cron läuft also
seit zwei Tagen jede Minute leer.

---

## (c) Wo genau bricht `plan_generate` ab?

**Antwort: nirgends in der Edge Function. Der Aufruf findet nicht statt.**

### Die drei Verdächtigen aus Zyklus 1

**Token-Gate — widerlegt.** Das Gate steht in `copilot/index.ts:1810-1821` und feuert
nur, wenn `activeTokenGrant` gesetzt ist:

```ts
let activeTokenGrant = user ? await loadTokenGrant(supabase, user.id) : null;
if (activeTokenGrant && Math.max(0, activeTokenGrant.tokens_used) >= ...) → 402
```

`select * from ai_token_grants` liefert **0 Zeilen**. Ohne Grant-Zeile ist
`activeTokenGrant` null, die Bedingung kurzschließt, das 402 kann nicht ausgelöst
werden — für keinen Task.

**`verify_jwt` — widerlegt.** `functions list` zeigt für `copilot` live
`verify_jwt=false`. Die Plattform-Prüfung ist aus.

**Fehlender User — wird nicht erreicht.** Es gibt zwar einen Auth-Riegel auf
Anwendungsebene (`copilot/index.ts:1719-1721`), der für jeden Task außer `chat` mit
401 antwortet. Der greift hier aber nie, weil der Client schon vorher aussteigt
(siehe unten).

### Wo es wirklich endet

Der einzige Aufrufer im ganzen Repo ist `src/routes/plan.tsx:57`. Davor liegen zwei
Ausgänge:

```ts
33   const cached = localStorage.getItem(PLAN_CACHE_KEY);
34   if (cached) {
35     const parsed = JSON.parse(cached);
36     if (Array.isArray(parsed) && parsed.length > 0) {
37       setSlides(filterSlides(parsed));
38       return;                                    // ← Ausgang 1
...
48   if (!user || isDemo || !session) {
49     if (fallbackSlides.length > 0) setSlides(fallbackSlides);
50     else setError("Plan konnte nicht erstellt werden.");
51     return;                                      // ← Ausgang 2
52   }
...
56   const { data, error: err } = await supabase.functions.invoke("copilot", {
57     body: { task: "plan_generate", ... });       // ← einziger Aufruf
```

**Ausgang 2 ist der wahrscheinliche Regelfall.** `src/routes/onboarding.tsx:129` ruft
`writePlanContext(context)` **unbedingt** auf; der Profil-Schreibvorgang direkt
danach steht dagegen unter `if (session && user && !isDemo)` (Zeile 131). Das
Onboarding ist also bewusst auch ohne Login benutzbar. Wer es ohne Session
durchläuft und danach auf `/plan` landet, trifft Zeile 48 und bekommt
`buildLocalPlanSlides()` — die Edge Function wird nie aufgerufen.

Ausgang 1 blockiert nicht dauerhaft: `plan-draft.ts:65` löscht den Cache bei jedem
`writePlanContext`, also bei jedem Onboarding-Durchlauf.

### Warum das niemandem aufgefallen ist

`buildLocalPlanSlides()` (`src/lib/plan-draft.ts:71`) baut aus den localStorage-Daten
einen vollständigen, plausibel aussehenden Plan. Die Seite zeigt Folien, es gibt keine
Fehlermeldung, keinen Log-Eintrag, keine Konsolen-Warnung. Ein stillschweigender
No-Op ist von einem Erfolg nicht zu unterscheiden. **Genau das ist der Kern des
Problems** — nicht, dass etwas kaputt ist, sondern dass es aussieht, als wäre es
ganz.

### Wie weit die Belege reichen

Zwei Datenquellen, mit unterschiedlicher Reichweite:

- **`ai_usage`**: 181 Zeilen, alle `task = "chat"`. Kein einziger `plan_generate`-Eintrag. Die Tabelle beginnt aber erst am **2026-07-18 12:35**. Belegt ist damit: *seit dem 18.07. hat `plan_generate` kein Modell aufgerufen* — nicht „noch nie". Das Usage-Logging (`copilot/index.ts:2776-2794`) schreibt `task` generisch mit, ein Aufruf müsste auftauchen.
- **`copilot_documents`**: **18 Zeilen** vom Typ `pitch_outline`, die letzte vom **2026-06-03 20:44**. Diesen Typ schreibt ausschließlich der `plan_generate`-Zweig (`copilot/index.ts:2624-2629`).

Zusammengenommen: **Der Zweig hat funktioniert und Dokumente erzeugt — zuletzt am
03.06.2026. Seitdem nicht mehr.** Der Code in `copilot/index.ts:2579-2635` ist nicht
defekt; ihn ruft nur niemand mehr auf.

Was **nicht** belegt ist: welcher der beiden Client-Ausgänge im konkreten Fall des
Users feuert. Das erforderte einen Browser-Durchlauf mit eingeloggtem Nutzer, der in
diesem rein lesenden Auftrag nicht drin war. Beide Ausgänge führen zum selben
Ergebnis, und beide liegen in `src/routes/plan.tsx` — der Datei, die Auftrag 3 besitzt.

### Angrenzender Befund

`copilot/index.ts:2583-2588` liest `founder_assessment` und `founder_skills`. Beide
Tabellen werden nirgends in `src/`, `ios/` oder `supabase/` beschrieben — bestätigt.
`src/routes/onboarding.tsx:133-152` schreibt ausschließlich nach `profiles`. Die
`.single()`-Aufrufe werfen dabei nicht: der Fehler landet in `error`, `data` wird
null, und Zeile 2604-2607 fällt auf die `onboarding`-Werte aus dem Request-Body
zurück. Fehlende Zeilen sind hier also **kein** Abbruchgrund — nur stiller
Kontextverlust.

---

## Was daraus folgt (Vorschläge, nicht umgesetzt)

Nach Wirkung sortiert. Nichts davon ist in diesem Zyklus gebaut worden.

1. **Verwerfungsgrund protokollieren.** `copilot-worker/index.ts:892` schreibt eine Konstante. Ein Feld pro Konjunkt aus Zeile 784-789 (`decision_status`, `adds_value`, `enough_sources`, `answer_len`, `fulfills_job`) macht Frage (b) beim nächsten Mal zu einer Abfrage statt zu einer Untersuchung. Kleinste Änderung, größter Hebel.
2. **`answerFulfillsJob` entschärfen.** Ein hartcodiertes Elektriker-Kosten-Regex (Zeile 386-408) entscheidet über jede Anfrage, deren Text „Startkosten" enthält — auch über die, die gar keine Kostenschätzung will. `83283198` konnte deshalb nicht bestehen.
3. **Nicht-Recherche-Aufträge nicht in den Recherche-Worker routen.** `794f71a4` (Kalender-Kontext) hatte in einem Worker, dessen einziges Werkzeug `searchWeb()` ist, keine Chance.
4. **`plan.tsx` soll den Ausfall sichtbar machen.** Der stille Fallback auf lokale Folien verbirgt, dass der Co-Pilot nie gefragt wurde. — Gehört zu Auftrag 3.
5. **`mcp-act` deployen oder die drei iOS-Aufrufe entfernen.** `SupabaseService.swift:569/576/583` zeigt auf eine Funktion, die es live nicht gibt.
6. **Den Drain-Cron prüfen.** ~1440 Leerläufe pro Tag gegen `copilot-worker`.

---

## Verifikation

- `bun run lint` — grün
- `bun run build` — grün
- Kein Deploy, kein DDL, kein Schreibzugriff auf die Live-DB. `functions download` nach `/tmp`, alle SQL-Abfragen lesend.
- `src/`, `ios/`, `src/routes/plan.tsx` und `src/routes/auth.tsx` unverändert.
