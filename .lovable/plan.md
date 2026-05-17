# matchfoundr v2 — Founder-Plattform Rollout

Die ZIP enthält ein vollständiges Handoff (Prompt, README, 6 Screens, 8 Referenz-JSX-Files, HTML-Prototyp). Das Design ist gesperrt – ich setze es pixel-nah um und baue alle Features inkl. Routing, Co-Pilot, Marketplace und Detailseiten. Bestehende Co-Founder-Funktionalität (`/discover`, Matches, Auth, Supabase) bleibt intakt und wandert hinter den neuen Marketplace-Eintrag „Co-Founder".

## Architektur-Entscheidungen

- **Co-Founder bleibt eigene Seite**: `/co-founder` (rename von `/discover`-Erfahrung) mit voller Such-/Match-/Chat-Logik. Im Marketplace ist die Kachel der Einstieg dorthin.
- **Backdrop-Varianten**: `<PageBackdrop variant="sunrise" | "dusk">` existiert teilweise – wird auf die Spec aus README erweitert (4 Blobs, Grid, Noise). Co-Pilot nutzt `dusk`.
- **Design-Tokens & Service-Hues** kommen als CSS-Variablen in `src/styles.css`. Service-Farben (`--svc-legal`, `--svc-tax`, …) werden als Tokens definiert, nicht hartcodiert.
- **Seed-Daten** liegen in `src/data/{founders,advisors,grants,services,mentors}.ts` (kein Backend für die neuen Kategorien – MVP-Scope laut README).
- **AI Co-Pilot** ist im MVP scripted (canned responses + Quick-Chips + lokaler State). Optional kann später Lovable AI Gateway (`google/gemini-2.5-flash`) angeschlossen werden – nicht Teil dieses Plans.

## Neue Routen (TanStack file-based)

```
src/routes/
  index.tsx              -> Landing v2 (Hero links + Co-Pilot Preview rechts + Service-Strip)
  heute.tsx              -> Command Center (auth-protected via _authenticated)
  marketplace.tsx        -> 8-Service Grid mit Co-Pilot Routing Banner
  co-pilot.tsx           -> Chat-UI, Dusk-Backdrop
  co-founder.tsx         -> bestehende Discover-Logik (Filter, Multi-Card, Like/Anschreiben)
  recht.index.tsx        -> Lawyer Listing
  recht.$slug.tsx        -> Advisor Detail (Fit-Reasoning, Pricing, Vouches)
  foerderung.index.tsx   -> Grant Listing
  foerderung.$slug.tsx   -> Grant Detail (EXIST-Beispiel, Eligibility, Timeline, 78%-CTA)
  steuer.tsx · kapital.tsx · mentoren.tsx · talent.tsx · growth.tsx
                         -> Skeleton-Listings (laut README OK für 6/8)
```

Bestehende Routen (`auth`, `onboarding`, `profile`, `matches`, `discover`, `entdecken`) bleiben. `/discover` wird intern Alias / Redirect auf `/co-founder`.

## Shared Components (neu)

- `PageBackdrop` (erweitert) · `GlassPane` · `GlassPill` · `GlassPaneInk` · `GlassPaneEmber`
- `ServiceChip`, `ServiceTile`, `ServiceIcon` (8 SVGs aus `platform-shared.jsx`)
- `CopilotMark` (Konvergenz-Chevrons + Ember-Dot)
- `ThinkingTrace` (dashed bubble), `FitScore`, `PlanTrack`, `SourceCitation`
- `AdvisorCard`, `GrantCard`, `FeedRow` (cross-service mit hue-Border)
- `AppNav` erweitern: für eingeloggte User „Heute / Marketplace / Co-Pilot / Co-Founder" als Tabs.

## Seiten-Implementierung

1. **Landing v2** – Eyebrow „01 · Die Plattform", Headline „Alles, was ein **founder** braucht. KI-vermittelt." (Instrument Serif italic auf „founder"), zwei CTAs, rechts Glass-Pane mit Beispiel-Query + 3 Cross-Service Recommendations + 8-Chip-Strip. Sektionen `how-it-works`, `stories`, `pricing` bleiben (für bestehende Nav-Hash-Links), bekommen aber neuen v2-Content „Eine KI für alle Gewerke".
2. **Command Center `/heute`** – Co-Pilot Fokus-Banner („Heute: 2 Calls, 1 Antrag fällig"), Feed „Active conversations across services" (hue-akzentuierte Rows), Agenda, Funding-Pipeline mit EXIST 78%-Karte. Auth-gated.
3. **Marketplace** – Routing-Banner oben („Sag dem Co-Pilot, was du brauchst"), 4×2 Grid; erste Kachel (Co-Founder) `glass-pane-ember`; Klick → jeweilige Listing-Route.
4. **Co-Pilot** – Dusk-Variant, Chat-Thread links, Sidebar rechts mit „Was der Co-Pilot verstanden hat" + Quellen. Thinking-Trace-Bubble + 3-Spur-Plan-Card mit konkreten Next-CTAs.
5. **Advisor Detail** – Lawyer-Profil mit AI-Fit-Reasoning, Fachgebiete-Bars, Pricing-Pakete, Network-Vouches, „Erstgespräch buchen" → Mock-Slot-Picker.
6. **Förderprogramm Detail** – EXIST-Breakdown, Eligibility ✓/!, Timeline, Materials-Checklist, „Antrag weiterführen (78% pre-filled)" → Link.

## Styles.css Ergänzungen

- Glass-Recipes exakt aus README (`.glass-pane`, `.glass-pill`, `.glass-pane-soft`, `.glass-pane-ink`, `.glass-pane-ember`, Dusk-Variante).
- Service-Hues als Tokens.
- Geist + Geist Mono + Instrument Serif Google-Font Import sicherstellen.

## Was NICHT geändert wird

- Supabase-Schema, Auth-Flow, Onboarding, bestehende Co-Founder-Match-Logik (Swipes, Matches, Messages).
- Keine neuen npm-Pakete – alles mit Tailwind + Inline-SVG.

## Lieferung

Ein Durchgang: Tokens & Glass-Utilities → Shared Components & Seed-Daten → Landing v2 → Marketplace → Co-Pilot → Command Center → Recht- + Förderprogramm-Detail → Listings-Skeletons → Nav-Update → Co-Founder-Route. Danach Build-Check.
