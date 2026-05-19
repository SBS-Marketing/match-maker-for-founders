## Plan: Industry Layer für Onboarding

### 1. DB-Migration
Spalte `industry text` zu `public.profiles` hinzufügen (nullable, kein Default). Bestehende RLS-Policies decken die Spalte ab.

### 2. State erweitern (`src/routes/onboarding.tsx`)
- `State` um `industry: IndustryId | null` erweitern (initial `null`), in `EMPTY_STATE` ergänzen.
- Import `INDUSTRIES`, `getIndustry`, `type IndustryId` aus `../../onboarding/industries`.
- Helper `industry = state.industry ? getIndustry(state.industry) : null` im Component-Scope.

### 3. Steps-Maschine
`stepsFor(path, hasIndustry)` umbauen: erster Step ist immer `"industry"`. Erst nach Auswahl folgt `"type"` und der bisherige Pfad. Sequenz:

```text
industry → type → (founder | talent | hybrid pfade) → assessment → overview
```

Back-Button bleibt funktional; auf Step 0 (industry) versteckt.

### 4. Neuer Screen: `StepIndustry`
- Headline „Was baust du auf?"
- 2-Spalten-Grid (`grid-cols-2 gap-3`), 8 Karten aus `INDUSTRIES`.
- Karte: Emoji groß, Label `font-serif`, kurze `description` darunter.
- `whileTap={{ scale: 0.96 }}`, `whileHover={{ scale: 1.02 }}`.
- On click: setState `industry`, 400 ms Delay → `setStepIdx(1)` (Spring-Fill via `animate` auf Ember-Hintergrund während des Delays).

### 5. Adaptive Language
- **StepType**: Subtitel aus `industry.terms.partner` ableiten (z. B. "und suche einen Geschäftspartner"). „Idee/Skills/beides" bleibt, aber Partner-Begriff dynamisch.
- **CONTEXT_QUESTIONS** in eine Factory `buildContextQuestions(industry)` umwandeln:
  - `stage` → `options = industry.terms.stage_options`
  - `role` → Partner-Begriff in Frage/Optionen einsetzen
  - `idea` → Frage nutzt `venture` (z. B. „Was für ein Betrieb/Studio entsteht?")
- Im Component `const contextQuestions = useMemo(() => buildContextQuestions(industry), [industry])` und überall `CONTEXT_QUESTIONS` durch `contextQuestions` ersetzen (StepContextQuestion props + Overview-Labels).
- **StepSkillPicker**: erhält `primaryCategories: string[]` aus `industry.primary_skills`. Diese Kategorien werden zuerst gerendert, restliche danach (stable sort).
- **StepOverview**: „Dein Kontext"-Sektion-Label nutzt `industry.terms.venture`.

### 6. Persistenz in `submitAll`
- `profiles.update({ founder_type, industry: state.industry })`.
- `copilot_context.upsert` zusätzlich `raw_context: { ...state.context, industry: state.industry, venture_term, partner_term, copilot_context }`.
- Co-Pilot-Invoke-Body erweitern: `body: { task: "plan_generate", message: "", industry: state.industry, venture_term: industry.terms.venture, partner_term: industry.terms.partner, copilot_context: industry.copilot_context }`.

### 7. Resume-Verhalten
`STORAGE_KEY` bleibt; Industry-Feld wird automatisch mitserialisiert. Wenn `state.industry == null` aber `stepIdx > 0`, auf 0 zurücksetzen (sicherer Reset).

### Technische Details
- **Dateien geändert**: `src/routes/onboarding.tsx` (umfangreich), `src/integrations/supabase/types.ts` wird nach Migration automatisch regeneriert.
- **Dateien neu**: keine (Industry-Screen lebt inline; falls Datei zu groß wird, später extrahieren).
- **Migration**: einfaches `ALTER TABLE public.profiles ADD COLUMN industry text;`
- **Edge Function `copilot`**: nur Body-Felder ergänzen — die Prompts unterstützen laut Aufgabenstellung bereits `industry`, `venture_term`, `partner_term`, `copilot_context`. Keine Änderung am Edge-Function-Code nötig.
- **Type-Safety**: `IndustryId` Union sorgt für Compile-Check; `getIndustry` fällt auf `tech` zurück (defensiv).

### Risiken / Out of Scope
- Voice-Parsing (`context_parse`) bleibt unverändert — Industry beeinflusst dort nichts.
- Keine Migration bestehender Profile (industry bleibt `null` für Alt-User; UI-Fallback nutzt generische Begriffe via `getIndustry()`-Default).
