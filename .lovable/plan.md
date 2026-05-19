## Ziel
Komplettes Onboarding gemäß `onboarding/spec.md` neu bauen — 3 Pfade (Founder / Talent / Hybrid), Voice-Input, Skill-Picker, 15-Frage Assessment, Übersicht mit Radar + Plan-CTA. iOS-natives Feel mit Slide-Transitions.

## Architektur

### Routing
- `src/routes/onboarding.tsx` komplett ersetzen (aktuell altes Formular, 793 Zeilen).
- Single-Route mit interner Step-State-Machine (keine Sub-Routes — verhindert Page-Reloads, ermöglicht saubere Slide-Animationen via AnimatePresence).
- Geschützt via `AuthGate` wie bisher.

### State
```text
{ path: 'founder' | 'talent' | 'hybrid',
  step: string,
  context: { idea, role, stage, goal, risk },
  skills: { selected[], categories[], availability, looking_for[] },
  assessment: { answers: Record<qid, 1-5> } }
```
Persistenz in `sessionStorage` damit Refresh nicht alles killt.

### Komponenten (neu, alle in `src/routes/onboarding/`)
```text
_layout.tsx           — Wrapper mit Progress-Bar + Slide-Container
StepTypeSelect.tsx    — Screen 0
StepInputMethod.tsx   — A1
StepContextForm.tsx   — A2–A6 (eine Frage pro Screen)
StepVoiceCapture.tsx  — ElevenLabs STT Recording
StepSkillPicker.tsx   — B1 (Kategorie-Chips + Tag-Grid, max 8)
StepLookingFor.tsx    — B2
StepAvailability.tsx  — B3 Slider
StepAssessment.tsx    — 15 Fragen mit Swipe-Slider
StepOverview.tsx      — Profil-Karte, Kontext-Rows, Skills, Radar, CTA
RadarChart.tsx        — 6-Achsen SVG (Recharts ist schon im Projekt)
LoadingConverge.tsx   — Pulsing Logo nach „Plan generieren"
```

## Backend

### Migration (eine)
```sql
-- founder_skills, founder_assessment Tabellen + RLS (siehe spec.md)
-- profiles.founder_type enum text check
```

### Voice → Text
Neue TanStack Server Function `src/lib/stt.functions.ts`:
- `transcribeAudio(formData)` → ruft ElevenLabs `/v1/speech-to-text` mit `scribe_v2`.
- Benötigt Secret `ELEVENLABS_API_KEY` — wird via `add_secret` angefordert wenn nicht vorhanden.

### Context Parse & Plan Generate
Edge Function `copilot` existiert bereits mit `task: 'context_parse'` und `task: 'plan_generate'` — wird unverändert verwendet:
```ts
await supabase.functions.invoke('copilot', { body: { task: 'context_parse', message } })
await supabase.functions.invoke('copilot', { body: { task: 'plan_generate', ... } })
```

### Datenflow am Ende
1. Skills → `INSERT founder_skills`
2. Assessment → Scores berechnen via `calculateAllScores` (existiert in `assessment.ts`) → `INSERT founder_assessment`
3. Context → `UPSERT copilot_context` (Tabelle existiert bereits)
4. `profiles.founder_type` setzen
5. CTA → `plan_generate` aufrufen → redirect zu `/co-pilot` oder `/heute`

## Design Tokens
Tokens (`--ink`, `--ember`, `--cream`, `--paper`, Instrument Serif, Geist) in `src/styles.css` ergänzen falls nicht vorhanden.

## Animationen
- `framer-motion` (`motion`) für Slide-Transitions: `initial={{x:'100%'}} animate={{x:0}} exit={{x:'-100%'}}`.
- Chip-Select: `whileTap={{scale:0.95}}`, `animate={{scale: selected ? 1.05 : 1}}`.
- Slider: native `<input range>` mit 5 Snap-Points + Custom-Styling.
- Loading: CSS-`@keyframes pulse` auf `CopilotMark`.

## Offene Fragen vor Umsetzung
1. **ELEVENLABS_API_KEY** ist noch nicht in Secrets — ich frage ihn beim Build an. OK?
2. **Voice-Pfad jetzt oder später?** Ist nicht-trivial (~150 LOC + API-Key). Falls du erstmal nur das Formular willst, baue ich Voice als Stub („coming soon") und liefere alles andere fertig.
3. **Nach „Plan generieren"** → wohin? `/co-pilot` (existiert) oder `/heute`?

## Reihenfolge der Umsetzung
1. Migration (founder_skills, founder_assessment, profiles.founder_type)
2. Tokens + Layout-Wrapper + State-Machine
3. Screens in Reihenfolge der Spec (0 → A → B → Assessment → Overview)
4. Radar + Loading
5. Wiring zu copilot Edge Function
6. Voice (falls jetzt) — sonst Stub

## Umfang
~1500–2000 LOC neuer Code, ~10 neue Dateien, 1 Migration, evtl. 1 neuer Secret. Geschätzt 3–4 längere Iterationen.