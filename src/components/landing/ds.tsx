// @ts-nocheck
/* eslint-disable */
import React from "react";
import { MFServiceIcon, MF_SERVICE_BY_ID } from "./services";

// matchfoundr · Landing v2 — Designsystem "Warm Signal, Web".
// Zwischen Lovable (ruhig, editorial, warm, großzügig) und ToolTime (typografische
// Wucht, Benefit-Stats, Vertrauen). NUR unsere App-Fonts: Geist + Geist Mono.

export const L2 = {
  canvas:     '#FAF8F3',
  surface:    '#FFFFFF',
  warm:       '#FEFBF6',
  panel:      '#F4EFE7',
  ink:        '#1A1A1A',
  inkSoft:    '#2A251F',
  smoke:      '#6E6862',
  faint:      '#A39C93',
  line:       'rgba(26,26,26,0.09)',
  lineSoft:   'rgba(26,26,26,0.06)',
  ember:      '#E2511C',
  emberDeep:  '#B23B0E',
  emberLight: '#F0843A',
  emberTint:  '#FBE7DB',
  indigo:     '#3756C4',
  indigoDeep: '#26409A',
  indigoTint: '#E7EAF8',
  font:       '"Geist", "Manrope", -apple-system, system-ui, sans-serif',
  mono:       '"Geist Mono", "JetBrains Mono", ui-monospace, monospace',
  shadow:     '0 24px 60px -30px rgba(26,26,26,0.35)',
  shadowSoft: '0 12px 30px -18px rgba(26,26,26,0.22)',
};
const T = L2;

// service hue helper
export const l2hue = (id) => (MF_SERVICE_BY_ID[id] || {}).hue || T.ember;

// ── Shell ──────────────────────────────────────────────────────────────
export function L2Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: T.canvas, color: T.ink,
      fontFamily: T.font, WebkitFontSmoothing: 'antialiased' }}>
      {children}
    </div>
  );
};

// ── Section wrapper ──────────────────────────────────────────────────────
export function L2Section({ tone = 'canvas', pad = '104px 0', id, children, style }) {
  const tones = {
    canvas: { bg: T.canvas, fg: T.ink },
    surface:{ bg: T.surface, fg: T.ink },
    warm:   { bg: T.warm, fg: T.ink },
    panel:  { bg: T.panel, fg: T.ink },
    ink:    { bg: T.ink, fg: '#F5F2EC' },
    indigo: { bg: T.indigo, fg: '#fff' },
    ember:  { bg: T.ember, fg: '#fff' },
  };
  const c = tones[tone];
  return (
    <section id={id} style={{ background: c.bg, color: c.fg, padding: pad, position: 'relative', ...style }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </section>
  );
};

// ── Eyebrow (mono, dash) ───────────────────────────────────────────────
export function L2Eyebrow({ children, color }) {
  const c = color || T.ember;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10,
      fontFamily: T.mono, fontSize: 12, fontWeight: 500, letterSpacing: '0.14em',
      textTransform: 'uppercase', color: c }}>
      <span style={{ width: 18, height: 2, borderRadius: 2, background: c, opacity: 0.55 }}/>
      {children}
    </div>
  );
};

// ── Display heading — Geist, tight. Accent words via <b> (ember/indigo) ──
export function L2H({ children, size = 'clamp(38px, 4.6vw, 62px)', color, style }) {
  return (
    <h2 style={{ margin: 0, fontWeight: 680, fontSize: size, lineHeight: 1.02,
      letterSpacing: '-0.035em', color: color || T.ink, textWrap: 'balance', ...style }}>
      {children}
    </h2>
  );
};

// ── Buttons ──────────────────────────────────────────────────────────────
export function L2Btn({ children, href = '#', kind = 'primary', accent = 'ember', size = 'md' }) {
  // CTAs der Vorlage zeigen auf Platzhalter-Anker — hier auf die echte Anmeldung geroutet.
  if (href === '#cta' || href === '#login') href = '/auth';
  const A = accent === 'indigo' ? T.indigo : T.ember;
  const AD = accent === 'indigo' ? T.indigoDeep : T.emberDeep;
  const pads = { md: '14px 22px', lg: '17px 28px' };
  const styles = {
    primary: { background: A, color: '#fff',
      boxShadow: `0 14px 30px -12px ${AD}, inset 0 1px 0 rgba(255,255,255,0.25)` },
    dark:    { background: T.ink, color: '#F5F2EC' },
    ghost:   { background: T.surface, color: T.ink, border: `1px solid ${T.line}` },
    ghostLight:{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)' },
  };
  return (
    <a href={href} style={{ display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: pads[size], borderRadius: 13, fontWeight: 620, fontSize: size === 'lg' ? 16 : 14.5,
      textDecoration: 'none', letterSpacing: '-0.01em', ...styles[kind] }}>
      {children}
      <MFServiceIcon name="arrowR" size={size === 'lg' ? 16 : 14}
        color={kind === 'primary' ? '#fff' : (kind === 'dark' || kind === 'ghostLight' ? '#F5F2EC' : T.ink)} stroke={2.2}/>
    </a>
  );
};

// ── Product frame — warm rounded card (Lovable-style visual holder) ──────
export function L2Frame({ children, label, accent = 'ember', pad = 0, style }) {
  const A = accent === 'indigo' ? T.indigo : T.ember;
  return (
    <div style={{ borderRadius: 26, background: T.surface, border: `1px solid ${T.line}`,
      boxShadow: T.shadow, overflow: 'hidden', ...style }}>
      {label && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 18px',
          borderBottom: `1px solid ${T.lineSoft}`, background: T.warm }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: A }}/>
          <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: T.smoke }}>{label}</span>
        </div>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </div>
  );
};

// ── Service pill (colored dot + label) ───────────────────────────────────
export function L2ServicePill({ id }) {
  const s = MF_SERVICE_BY_ID[id];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 14px 8px 12px', borderRadius: 999, background: T.surface,
      border: `1px solid ${T.line}`, fontSize: 13.5, fontWeight: 560, color: T.ink }}>
      <span style={{ width: 22, height: 22, borderRadius: 7, background: s.hue,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <MFServiceIcon name={s.icon} size={12} color="#fff" stroke={2.2}/>
      </span>
      {s.label}
    </span>
  );
};
