# Mobile-Responsive Fixes: Sections 04, 05, 10

Drei Sections kollabieren auf Mobile (≤640px) nicht korrekt, weil ihre äußeren Grid-Container keine CSS-Klassen-Hooks haben und die bestehenden `[style*="..."]` Selektoren wegen DOM-Normalisierung nicht greifen.

## Änderungen in `src/routes/index.tsx`

### 1. JSX: Klassen-Hooks ergänzen

**04 · Der Co-Pilot** (`LCoPilotMoment`, ~Zeile 1542)
- Äußeres Grid `0.9fr 1.1fr` → Klasse `landing-two-col landing-section-inner` hinzufügen.

**05 · Förderung** (`LFunding`, ~Zeile 1863)
- Äußeres Grid → Klasse `landing-two-col landing-section-inner` hinzufügen.
- `€2.4M` Zahl → Klasse `landing-funding-bignum` hinzufügen.

**10 · Anfangen** (`LCta`, ~Zeile 2701)
- Falsch platzierte Klasse `landing-cta-grid` vom inneren Voice-Memo-Pane entfernen.
- Äußeres Grid `1.1fr 0.9fr` → Klasse `landing-cta-grid landing-section-inner` hinzufügen.
- Action-Wrapper (Buttons) → Klasse `landing-cta-actions`.
- Linkes Pane → Klasse `landing-cta-pane`.

### 2. CSS in `RESPONSIVE_CSS` (~Zeile 3043)

**≤ 900px (Tablet):**
```css
.landing-two-col,
.landing-cta-grid { grid-template-columns: 1fr !important; }
.landing-section-inner { padding: 0 22px !important; gap: 32px !important; }
.landing-funding-bignum { font-size: clamp(72px, 14vw, 140px) !important; line-height: 0.95 !important; }
```

**≤ 640px (Mobile):**
```css
.landing-section-inner { padding: 0 18px !important; gap: 24px !important; }
.landing-cta-pane { padding: 28px !important; }
.landing-cta-actions { flex-wrap: wrap !important; justify-content: flex-start !important; gap: 12px !important; }
.landing-funding-bignum { font-size: clamp(64px, 18vw, 96px) !important; }
```

## Scope

- Nur Frontend / Presentation. Keine Backend-, Content- oder Desktop-Layout-Änderungen.
- Andere Sections bleiben unberührt.
