// @ts-nocheck
/* eslint-disable */
import React from "react";

// matchfoundr · brand atoms — reusable across the brand book and applications.

export const MF_BRAND = {
  // ── Color tokens ──
  ink:         '#15140f',  // primary type, dark surfaces
  inkSoft:     '#2A251F',  // alt dark surface
  smoke:       '#6B635A',  // body text on cream
  ember:       '#E2511C',  // primary accent
  emberDeep:   '#B23B0E',  // pressed state
  emberLight:  '#F0843A',  // hover / tint
  emberTint:   '#FCE4D5',  // tinted background
  cream:       '#FBFAF7',  // primary surface
  paper:       '#F3EFE6',  // secondary surface
  ruled:       'rgba(21,20,15,0.10)',

  // ── Type ──
  fontSans:    '"Geist", "Manrope", -apple-system, system-ui, sans-serif',
  fontMono:    '"Geist Mono", "JetBrains Mono", ui-monospace, monospace',
  fontSerif:   '"Instrument Serif", Georgia, serif',
};

const M = MF_BRAND;

// ────────────────────────────────────────────────────────────────────────────
// IconMF — the Converge mark. Two chevrons converging on a single point.
// Ink path on the left, ember path on the right, meeting at a single dot —
// two co-founders, one company.
// ────────────────────────────────────────────────────────────────────────────
export function IconMF({
  size = 100,
  color,
  spark,
  showSpark = true,
  block = true,
}) {
  const c = color || M.ink;
  const sp = spark || M.ember;
  // Native viewBox is 140 × 100 (aspect 1.4 : 1). `size` is the height.
  const isNum = typeof size === 'number';
  const h = size;
  const w = isNum ? size * 1.4 : size;
  return (
    <svg width={w} height={h} viewBox="0 0 140 100" fill="none"
         style={block ? { display: 'block', aspectRatio: '1.4 / 1' } : { aspectRatio: '1.4 / 1' }}>
      {/* Left chevron — your path */}
      <path d="M8 14 L62 50 L8 86"
            stroke={c} strokeWidth="14"
            strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* Right chevron — their path */}
      <path d="M132 14 L78 50 L132 86"
            stroke={sp} strokeWidth="14"
            strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* The meeting point */}
      {showSpark && <circle cx="70" cy="50" r="6" fill={c}/>}
    </svg>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Wordmark — Strike style. Geist Bold lowercase + ember dot.
// ────────────────────────────────────────────────────────────────────────────
export function Wordmark({
  size = 44,
  color,
  dot,
  showDot = true,
  includeDomain = false,
}) {
  const c = color || M.ink;
  const d = dot || M.ember;
  return (
    <span style={{
      fontFamily: M.fontSans,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: '-0.035em',
      color: c,
      lineHeight: 1,
      whiteSpace: 'nowrap',
    }}>
      matchfoundr{showDot && <span style={{ color: d }}>.</span>}
      {includeDomain && <span style={{ color: c, opacity: 0.4, fontWeight: 500 }}>com</span>}
    </span>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Lockup — icon + wordmark side by side, with optional stacked layout.
// ────────────────────────────────────────────────────────────────────────────
export function Lockup({
  layout = 'horizontal', // 'horizontal' | 'stacked'
  size = 32,             // icon height
  color,
  spark,
  gap,
}) {
  const c = color || M.ink;
  const sp = spark || M.ember;
  const wordSize = size * 1.05;
  if (layout === 'stacked') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: gap ?? size * 0.4,
      }}>
        <IconMF size={size * 1.4} color={c} spark={sp} />
        <Wordmark size={wordSize} color={c} dot={sp} />
      </div>
    );
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      gap: gap ?? size * 0.45,
    }}>
      <IconMF size={size} color={c} spark={sp} />
      <Wordmark size={wordSize} color={c} dot={sp} />
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// AppIcon — ember rounded square containing the converge mark in cream.
// ────────────────────────────────────────────────────────────────────────────
export function AppIcon({ size = 96, radius, bg, fg, spark, shadow = true }) {
  const r = radius ?? size * 0.225;
  const b = bg || M.ember;
  const f = fg || M.cream;
  // On the ember app-icon, both chevrons are cream — the dot stays cream too
  // so the mark reads as one quiet, recognizable shape at favicon sizes.
  const sp = spark || f;
  return (
    <div style={{
      width: size, height: size, borderRadius: r, background: b,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: shadow ? `0 ${size*0.04}px ${size*0.18}px rgba(178,59,14,0.28), inset 0 1px 0 rgba(255,255,255,0.15)` : 'none',
    }}>
      <IconMF size={size * 0.5} color={f} spark={sp} />
    </div>
  );
};
