## Ziel

Die Landingpage `src/routes/index.tsx` ist auf Mobile/Tablet immer noch nicht sauber. Das hochgeladene Konzept (`Co_Founder_Plattofrm_3.zip`) enthält jetzt eine **fertige, getestete Mobile-/Tablet-Spezifikation** inklusive konkreter CSS-Regeln und 12 Mobile-Screens (390 px). Plan: diese Spezifikation 1:1 in die bestehende Landingpage übernehmen.

## Vorlage aus dem Upload

- Zwei Breakpoints (aus `reference_html/matchfoundr Landing.html`):
  - `≤ 900 px` → Tablet / großes Phone-Landscape
  - `≤ 640 px` → Phone-Portrait
- Mobile-Screens unter `screens/mobile/01-section.png … 12-section.png` als visuelle Referenz pro Section.
- Vollständige Regelliste im Anhang dieser Datei (Container-Padding, 2-/3-/4-Spalten kollabieren, Marketplace 4×2 → 2×4 → 1×8, Stats 4 → 2 → 1, Footer 5 → 2 → 1, Comparison-Tabelle wird zu Karten mit „Solo"/„Mit Co-Pilot"-Labels via `::before`, FAQ-Sticky-Heading wird statisch, Hero/CTA-Buttons full-width auf Phone, Headline-Caps `clamp(40px,11vw,64px)` bzw. `clamp(36px,12vw,56px)`, €2.4M-Riesenzahl 92 px / 72 px, Chaos-Cloud wird gescalter Flourish).

## Was geändert wird

Nur `src/routes/index.tsx`. Keine Logik, kein Backend, keine anderen Routen.

### 1. `RESPONSIVE_CSS` neu aufsetzen (zwei Media-Queries, Klassen-basiert)

Der heutige Block mischt eigene Werte mit fragilen Attribut-Selektoren. Wir ersetzen ihn durch eine saubere Portierung der Referenz-Regeln, aber konsequent klassenbasiert (die Klassen sind teils schon vergeben):

- **`@media (max-width: 900px)`**
  - Container `[max-width:1240][padding:0 64px]` → `padding: 0 22px`
  - Hero-Grid-Wrapper → `48px 22px 64px`, `gap: 40px`
  - `section` Vertikal-Rhythmus: 140 → 72, 120 → 64
  - Alle zweispaltigen Grids (`landing-hero-grid`, `landing-two-col`, `landing-cta-grid`, `landing-faq-grid`) → 1 Spalte, gap 40, `align-items: start`
  - 3-Spalter (`landing-card-grid-3`) → 1 Spalte, gap 16
  - `landing-market-grid` → `1fr 1fr`, `grid-auto-rows: auto`, gap 12
  - `landing-hero-stats` (4-Spalter) → `1fr 1fr`, gap `22px 18px`, Border-Left entfernen + Border-Top für Zeile 2
  - `landing-quote-grid` (1.4/1/1) → 1 Spalte, gap 14
  - `landing-footer-grid` (1.4 + 4×1) → `1fr 1fr`, Brand-Spalte `grid-column: 1 / -1`
  - Comparison: `.landing-compare-head { display:none }`, `.landing-compare-row` zu Card, `::before`-Pseudos „Solo" / „Mit Co-Pilot" auf `.l-compare-solo` / `.l-compare-mf`
  - Typo-Caps: `h1 clamp(40px,11vw,64px)`, `h2 clamp(28px,7vw,44px)`, €-Zahl 92 px
  - Chaos-Cloud (`min-height:480`) → `height:200px`, `transform:scale(.55)`, `margin-bottom:-120px`, `opacity:.55`
  - FAQ-Sticky → `position:static`
  - Pricing-Featured `translateY(-8px)` → none
  - Nav: `.landing-nav-inner` Padding/Gap reduzieren, `.landing-nav-links`, `.landing-nav-signin`, Plattform-Pill ausblenden, `.landing-nav-cta` kompakt (kurzes Label „Start")

- **`@media (max-width: 640px)`**
  - `landing-market-grid` → 1 Spalte
  - `landing-footer-grid` → 1 Spalte
  - `landing-hero-stats` → 1 Spalte
  - €-Zahl → 72 px
  - `h1 clamp(36px,12vw,56px)`
  - `section[padding:140 0]` → `56px 0`
  - Container Padding → `0 18px`, Hero-Grid `36px 18px 56px`
  - `.landing-compare-row` Padding `16px 18px`
  - Hero/CTA Action-Wrappern Buttons full-width (`flex: 1 1 100%`)

### 2. Fehlende Hooks in JSX ergänzen

Damit die Selektoren oben greifen, ergänze ich an den entsprechenden Stellen in `src/routes/index.tsx` ein paar Klassennamen, die noch fehlen, ohne sonst etwas am Layout zu ändern:

- Nav-CTA-Label aufsplitten: `<span className="landing-nav-cta-label">Plattform starten</span><span className="landing-nav-cta-short">Start</span>` (Short-Span standardmäßig `display:none`, im 900-Block umgekehrt).
- Comparison-Tabelle: Header-Row bekommt `landing-compare-head`, die einzelnen Zellen `l-compare-task`, `l-compare-solo`, `l-compare-mf` (für die `::before`-Labels).
- Plattform-Pill in der Nav bekommt `landing-nav-pill`, damit sie gezielt versteckt werden kann (heute fällt sie unter `landing-nav-links`).
- Chaos-Cloud-Wrapper bekommt `landing-chaos-cloud`, statt per `min-height:480` selektiert zu werden.

### 3. Verifikation

Nach dem Edit:
- Build-Output prüfen.
- Im Preview Viewport 390 × 720 (jetziger State) durchscrollen und mit `screens/mobile/01..12` vergleichen.
- Zusätzlich Tablet (820/834 px) screenshotten und prüfen, dass 2-Spalter-Stacks und Marketplace `2×4` passen.

## Out of scope

- Keine Änderungen an Desktop-Layout, Inhalten, Co-Pilot-Edge-Function, anderen Routen, `__root.tsx`, `ServiceTile`, `styles.css`.
- Keine neuen Komponenten, keine neuen Assets.
