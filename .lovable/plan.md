## Ziel
Nach erfolgreichem Onboarding-Redirect auf `/heute` startet automatisch ein einmaliges, geführtes Tutorial, das die wichtigsten Bereiche des Command Centers erklärt.

## Trigger-Mechanismus
- In `src/routes/onboarding.tsx` (Zeile 183–186): vor dem `navigate({ to: "/heute" })` zusätzlich `sessionStorage.setItem("mf_tutorial", "1")` setzen.
- In `src/routes/heute.tsx`: beim Mount prüfen, ob `mf_tutorial === "1"` → Tutorial starten und Flag entfernen (damit es nur einmal läuft). Persistente Variante zusätzlich in `localStorage` ("mf_tutorial_done"), damit ein Reload mittendrin es nicht erneut zeigt.

## Tutorial-UX (Spotlight-Coachmarks)
Neue Komponente `src/components/onboarding/TutorialOverlay.tsx`:
- Vollflächiges Overlay mit halbtransparentem Backdrop (`bg-ink/70`)
- Spotlight: liest `getBoundingClientRect()` des aktuellen Ziel-Elements, schneidet das Loch via SVG-Maske (4 dunkle Rechtecke außen) und zeichnet eine 2 px Ember-Outline um das Target
- Tooltip-Card (`glass-pane`) neben dem Target, mit Eyebrow „Schritt X von 5", Titel, kurzem Serif-Italic-Text, Buttons „Weiter" / „Überspringen"
- Fade/scale via framer-motion (bereits installiert)
- Auto-scroll zum Target, ResizeObserver für responsives Repositionieren
- Esc / Klick auf „Fertig" schließt + setzt `localStorage.mf_tutorial_done = "1"`

## Tutorial-Schritte
Targets via `data-tour="..."` Attribute in `heute.tsx` markieren:

1. `welcome` (zentriert, kein Target) — „Willkommen bei matchfoundr. Dein Command Center ist live."
2. `focus` (Focus-Banner Zeile 52) — „Dein Co-Pilot priorisiert täglich drei Dinge. Übernehmen oder verschieben."
3. `conversations` (Aktive Gespräche Zeile 77) — „Alle laufenden Threads — Co-Founder, Recht, Förderung, Steuer."
4. `agenda` (Agenda Zeile 120) — „Was heute auf dem Kalender steht."
5. `funding` (Funding-Pipeline Zeile 140) — „Dein wichtigster offener Antrag. Co-Pilot füllt 78% vorab."

Letzter Step CTA: „Loslegen" → schließt Overlay.

## Dateien
- **edit** `src/routes/onboarding.tsx`: 1 Zeile `sessionStorage.setItem` vor dem Redirect.
- **edit** `src/routes/heute.tsx`: `CommandCenter` von reiner Funktion zu Komponente mit `useEffect`-Trigger + 5 `data-tour`-Attribute + `<TutorialOverlay/>`-Render.
- **new** `src/components/onboarding/TutorialOverlay.tsx`: Spotlight-Overlay + Step-Engine.

## Nicht Teil dieses Plans
- Wiederholbares Tutorial aus Profil-Settings (kann später nachgereicht werden, Hook ist da: einfach Flag wieder setzen).
- Keine DB-Persistenz (rein clientseitig via localStorage).
