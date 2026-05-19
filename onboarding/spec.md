# matchfoundr · Onboarding Spec

## Overview

Three user types, three paths — all ending at the same overview screen.
Everything feels native: full-screen steps, spring animations, swipe gestures, no long forms.

---

## Screen 0 — Type Selection

Full-screen. Three large tappable cards, stacked vertically with spacing.
On tap: card scales up slightly (spring animation), then slides out left while next screen slides in from right.

```
┌─────────────────────────────┐
│  Ich hab eine Idee          │  → Founder Path
│  und suche einen Co-Founder │
└─────────────────────────────┘

┌─────────────────────────────┐
│  Ich hab Skills             │  → Talent Path
│  und suche ein Projekt      │
└─────────────────────────────┘

┌─────────────────────────────┐
│  Ich hab beides             │  → Hybrid Path
│  Idee + Skills              │
└─────────────────────────────┘
```

---

## Path A — Founder (has an idea)

### Screen A1 — Input Method
Two large cards:
- 🎤 **Per Voice** — "Erzähl uns von deiner Idee" (ElevenLabs STT)
- ✏️ **Per Formular** — "Schritt für Schritt"

### Screen A2–A6 — Context Questions (Form path)
One question per screen, full-screen, large text input.
Progress bar at top animates between steps.
Back swipe gesture supported.

| Screen | Field   | Question                                              |
|--------|---------|-------------------------------------------------------|
| A2     | idea    | Woran arbeitest du?                                   |
| A3     | role    | Was ist deine Rolle? Solo oder mit Team?              |
| A4     | stage   | Wo stehst du gerade?                                  |
| A5     | goal    | Was willst du in den nächsten 3 Monaten erreichen?    |
| A6     | risk    | Was ist dein größtes Risiko / deine nächste Deadline? |

Voice path: single recording screen → transcribed → sent to `context_parse` edge function → auto-fills all fields → skip to Assessment.

### Screen A7 — Psychological Assessment
See Assessment section below.

### Screen A8 — Overview
See Overview section below.

---

## Path B — Talent (has skills, no idea)

### Screen B1 — Skill Picker

Two-level selection:
1. **Category chips** (horizontal scroll): Tech · Design · Sales · Finance · Legal · Ops · Marketing
   - Each chip has an emoji + label
   - Tap to filter skills below
   - Active chip: filled with Ember #E2511C, white text

2. **Skill tags** (wrapping grid below):
   - Tap to select/deselect
   - Selected: Ember background, white text, scale-up animation (spring)
   - Multiple selections across categories allowed
   - Max 8 skills (show counter: "3/8 ausgewählt")

### Screen B2 — What are you looking for?

Four toggle cards (multi-select):
- Idee mitentwickeln
- Early Startup joinen
- Equity statt Gehalt
- Gehalt ab Funding

### Screen B3 — Availability

Single horizontal slider:
- Range: 5h/Woche → Full-time (40h+)
- Snap points: 5, 10, 20, 30, 40+
- Label updates live below slider

### Screen B4 — Psychological Assessment
See Assessment section below.

### Screen B5 — Overview
See Overview section below.

---

## Path C — Hybrid

Founder Path A2–A6 + Skill Picker (B1) inserted after A6, then Assessment, then Overview.

---

## Psychological Assessment (all paths)

15 questions, one per screen (or grouped 3 per screen on tablet).
Each question uses a **horizontal swipe slider** (1–5).

### UX
- Big question text, centered
- Slider at bottom: 5 dots, swipe left/right or tap
- Labels at both ends (low_label / high_label from assessment.ts)
- Progress: "Frage 3 von 15"
- No back-tracking (prevent overthinking)
- Estimated time shown: "~2 Minuten"

### Dimensions displayed to user
After assessment, show a radar chart with 6 axes:
- Risikobereitschaft
- Arbeitsweise
- Entscheidungstyp
- Führung
- Commitment
- Feedback-Stil

---

## Overview Screen (all paths)

### Layout
Full-screen scroll. Sections:

**1. Profil-Karte**
Name + Typ (Founder / Talent / Hybrid)
Emoji-based visual identity

**2. Dein Kontext** (Founder/Hybrid only)
Each field as a row:
- Icon + Label + Value + Edit-Icon (pencil)
- Tap Edit → inline edit mode, keyboard slides up

Fields with explanation tooltips (tap ℹ️):
- **Idee** — "Was du aufbaust"
- **Rolle** — "Dein Part im Team"
- **Stand** — "Wo du heute stehst"
- **Ziel** — "Was in 3 Monaten erreicht sein soll"
- **Risiko** — "Was der Co-Pilot im Blick behält"

**3. Deine Skills** (Talent/Hybrid only)
Selected skill tags displayed, tapable to edit

**4. Persönlichkeits-Radar**
Small radar chart, 6 axes, ember color fill
Tap → expands to full-screen detail view

**5. CTA Button**
Full-width, Ember background:
"Deinen Plan generieren →"
→ triggers `plan_generate` edge function
→ shows loading screen with animated matchfoundr Converge mark (spinning/pulsing)
→ transitions to Dashboard

---

## Database

### New table: `founder_skills`
```sql
create table public.founder_skills (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  skills       jsonb,          -- ["React", "B2B Sales"]
  categories   jsonb,          -- ["tech", "sales"]
  availability integer,        -- hours per week
  looking_for  jsonb,          -- ["equity_based", "early_stage"]
  updated_at   timestamptz default now()
);
alter table public.founder_skills enable row level security;
create policy "Users manage own skills"
  on public.founder_skills for all using (auth.uid() = user_id);
```

### New table: `founder_assessment`
```sql
create table public.founder_assessment (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  raw_answers  jsonb not null,  -- { "risk_1": 4, "structure_2": 2, ... }
  scores       jsonb not null,  -- { "risk": 4.0, "structure": 2.3, ... }
  updated_at   timestamptz default now()
);
alter table public.founder_assessment enable row level security;
create policy "Users manage own assessment"
  on public.founder_assessment for all using (auth.uid() = user_id);
```

### Update `profiles`
```sql
alter table public.profiles
  add column if not exists founder_type text
    check (founder_type in ('founder', 'talent', 'hybrid'));
```

---

## Design Tokens

```
Colors:
  Ink:    #15140f
  Ember:  #E2511C
  Cream:  #FBFAF7
  Paper:  #F3EFE6

Fonts:
  Headings: Instrument Serif (italic for accent words)
  Body/UI:  Geist
  Mono:     Geist Mono (for scores/numbers)

Animations:
  Screen transition: slide-in from right / slide-out to left, 300ms, ease-out
  Chip select:       scale(1.05) + color fill, 150ms spring
  Slider snap:       haptic-style bounce on snap points
  CTA tap:           scale(0.97) → scale(1.0), 100ms
  Loading screen:    Converge mark (two chevrons) pulse animation, 1.5s loop
```
