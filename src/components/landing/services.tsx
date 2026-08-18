// @ts-nocheck
/* eslint-disable */
import React from "react";
import { IconMF, MF_BRAND } from "./brand";
import { MFAvatar, MFIcon, MF_GLASS } from "./glass";

// matchfoundr · founder-platform shared atoms
// Service taxonomy + supporting components for the broader platform pivot.

const PB = MF_BRAND;

// ── Service taxonomy ─────────────────────────────────────────────────────
// Everything a founder needs, matched by AI.
export const MF_SERVICES = [
  {
    id: 'cofounder',
    label: 'Co-Founder',
    short: 'Co-Founder',
    blurb: 'Der Mensch, mit dem du baust.',
    count: 412,
    hue: '#E2511C',
    icon: 'people',
  },
  {
    id: 'legal',
    label: 'Recht & Verträge',
    short: 'Recht',
    blurb: 'Anwälte für Gründung, IP, ESOP, Cap Table.',
    count: 86,
    hue: '#3D5A4A',
    icon: 'gavel',
  },
  {
    id: 'tax',
    label: 'Steuer & Buchhaltung',
    short: 'Steuer',
    blurb: 'Steuerberater, die Startups verstehen.',
    count: 64,
    hue: '#8B5A3C',
    icon: 'ledger',
  },
  {
    id: 'funding',
    label: 'Förderprogramme',
    short: 'Förderung',
    blurb: 'EXIST, ProFIT, INVEST. Live-Matching.',
    count: 31,
    hue: '#B23B0E',
    icon: 'seal',
  },
  {
    id: 'capital',
    label: 'Kapital & Investoren',
    short: 'Kapital',
    blurb: 'Pre-Seed, Angels, Family Offices.',
    count: 214,
    hue: '#2A251F',
    icon: 'arrow-up',
  },
  {
    id: 'mentor',
    label: 'Mentoren & Advisor',
    short: 'Mentor',
    blurb: 'Operator, die das schon gebaut haben.',
    count: 178,
    hue: '#F0843A',
    icon: 'compass',
  },
  {
    id: 'talent',
    label: 'Talent & Hires',
    short: 'Talent',
    blurb: 'Erste fünf Hires. Vorgefiltert.',
    count: 540,
    hue: '#5A4A2A',
    icon: 'spark2',
  },
  {
    id: 'growth',
    label: 'Growth & GTM',
    short: 'Growth',
    blurb: 'GTM-Operator, PR, Performance, SEO.',
    count: 122,
    hue: '#6B635A',
    icon: 'pulse',
  },
];

export const MF_SERVICE_BY_ID = Object.fromEntries(MF_SERVICES.map(s => [s.id, s]));

// ── Service-icon system ──────────────────────────────────────────────────
// Small stroked glyphs distinct from MFIcon, used for category chips.
export function MFServiceIcon({ name, size = 18, color = 'currentColor', stroke = 1.7 }) {
  const p = {
    people:    <><circle cx="8" cy="9" r="3.2"/><circle cx="16" cy="9" r="3.2"/><path d="M2.5 19c.7-3 3-4.5 5.5-4.5s4.8 1.5 5.5 4.5M11.5 19c.7-3 3-4.5 5.5-4.5s4.5 1.5 5 4.5"/></>,
    gavel:     <><path d="m4 18 7-7M9.5 15.5 17 8M6 6l8 8M13 2l8 8M3 22h10"/></>,
    ledger:    <><path d="M5 3h11l3 3v15H5Z"/><path d="M9 8h7M9 12h7M9 16h4"/></>,
    seal:      <><path d="m12 2 2.4 1.7 2.9-.5.9 2.8 2.5 1.6-.5 2.9 1.7 2.4-1.7 2.4.5 2.9-2.5 1.6-.9 2.8-2.9-.5L12 22l-2.4-1.7-2.9.5-.9-2.8L3.3 16.4 3.8 13.5 2.1 11.1 3.8 8.7 3.3 5.8l2.5-1.6.9-2.8 2.9.5Z"/><path d="m9 12 2 2 4-4"/></>,
    'arrow-up': <><path d="M5 21v-7a7 7 0 0 1 14 0v7M9 9l3-4 3 4"/></>,
    compass:   <><circle cx="12" cy="12" r="9"/><path d="m15 9-2 5-5 2 2-5 5-2Z"/></>,
    spark2:    <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6 7.7 7.7M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3"/></>,
    pulse:     <><path d="M3 12h4l2-6 4 12 2-6h6"/></>,
    spark:     <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>,
    wand:      <><path d="M15 4 4 15l3 3L18 7Z"/><path d="M14 5h3v3M19 11v2M21 12h-2M18 15v2M20 17h-2"/></>,
    sparkles:  <><path d="M5 3v4M3 5h4M19 14v6M16 17h6M11 4l1.5 4.5L17 10l-4.5 1.5L11 16l-1.5-4.5L5 10l4.5-1.5Z"/></>,
    layers:    <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5M3 18l9 5 9-5"/></>,
    target:    <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></>,
    flag:      <><path d="M5 21V3M5 4h12l-2 4 2 4H5"/></>,
    rocket:    <><path d="M14 4c4 0 6 2 6 6 0 5-7 11-7 11s-7-6-7-11c0-4 2-6 6-6"/><circle cx="12" cy="10" r="2"/><path d="m9 19-2 3M15 19l2 3"/></>,
    coins:     <><ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3M3 12v5c0 1.7 2.7 3 6 3"/><ellipse cx="15" cy="14" rx="6" ry="3"/><path d="M9 14v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/></>,
    play:      <><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z" fill="currentColor"/></>,
    sparkle:   <><path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18"/></>,
    cal:       <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
    clock:     <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    shield:    <><path d="m12 3 8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z"/></>,
    note:      <><path d="M5 4h11l3 3v13H5Z"/><path d="M16 4v3h3"/></>,
    check2:    <><path d="m5 12 5 5L20 7"/></>,
    plus2:     <><path d="M12 5v14M5 12h14"/></>,
    arrowR:    <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    arrowDR:   <><path d="M7 7h10v10M7 17 17 7"/></>,
    money:     <><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9h.01M18 15h.01"/></>,
    mic:       <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
         style={{ display: 'inline-block', flexShrink: 0 }}>
      {p[name] || null}
    </svg>
  );
};

// ── Service category chip ────────────────────────────────────────────────
export function MFServiceChip({ service, size = 'sm' }) {
  const s = service;
  const small = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: small ? 6 : 8,
      padding: small ? '4px 10px 4px 6px' : '6px 14px 6px 8px',
      borderRadius: 999,
      background: 'rgba(255,255,255,0.55)',
      border: '1px solid rgba(21,20,15,0.08)',
      fontFamily: PB.fontSans, fontSize: small ? 11.5 : 13, fontWeight: 500,
      color: PB.ink, letterSpacing: '-0.005em',
      backdropFilter: 'blur(8px)',
    }}>
      <span style={{
        width: small ? 18 : 22, height: small ? 18 : 22, borderRadius: '50%',
        background: s.hue, color: PB.cream,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25)',
      }}>
        <MFServiceIcon name={s.icon} size={small ? 11 : 13} color={PB.cream} stroke={2}/>
      </span>
      {s.short}
    </span>
  );
};

// ── Service tile (used in marketplace + landing constellation) ───────────
export function MFServiceTile({ service, compact = false, accented = false }) {
  const s = service;
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      padding: compact ? 16 : 22,
      borderRadius: compact ? 16 : 20,
      background: accented
        ? `linear-gradient(155deg, ${s.hue}f2, ${s.hue}cc)`
        : 'rgba(251,250,247,0.62)',
      backdropFilter: 'blur(22px) saturate(140%)',
      WebkitBackdropFilter: 'blur(22px) saturate(140%)',
      border: accented
        ? '1px solid rgba(255,230,210,0.4)'
        : '1px solid rgba(255,255,255,0.7)',
      boxShadow: accented
        ? `0 18px 36px -14px ${s.hue}66, inset 0 1px 0 rgba(255,255,255,0.3)`
        : 'inset 0 1px 0 rgba(255,255,255,0.85), 0 14px 32px -16px rgba(21,20,15,0.18)',
      color: accented ? PB.cream : PB.ink,
      display: 'flex', flexDirection: 'column', gap: compact ? 8 : 12,
      minHeight: compact ? 100 : 150,
    }}>
      {/* large background glyph */}
      <div style={{
        position: 'absolute', right: -10, bottom: -14, opacity: accented ? 0.18 : 0.07,
        pointerEvents: 'none', color: accented ? PB.cream : s.hue,
      }}>
        <MFServiceIcon name={s.icon} size={compact ? 100 : 130} stroke={1.4} />
      </div>

      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: compact ? 30 : 36, height: compact ? 30 : 36, borderRadius: 10,
        background: accented ? 'rgba(255,255,255,0.18)' : s.hue,
        border: accented ? '1px solid rgba(255,255,255,0.25)' : 'none',
        color: PB.cream,
        boxShadow: accented ? 'none' : `0 6px 14px -6px ${s.hue}aa`,
      }}>
        <MFServiceIcon name={s.icon} size={compact ? 16 : 19} color={PB.cream} stroke={2}/>
      </div>

      <div style={{
        fontFamily: PB.fontSans, fontWeight: 600,
        fontSize: compact ? 15 : 19, letterSpacing: '-0.02em', lineHeight: 1.1,
      }}>{s.label}</div>

      {!compact && (
        <div style={{
          fontSize: 13, lineHeight: 1.45,
          color: accented ? 'rgba(255,255,255,0.82)' : PB.smoke,
          textWrap: 'pretty',
        }}>{s.blurb}</div>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: PB.fontMono, fontSize: 10.5, letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: accented ? 'rgba(255,255,255,0.7)' : PB.smoke,
        }}>
          {s.count} aktiv
        </span>
        <MFServiceIcon name="arrowR" size={14} color={accented ? PB.cream : PB.ink} stroke={2}/>
      </div>
    </div>
  );
};

// ── Translucent nav for the broader platform ─────────────────────────────
// Items reflect the new product surface area.
export function MFPlatformNav({ active = 'Marketplace', auth = false }) {
  const G = MF_GLASS;
  const items = ['Marketplace', 'Co-Pilot', 'Pipeline', 'Beratung'];
  return (
    <div style={{
      ...G.pill, padding: '8px 8px 8px 18px',
      display: 'flex', alignItems: 'center', gap: 28,
      fontFamily: PB.fontSans,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconMF size={22} />
        <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em', color: PB.ink }}>
          matchfoundr<span style={{ color: PB.ember }}>.</span>
        </span>
        <span style={{
          marginLeft: 4, padding: '2px 7px', borderRadius: 6,
          background: 'rgba(21,20,15,0.06)', border: '1px solid rgba(21,20,15,0.08)',
          fontFamily: PB.fontMono, fontSize: 9.5, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: PB.smoke,
        }}>platform</span>
      </div>
      <nav style={{ display: 'flex', gap: 22 }}>
        {items.map(t => (
          <span key={t} style={{
            fontSize: 13, fontWeight: 500, letterSpacing: '-0.005em',
            color: t === active ? PB.ink : PB.smoke,
            position: 'relative', paddingBottom: 2,
            borderBottom: t === active ? `1.5px solid ${PB.ember}` : '1.5px solid transparent',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            {t === 'Co-Pilot' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3D9970' }}/>}
            {t}
          </span>
        ))}
      </nav>
      <div style={{ flex: 1 }}/>
      <div style={{
        ...G.pill, padding: '6px 12px 6px 10px', display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 12, color: PB.smoke,
      }}>
        <MFIcon name="search" size={13} color={PB.smoke}/>
        Frag den Co-Pilot…
        <span style={{
          marginLeft: 6, padding: '1px 6px', borderRadius: 5,
          background: 'rgba(21,20,15,0.07)', fontFamily: PB.fontMono, fontSize: 10, color: PB.smoke,
        }}>⌘K</span>
      </div>
      {auth ? (
        <>
          <MFIcon name="bell" size={18} color={PB.smoke} />
          <MFAvatar name="Lena Hoffmann" size={32} />
        </>
      ) : (
        <button style={{
          border: 'none', cursor: 'pointer',
          background: PB.ink, color: PB.cream,
          padding: '9px 16px', borderRadius: 999,
          fontFamily: PB.fontSans, fontWeight: 600, fontSize: 13,
          boxShadow: '0 4px 12px rgba(21,20,15,0.18)',
        }}>Plattform starten</button>
      )}
    </div>
  );
};

// ── Fit ring (used on advisor / grant cards) ─────────────────────────────
export function MFFitRing({ score = 90, size = 56, color, label = 'Fit' }) {
  const c = color || PB.ember;
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div style={{
      width: size, height: size, position: 'relative',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width={size} height={size} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
                stroke="rgba(21,20,15,0.08)" strokeWidth="3"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
                stroke={c} strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${dash} ${circ - dash}`}/>
      </svg>
      <div style={{
        textAlign: 'center', position: 'relative',
        fontFamily: PB.fontSans,
      }}>
        <div style={{ fontSize: size * 0.32, fontWeight: 600, letterSpacing: '-0.02em', color: PB.ink, lineHeight: 1 }}>{score}</div>
        <div style={{ fontFamily: PB.fontMono, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: PB.smoke, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
};

// ── AI inline tag (small "AI" pill) ──────────────────────────────────────
export function MFAITag({ children = 'AI', muted = false }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px 2px 6px', borderRadius: 999,
      background: muted ? 'rgba(21,20,15,0.06)' : 'rgba(226,81,28,0.12)',
      color: muted ? PB.smoke : PB.emberDeep,
      border: '1px solid ' + (muted ? 'rgba(21,20,15,0.08)' : 'rgba(226,81,28,0.22)'),
      fontFamily: PB.fontMono, fontSize: 10, letterSpacing: '0.1em',
      textTransform: 'uppercase', fontWeight: 600,
    }}>
      <MFServiceIcon name="sparkles" size={10} color={muted ? PB.smoke : PB.emberDeep} stroke={2.2}/>
      {children}
    </span>
  );
};
