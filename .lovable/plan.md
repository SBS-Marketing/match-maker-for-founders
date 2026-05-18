## Ziel
Auf Mobile und Tablet sollen der „Start"-CTA und das Hamburger-Icon ganz rechts in der Navbar sitzen (aktuell kleben sie an der Brand, weil der Spacer auf kleinen Screens versteckt ist).

## Änderung
In `src/routes/index.tsx`, im `RESPONSIVE_CSS`-Block (Mobile/Tablet-Media-Query):

- `.landing-nav-spacer` nicht mehr `display: none` setzen — stattdessen sichtbar lassen mit `flex: 1`, damit Brand links und CTA + Burger rechts auseinandergedrückt werden.
- Alternativ: `margin-left: auto` auf `.landing-nav-cta` setzen (gleicher Effekt, robuster falls Spacer sonstwo gebraucht wird).

Keine Änderung an Desktop-Layout, Farben, Padding oder Dropdown.

## Ergebnis
Mobile/Tablet Navbar: `[Logo + beta] ················ [Start] [☰]`