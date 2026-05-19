# Lovable Prompt — Onboarding Implementation

Build the complete matchfoundr onboarding flow based on the spec in `onboarding/spec.md`, using the skill taxonomy from `onboarding/skills.ts` and the assessment questions from `onboarding/assessment.ts`.

## What to build

A multi-step onboarding that starts after signup and covers:
1. User type selection (Founder / Talent / Hybrid)
2. Context input via Voice (ElevenLabs STT) or Form (5 questions)
3. Skill picker with category filter (Talent + Hybrid paths)
4. Psychological assessment (15 questions, 1–5 swipe slider)
5. Overview screen with editable profile fields, radar chart, and "Plan generieren" CTA

## Feel & Animations
- Full-screen steps, one focus per screen
- Slide transition: right-in / left-out, 300ms ease-out
- Chip/tag select: spring scale + Ember (#E2511C) fill
- Assessment slider: horizontal swipe, 5 snap points
- Loading after CTA: pulsing matchfoundr logo (two chevrons)
- Must feel like a native iOS app — no page reloads, no jarring jumps

## Backend calls
- Voice transcription: ElevenLabs STT API
- After voice/form: call Supabase Edge Function `copilot` with `task: "context_parse"`
- After assessment: save raw_answers + calculated scores to `founder_assessment` table
- After skills: save to `founder_skills` table
- "Plan generieren" button: call Edge Function `copilot` with `task: "plan_generate"`
- All tables and RLS policies are defined in `onboarding/spec.md` — apply the migrations

## Design tokens
- Ink: #15140f · Ember: #E2511C · Cream: #FBFAF7 · Paper: #F3EFE6
- Headings: Instrument Serif · Body: Geist · Numbers: Geist Mono
- Full spec in `onboarding/spec.md`
