# Design-Vorlage einführen (Glassmorphism Ember-Sunrise)

Die ZIP enthält ein vollständiges Design-Handoff für matchfoundr: warme „Sunrise"-Hintergründe mit verschwommenen Ember/Pfirsich-Blobs, Grid- und Noise-Overlay, und alle UI-Flächen als frosted-glass Karten (Glassmorphism). Aktuell ist die App eher minimalistisch/Swiss editorial mit harten Border-Linien. Die Marken-Tokens (ember, cream, paper, ink) sind bereits in `src/styles.css` vorhanden — sie werden nur noch passend in Komponenten genutzt.

## Was umgesetzt wird

### 1. Globales Design-Fundament (`src/styles.css`)
- Geist + Instrument Serif + Geist Mono Google-Font Import einbinden (falls noch nicht vollständig)
- Glass-Utility-Klassen anlegen: `.glass-pane`, `.glass-pane-soft`, `.glass-pill`, `.glass-pane-ink`, `.glass-pane-ember` (exakt nach Recipes aus README)
- Schatten- und Radius-Tokens für CTA, Karten, Pills
- `body` darf nicht mehr nur flach `--cream` sein — der Sunrise-Backdrop liegt darunter

### 2. `<PageBackdrop variant="sunrise" | "dusk">` Komponente
- 4 radiale Gradient-Blobs (Ember oben rechts, Pfirsich unten links, Cream-Halo Mitte, Deep-Ember oben links)
- 56px Grid-Overlay bei 4,5% Opacity
- SVG `feTurbulence` Noise bei 35% Opacity, `mix-blend-mode: overlay`
- Fixed im `__root.tsx` hinter dem `<Outlet />` gerendert, damit jede Seite den warmen Hintergrund hat
- Dusk-Variante (dunkel) für Onboarding

### 3. Navigation (`src/components/AppNav.tsx`)
- Wird zur „floating glass-pill" Top-Nav: zentriert, schwebend, mit Logo + Links + Auth-State rechts
- „Anmelden"/„Profil erstellen" CTAs als Ember-Button mit Ember-Schatten

### 4. Landing (`src/routes/index.tsx`)
- Komplett überarbeitet im Stil von Screenshot 01:
  - Zweispaltiges Hero (1.15fr / 0.85fr): links Headline mit Instrument-Serif italic auf „founder", Subhead, primärer Ember-CTA + Glass-Pill Sekundär-CTA, Trust-Strip darunter
  - Rechts: großes `glass-pane` mit Live-Match-Preview (3 verschachtelte `glass-pane-soft` Founder-Zeilen mit Fit-Score)
  - „So funktioniert es" und „Manifest" Sektionen bleiben in der Struktur, werden aber als Glass-Panes statt border-divided Blöcke umgesetzt
  - 4er Stats-Strip in eigener Glass-Pane (Match in 14d / 78% / 8 Cohorts / since 2024)

### 5. Entdecken (`src/routes/entdecken.tsx`)
- Founder-Grid auf Glass-Panes umstellen; erste Karte als `glass-pane-ember` (Highlight)
- Avatar-Initial in Ember-Hash-Farbe, Fit-Score rechts oben (z.B. „94 / 100"), Tag-Chips als Glass-Pills
- CTA-Footer auf Glass-Pane

### 6. Auth (`src/routes/auth.tsx`)
- Card → `glass-pane` mit angepasstem Padding
- Google/Apple Buttons als Glass-Pill mit Logos (wie aktuell), aber auf Glass-Hintergrund

### 7. Onboarding (`src/routes/onboarding.tsx`)
- Dusk-Backdrop, zentrierte Glass-Form-Karte (max-width 880px)
- Mono Step-Caption („03 · Your stage"), Headline mit Instrument-Serif italic Wort
- Option-Cards als Glass-Pane mit Ember-Tint im Selected-State

### 8. Bestehende Seiten leicht anpassen
- `discover.tsx`, `profile.tsx`, `matches.*` bekommen Glass-Pane Treatments für Karten, damit sie sich konsistent zum neuen Look verhalten. Funktionalität bleibt unberührt.

## Was NICHT geändert wird

- Routen-Struktur, Auth-Flow, Supabase-Anbindung, Datenmodelle
- Bestehende deutsche Copy bleibt — nur Hero-Headline bekommt das Italic-„founder"-Treatment im Stil der Vorlage
- Keine neuen Pakete (alles mit Tailwind + CSS-Variablen + Inline-SVG)

## Technische Details

- Glassmorphism setzt `backdrop-filter` voraus; Fallback via solid Cream-Card mit `1px solid var(--ruled)` für Browser ohne Support
- Backdrop-Komponente liegt mit `position: fixed; inset: 0; z-index: 0; pointer-events: none;`, Content bekommt `position: relative; z-index: 1;`
- Logo `IconMF` wird auf die zwei konvergierenden Chevrons + Ember-Dot Variante umgestellt (1.4:1)
- Mono-Captions („01 · Die Plattform" Stil) bleiben — passt zur Vorlage („SETUP · STEP 3 OF 6")

## Vorgehen

Ich starte mit Backdrop + Glass-Utilities + Nav (Fundament), dann Landing als Referenz-Implementation, dann Entdecken/Auth/Onboarding. Discover/Profile/Inbox-Routen passe ich nur visuell an, ohne Logik anzufassen.
