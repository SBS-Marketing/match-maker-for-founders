# Rebrand auf das matchfoundr Brand Book

Aktuell läuft die App in einem dunklen Theme mit grünem Akzent. Das Brand Book (`brand/brand-book.html`) definiert dagegen ein helles, redaktionelles System: warmes Cream als Bühne, schwarze Ink-Typo, Ember-Orange als einziger Akzent, plus ein klares Logo aus zwei Chevrons mit zentralem Punkt.

## Was sich ändert

### 1. Farb-Tokens (`src/styles.css`)
Die OKLCH-Token werden auf die Brand-Book-Palette gemappt, Default = hell:

```text
Ink         #15140f  → --foreground
Ink Soft    #2A251F  → dunkle Surface-Varianten
Smoke       #6B635A  → --muted-foreground
Ember 500   #E2511C  → --primary, --ring
Ember Deep  #B23B0E  → primary-hover
Ember Light #F0843A  → highlight
Ember Tint  #FCE4D5  → soft-badge-bg
Cream       #FBFAF7  → --background
Paper       #F3EFE6  → --card, --muted, --secondary
Ruled       rgba(21,20,15,0.10) → --border, --input
```

Dark-Variante ist im Brand Book nicht vorgesehen → entfällt zunächst.

### 2. Typografie
- Google-Fonts via `<link>` in `__root.tsx`: **Geist** (400–800), **Geist Mono** (400–600), **Instrument Serif** (regular + italic).
- Tokens: `--font-sans: "Geist"`, neu `--font-mono: "Geist Mono"`, `--font-serif: "Instrument Serif"`.
- Headlines: Geist 600/700, tight tracking (`-0.035em`).
- Editorial-Akzente (Hero-Kicker, Zitate): Instrument Serif italic.
- Labels / Eyebrows: Geist Mono uppercase, `letter-spacing: 0.18em`.

### 3. Logo-Komponente
Neue `src/components/Logo.tsx` direkt aus dem Brand Book portiert:
- `<IconMF />` — SVG, zwei Chevrons (links Ink, rechts Ember) + Ink-Dot in der Mitte, viewBox `0 0 140 100`.
- `<Wordmark />` — „matchfoundr" in Geist 700, `-0.035em`, mit Ember-Punkt.
- `<Lockup layout="horizontal|stacked" />` — Kombi für Nav/Hero/Auth.
- Einsatz: `AppNav` (klein, horizontal), Landing-Hero (groß), Auth-Seite (stacked).
- Favicon-SVG aus `IconMF` nach `public/favicon.svg`, im Root-Head verlinkt.

### 4. Seiten-Anpassungen (rein visuell, keine Logik)
- **Landing (`/`)**: Cream-Hintergrund, riesige Wordmark + Icon im Hero, Instrument-Serif-Kicker, Ember nur für CTA und den Punkt, Mono-Eyebrows („01 · DIE PLATTFORM") wie im Brand Book.
- **`AppNav`**: Cream-Bg, dünner ruled Border-Bottom, Logo links, Links in Ink/Smoke.
- **Auth, Onboarding, Discover, Matches, Profile, Chat**: shadcn-Komponenten erben automatisch über die Tokens. Manuell harte Farbklassen (`text-white`, explizite Hex) ersetzen. Cards bekommen `--paper`-Surface, dünne ruled Borders, etwas größere Radii (16–20px).
- **Buttons**: Primary = Ember auf Cream → Hover = Ember Deep. Sekundär = Ink-Outline.

### 5. Was unangetastet bleibt
- Routing, Supabase-Schema, Auth-Flow (Email + Google + Apple), Matching-Logik, Realtime-Chat.
- shadcn-Komponenten-API — nur Tokens ändern sich.
- Keine neuen Pakete (Fonts via Google CDN).

## Reihenfolge
1. `styles.css` Tokens + Font-Imports
2. `Logo.tsx` Komponente + Favicon
3. `__root.tsx` Head (Fonts, Favicon)
4. `AppNav` + Landing umstylen
5. Restliche Routen auf Token-Konsistenz prüfen
6. Visuell QA auf `/`, `/auth`, `/discover`

Sag Bescheid, wenn ich loslegen soll — oder ob du an einzelnen Punkten (z. B. zusätzlich Dark-Variante, andere Akzent-Dosierung) nachjustieren willst.
