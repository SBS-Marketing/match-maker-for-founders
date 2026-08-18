// @ts-nocheck
/* eslint-disable */
import React from "react";
import { MF_BRAND } from "./brand";

// matchfoundr · site snapshots — shared atoms: backdrop, glass styles, icons.

const MB = MF_BRAND;

// ── Glass surfaces ─────────────────────────────────────────────────────────
export const MF_GLASS = {
  // Translucent cream pane — primary glass surface
  pane: {
    background: 'rgba(251,250,247,0.62)',
    backdropFilter: 'blur(28px) saturate(140%)',
    WebkitBackdropFilter: 'blur(28px) saturate(140%)',
    border: '1px solid rgba(255,255,255,0.7)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.85), ' +
      'inset 0 0 0 1px rgba(255,255,255,0.18), ' +
      '0 30px 60px -24px rgba(21,20,15,0.18), ' +
      '0 2px 6px rgba(21,20,15,0.04)',
    borderRadius: 24,
  },
  // Lighter pane (cards inside cards)
  paneSoft: {
    background: 'rgba(251,250,247,0.45)',
    backdropFilter: 'blur(18px) saturate(130%)',
    WebkitBackdropFilter: 'blur(18px) saturate(130%)',
    border: '1px solid rgba(255,255,255,0.55)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.7), ' +
      '0 8px 24px -10px rgba(21,20,15,0.10)',
    borderRadius: 18,
  },
  // Pill/chip glass — sized down for nav, tags
  pill: {
    background: 'rgba(251,250,247,0.55)',
    backdropFilter: 'blur(16px) saturate(140%)',
    WebkitBackdropFilter: 'blur(16px) saturate(140%)',
    border: '1px solid rgba(255,255,255,0.65)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.8), ' +
      '0 6px 18px -8px rgba(21,20,15,0.12)',
    borderRadius: 999,
  },
  // Ink-tinted glass for dark surfaces
  paneInk: {
    background: 'rgba(21,20,15,0.55)',
    backdropFilter: 'blur(24px) saturate(140%)',
    WebkitBackdropFilter: 'blur(24px) saturate(140%)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.08), ' +
      '0 20px 50px -20px rgba(0,0,0,0.4)',
    borderRadius: 20,
    color: MB.cream,
  },
  // Ember-tinted glass — for CTA emphasis cards
  paneEmber: {
    background: 'rgba(226,81,28,0.78)',
    backdropFilter: 'blur(24px) saturate(140%)',
    WebkitBackdropFilter: 'blur(24px) saturate(140%)',
    border: '1px solid rgba(255,200,170,0.5)',
    boxShadow:
      'inset 0 1px 0 rgba(255,220,200,0.6), ' +
      '0 24px 50px -16px rgba(178,59,14,0.35)',
    borderRadius: 20,
    color: MB.cream,
  },
};

// ── Warm sunrise backdrop with light blobs + faint grid ────────────────────
export function PageBackdrop({ children, variant = 'sunrise' }) {
  // Variants set the ambient color story. Glass panes pick this up.
  const variants = {
    sunrise: {
      base: '#F3EFE6',
      blobs: [
        // top-right ember sun
        { w: '70%', h: '85%', top: '-25%', right: '-15%',
          color: 'rgba(226,81,28,0.42)' , blur: 70 },
        // bottom-left peach
        { w: '60%', h: '70%', bottom: '-20%', left: '-15%',
          color: 'rgba(240,132,58,0.32)', blur: 90 },
        // center cream halo
        { w: '55%', h: '60%', top: '25%', left: '18%',
          color: 'rgba(252,228,213,0.65)', blur: 100 },
        // small deep ember accent, top-left
        { w: '28%', h: '32%', top: '8%', left: '-5%',
          color: 'rgba(178,59,14,0.22)', blur: 80 },
      ],
    },
    dusk: {
      base: '#1f1b16',
      blobs: [
        { w: '70%', h: '85%', top: '-25%', left: '-15%',
          color: 'rgba(226,81,28,0.55)', blur: 90 },
        { w: '55%', h: '60%', bottom: '-20%', right: '-10%',
          color: 'rgba(240,132,58,0.30)', blur: 100 },
        { w: '40%', h: '50%', top: '30%', right: '15%',
          color: 'rgba(252,228,213,0.20)', blur: 110 },
      ],
    },
  };
  const v = variants[variant];
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: v.base, overflow: 'hidden',
    }}>
      {v.blobs.map((b, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: b.w, height: b.h,
          top: b.top, right: b.right, bottom: b.bottom, left: b.left,
          background: `radial-gradient(circle at center, ${b.color}, transparent 65%)`,
          filter: `blur(${b.blur}px)`,
          pointerEvents: 'none',
        }}/>
      ))}
      {/* faint baseline grid — gives glass something to refract */}
      <div style={{
        position: 'absolute', inset: 0, opacity: variant === 'dusk' ? 0.06 : 0.045,
        backgroundImage:
          `linear-gradient(${variant === 'dusk' ? 'rgba(255,255,255,1)' : 'rgba(21,20,15,1)'} 1px, transparent 1px),` +
          `linear-gradient(90deg, ${variant === 'dusk' ? 'rgba(255,255,255,1)' : 'rgba(21,20,15,1)'} 1px, transparent 1px)`,
        backgroundSize: '56px 56px',
        pointerEvents: 'none',
      }}/>
      {/* film grain via SVG noise */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.35, mixBlendMode: 'overlay',
        pointerEvents: 'none',
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
      }}/>
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        {children}
      </div>
    </div>
  );
};

// ── Mini icons (stroke, 1.6) ───────────────────────────────────────────────
export function MFIcon({ name, size = 18, color = 'currentColor', stroke = 1.6 }) {
  const p = {
    search:    <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    filter:    <><path d="M4 6h16M7 12h10M10 18h4"/></>,
    bolt:      <><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></>,
    check:     <><path d="m5 12 5 5L20 7"/></>,
    arrow:     <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    plus:      <><path d="M12 5v14M5 12h14"/></>,
    chat:      <><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12Z"/></>,
    pin:       <><path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/></>,
    link:      <><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>,
    star:      <><path d="m12 3 2.9 6 6.6.9-4.8 4.6 1.2 6.6L12 18l-5.9 3.1L7.3 14.5 2.5 9.9 9.1 9 12 3Z"/></>,
    dots:      <><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></>,
    bell:      <><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8Z"/><path d="M10 21a2 2 0 0 0 4 0"/></>,
    user:      <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    inbox:     <><path d="M3 13h5l1 3h6l1-3h5"/><path d="M5 5h14l2 8v6H3v-6l2-8Z"/></>,
    sliders:   <><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h14M18 18h2"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/></>,
    globe:     <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
    send:      <><path d="m4 12 16-8-4 18-4-7-8-3Z"/></>,
    smile:     <><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="10" r=".8" fill="currentColor"/><circle cx="15" cy="10" r=".8" fill="currentColor"/></>,
    paperclip: <><path d="M21 12 12 21a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8"/></>,
    book:      <><path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4Z"/><path d="M20 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8Z"/></>,
    spark:     <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
         style={{ display: 'inline-block', flexShrink: 0 }}>
      {p[name] || null}
    </svg>
  );
};

// ── Avatar — initials on a hashed warm color ───────────────────────────────
export function MFAvatar({ name = 'AB', size = 44, ring = false }) {
  // Hash to a brand-safe hue (no neon blues)
  const palette = [
    '#E2511C', '#B23B0E', '#2A251F', '#6B635A',
    '#F0843A', '#8B5A3C', '#3D5A4A', '#5A4A2A',
  ];
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const bg = palette[h % palette.length];
  const initials = name.split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: MB.cream,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: MB.fontSans, fontWeight: 600, fontSize: size * 0.4,
      letterSpacing: '-0.02em', flexShrink: 0,
      boxShadow: ring
        ? `inset 0 0 0 2px rgba(255,255,255,0.5), 0 0 0 3px ${MB.cream}, 0 0 0 4px ${bg}`
        : 'inset 0 0 0 2px rgba(255,255,255,0.25)',
    }}>{initials}</div>
  );
};

// ── Tiny tag pill ──────────────────────────────────────────────────────────
export function MFTag({ children, kind = 'default' }) {
  const styles = {
    default: { bg: 'rgba(21,20,15,0.06)', fg: MB.ink, br: 'rgba(21,20,15,0.08)' },
    ember:   { bg: 'rgba(226,81,28,0.12)', fg: MB.emberDeep, br: 'rgba(226,81,28,0.25)' },
    glass:   { bg: 'rgba(251,250,247,0.6)', fg: MB.ink, br: 'rgba(255,255,255,0.7)' },
  };
  const s = styles[kind];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999,
      background: s.bg, color: s.fg, border: `1px solid ${s.br}`,
      fontFamily: MB.fontSans, fontSize: 12, fontWeight: 500,
      letterSpacing: '-0.005em',
      backdropFilter: 'blur(8px)',
    }}>{children}</span>
  );
};
