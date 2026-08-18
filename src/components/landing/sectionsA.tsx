// @ts-nocheck
/* eslint-disable */
import React from "react";
import { IconMF } from "./brand";
import { L2, L2Btn, L2Eyebrow, L2Frame, L2H, L2Section } from "./ds";
import { MFAITag, MFServiceIcon, MF_SERVICES, MF_SERVICE_BY_ID } from "./services";
import { MFAvatar } from "./glass";
import { MFDot, MFWordmarkDot } from "./mascot";

// matchfoundr · Landing v2 — A: Nav · Hero · Trust · Benefit-Stats · Feature-Rows

const T = L2;

// ── Nav ──────────────────────────────────────────────────────────────────
export function L2Nav() {
  const items = [
    { t: 'Community', href: '#community' },
    { t: 'Marketplace', href: '#marketplace' },
    { t: 'Co-Pilot', href: '#copilot' },
    { t: 'MCP', href: '#connect' },
    { t: 'Preise', href: '#pricing' },
  ];
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(250,248,243,0.82)',
      backdropFilter: 'blur(14px)', borderBottom: `1px solid ${T.lineSoft}` }}>
      <div className="l2-nav" style={{ maxWidth: 1200, margin: '0 auto', padding: '14px 40px',
        display: 'flex', alignItems: 'center', gap: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <IconMF size={22}/>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.03em' }}>
            matchfoundr<MFWordmarkDot/>
          </span>
        </div>
        <nav className="l2-nav-items" style={{ display: 'flex', gap: 26 }}>
          {items.map(i => (
            <a key={i.t} href={i.href} style={{ fontSize: 14, fontWeight: 500, color: T.smoke,
              textDecoration: 'none', letterSpacing: '-0.01em' }}>{i.t}</a>
          ))}
        </nav>
        <div style={{ flex: 1 }}/>
        <a className="l2-signin" href="#login" style={{ fontSize: 14, fontWeight: 500, color: T.smoke, textDecoration: 'none' }}>Anmelden</a>
        <L2Btn href="#cta" kind="dark">Kostenlos starten</L2Btn>
      </div>
    </div>
  );
};

// ── Hero ───────────────────────────────────────────────────────────────
export function L2Hero() {
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* soft warm glow */}
      <div style={{ position: 'absolute', top: -260, right: -160, width: 720, height: 720,
        background: `radial-gradient(circle at center, ${T.emberTint}, transparent 66%)`,
        filter: 'blur(30px)', pointerEvents: 'none', opacity: 0.85 }}/>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '86px 40px 40px',
        display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 60, alignItems: 'center',
        position: 'relative' }} className="l2-hero-grid">
        {/* left */}
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 26,
            padding: '7px 14px 7px 8px', borderRadius: 999, background: T.surface,
            border: `1px solid ${T.line}`, fontSize: 12.5 }}>
            <span style={{ background: T.ink, color: '#F5F2EC', borderRadius: 999, padding: '3px 9px',
              fontFamily: T.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Neu</span>
            <span style={{ color: T.smoke, fontWeight: 500 }}>412 Founder bauen schon gemeinsam</span>
          </div>

          <L2H size="clamp(46px, 6vw, 84px)" style={{ lineHeight: 0.98 }}>
            Alles fürs Gründen.<br/>
            An einem Ort.<br/>
            <span style={{ color: T.ember }}>Gemeinsam</span><MFDot size="0.3em" follow intro style={{ marginLeft: '.05em' }}/>
          </L2H>

          <p style={{ fontSize: 19, lineHeight: 1.55, color: T.smoke, marginTop: 26, maxWidth: 500, textWrap: 'pretty' }}>
            Co-Founder, Förderung, Kapital, Recht &amp; Mentoren — matchfoundr bringt dich mit
            den Menschen und Programmen zusammen, die dein Vorhaben tragen. Ein Co-Pilot hilft
            beim Sortieren; stark macht dich das Netzwerk.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 34, flexWrap: 'wrap' }}>
            <L2Btn href="#cta" kind="primary" size="lg">Kostenlos starten</L2Btn>
            <L2Btn href="#copilot" kind="ghost" size="lg">So funktioniert's</L2Btn>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 34 }}>
            <div style={{ display: 'flex' }}>
              {['Lena K.', 'Deniz K.', 'Mara S.', 'Tim R.'].map((n, i) => (
                <span key={i} style={{ marginLeft: i === 0 ? 0 : -11, border: '2px solid ' + T.canvas, borderRadius: '50%', display: 'inline-flex' }}>
                  <MFAvatar name={n} size={34}/>
                </span>
              ))}
            </div>
            <span style={{ fontSize: 13.5, color: T.smoke }}>
              <b style={{ color: T.ink, fontWeight: 620 }}>4,9/5</b> — von Foundern in Berlin, München, Wien &amp; Zürich
            </span>
          </div>
        </div>

        {/* right — Co-Pilot preview */}
        <L2HeroCard/>
      </div>

      <L2TrustRow/>
    </div>
  );
};

export function L2HeroCard() {
  const recs = [
    { id: 'cofounder', n: 'Anna W.', l: 'Backend · Berlin', fit: 94 },
    { id: 'legal', n: 'Dr. Lena H.', l: 'GmbH · ESOP', fit: 91 },
    { id: 'funding', n: 'EXIST', l: '€125k · 12 Mo', fit: 89 },
  ];
  return (
    <L2Frame label="Co-Pilot · denkt mit" accent="indigo" pad={20} style={{ position: 'relative' }}>
      <div style={{ padding: '14px 16px', borderRadius: 14, background: T.indigoTint,
        border: `1px solid ${T.indigo}22`, fontSize: 14.5, lineHeight: 1.5, color: T.inkSoft }}>
        <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: T.indigoDeep, marginBottom: 6 }}>Du</div>
        „B2B-SaaS, zwei Monate Prototyp. Ich bin Designer, suche technischen Co-Founder.
        GmbH in Berlin, Q3. Was brauche ich jetzt?"
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 2px 12px' }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: T.indigo,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <MFDot size={15} ink="#fff" paper={T.indigo} align="middle"/>
        </span>
        <span style={{ fontFamily: T.mono, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.smoke }}>
          Co-Pilot · in 1,8s
        </span>
        <MFAITag>KI</MFAITag>
      </div>
      <p style={{ margin: '0 2px 16px', fontSize: 15.5, lineHeight: 1.5, color: T.ink, textWrap: 'pretty' }}>
        Drei Dinge parallel: technischer Co-Founder, ein Anwalt für den Gründervertrag,
        und EXIST in den nächsten 6 Wochen. Q3 ist machbar.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {recs.map((r, i) => {
          const s = MF_SERVICE_BY_ID[r.id];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px',
              borderRadius: 13, background: T.warm, border: `1px solid ${T.line}` }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: s.hue, flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <MFServiceIcon name={s.icon} size={16} color="#fff" stroke={2.2}/>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 620, color: T.ink }}>{r.n}</div>
                <div style={{ fontSize: 12, color: T.smoke }}>{r.l}</div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 680, color: T.ember }}>{r.fit}</span>
            </div>
          );
        })}
      </div>
    </L2Frame>
  );
};

// ── Trust row ──────────────────────────────────────────────────────────
export function L2TrustRow() {
  const logos = ['EXIST', 'KfW', 'Bird & Bird', 'ProFIT', 'BAFA', 'Osborne Clarke', 'INVEST'];
  return (
    <div style={{ borderTop: `1px solid ${T.lineSoft}`, marginTop: 30 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '26px 40px',
        display: 'flex', alignItems: 'center', gap: 34, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: T.faint }}>Partner-Netzwerk</span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', opacity: 0.7 }}>
          {logos.map((l, i) => (
            <span key={i} style={{ fontSize: 16, fontWeight: 620, letterSpacing: '-0.02em', color: T.ink }}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Benefit stats (ToolTime punch) ───────────────────────────────────────
export function L2Benefits() {
  const stats = [
    { k: '14 Tage', s: 'bis zum ersten Match — über alle Services hinweg.', tint: T.emberTint, ink: T.emberDeep },
    { k: '€2,4 Mio', s: 'Förderung, die der Co-Pilot 2025 freigeschaltet hat.', tint: T.indigoTint, ink: T.indigoDeep },
    { k: '1.847', s: 'vorgeprüfte Partner — keiner zahlt für Sichtbarkeit.', tint: '#EAF1EC', ink: '#2F5A47' },
  ];
  return (
    <L2Section tone="canvas" pad="20px 0 96px">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }} className="l2-3col">
        {stats.map((s, i) => (
          <div key={i} style={{ borderRadius: 22, padding: '30px 28px', background: s.tint,
            border: `1px solid ${T.lineSoft}` }}>
            <div style={{ fontSize: 'clamp(38px, 4vw, 52px)', fontWeight: 700, letterSpacing: '-0.04em',
              lineHeight: 1, color: s.ink, fontVariantNumeric: 'tabular-nums' }}>{s.k}</div>
            <p style={{ margin: '14px 0 0', fontSize: 15.5, lineHeight: 1.5, color: T.inkSoft, textWrap: 'pretty' }}>{s.s}</p>
          </div>
        ))}
      </div>
    </L2Section>
  );
};

// ── Feature rows (Lovable alternating) ───────────────────────────────────
export function L2FeatureRow({ f, flip }) {
  const A = f.accent === 'indigo' ? T.indigo : T.ember;
  const text = (
    <div>
      <L2Eyebrow color={A}>{f.eyebrow}</L2Eyebrow>
      <L2H style={{ marginTop: 18 }} size="clamp(32px, 3.6vw, 48px)">{f.h}</L2H>
      <p style={{ fontSize: 17.5, lineHeight: 1.6, color: T.smoke, marginTop: 18, maxWidth: 460, textWrap: 'pretty' }}>{f.p}</p>
      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {f.points.map((pt, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ width: 24, height: 24, borderRadius: 7, background: A + '18', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <MFServiceIcon name="check2" size={13} color={A} stroke={2.6}/>
            </span>
            <span style={{ fontSize: 15.5, lineHeight: 1.5, color: T.inkSoft }}>{pt}</span>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="l2-feature" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64,
      alignItems: 'center', padding: '52px 0' }}>
      {flip ? <>{f.visual}{text}</> : <>{text}{f.visual}</>}
    </div>
  );
};

export function L2Features() {
  const copilotVisual = (
    <L2Frame label="Co-Pilot" accent="indigo" pad={18}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ alignSelf: 'flex-end', maxWidth: '82%', background: T.indigo, color: '#fff',
          padding: '11px 14px', borderRadius: '14px 14px 4px 14px', fontSize: 14, lineHeight: 1.45 }}>
          „Ich verliere langsam die Lust, alles allein zu stemmen."
        </div>
        <div style={{ alignSelf: 'flex-start', maxWidth: '90%', background: T.warm, border: `1px solid ${T.line}`,
          padding: '12px 15px', borderRadius: '14px 14px 14px 4px', fontSize: 14, lineHeight: 1.5, color: T.inkSoft }}>
          Das klingt nach einem Co-Founder-Thema, nicht nach Marketing. Ich hab drei Leute
          gefunden, die zu deiner Phase passen — sollen wir starten?
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          {['Co-Founder finden', 'Förderung', 'Businessplan'].map((c, i) => (
            <span key={i} style={{ fontSize: 12.5, fontWeight: 560, color: T.indigoDeep, background: T.indigoTint,
              border: `1px solid ${T.indigo}22`, borderRadius: 999, padding: '7px 13px' }}>{c}</span>
          ))}
        </div>
      </div>
    </L2Frame>
  );
  const marketVisual = (
    <L2Frame label="8 Service-Welten" accent="ember" pad={16}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {MF_SERVICES.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 13px',
            borderRadius: 13, background: T.warm, border: `1px solid ${T.line}` }}>
            <span style={{ width: 32, height: 32, borderRadius: 9, background: s.hue, flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <MFServiceIcon name={s.icon} size={15} color="#fff" stroke={2.2}/>
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 620, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.short}</div>
              <div style={{ fontFamily: T.mono, fontSize: 10.5, color: T.faint }}>{s.count} aktiv</div>
            </div>
          </div>
        ))}
      </div>
    </L2Frame>
  );
  const fundVisual = (
    <L2Frame accent="ember" pad={0}>
      <div style={{ padding: 26, background: `linear-gradient(160deg, ${T.ember}, ${T.emberDeep})`, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -30, bottom: -46, opacity: 0.16 }}>
          <MFServiceIcon name="seal" size={230} color="#fff" stroke={1.4}/>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>EXIST · Gründerstipendium</div>
          <div style={{ fontSize: 62, fontWeight: 720, letterSpacing: '-0.04em', lineHeight: 0.95, marginTop: 14 }}>€125.000</div>
          <div style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.88)', marginTop: 6 }}>pro Team · 12 Monate · zzgl. Coaching</div>
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 11, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.85)', marginBottom: 6 }}>
              <span>ANTRAG · 78%</span><span>FRIST · 28. MAI</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
              <div style={{ width: '78%', height: '100%', background: '#fff' }}/>
            </div>
          </div>
          <div style={{ marginTop: 20, padding: 13, borderRadius: 12, background: 'rgba(0,0,0,0.16)',
            border: '1px solid rgba(255,255,255,0.16)', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
            <IconMF size={17} color="#fff" spark="#fff"/>
            <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>„3 Felder fehlen noch — ich fülle sie aus deinem One-Pager vor. Los?"</div>
          </div>
        </div>
      </div>
    </L2Frame>
  );

  const features = [
    { accent: 'ember', eyebrow: 'Marketplace · 8 Disziplinen', h: <>Acht Dinge, die du brauchst. <span style={{ color: T.ember }}>Einmal sortiert</span>.</>,
      p: '1.847 vorgeprüfte Partner. Die Reihenfolge ergibt sich aus deiner Phase, nicht aus dem Anzeigenpreis — niemand zahlt für Sichtbarkeit.',
      points: ['Co-Founder, Recht, Steuer, Förderung, Kapital, Mentoren, Talent, Growth', '4-Stufen-Prüfung, jährlich re-validiert', 'Nach Fit sortiert, nicht alphabetisch'], visual: marketVisual },
    { accent: 'ember', eyebrow: 'Förderung · live gematcht', h: <>Förderung, die wirklich <span style={{ color: T.ember }}>ankommt</span>.</>,
      p: 'EXIST, ProFIT, INVEST, KfW. Mit Vorprüfung, Antragsbegleitung und einem Anwalt, der die Förder-Sprache spricht — keine Stunden bei Beratern, die nichts wissen.',
      points: ['Co-Pilot füllt bis zu 75% des Antrags vor', 'Fristen & Fortschritt immer im Blick', 'Bewilligungsquote 2024: 68%'], visual: fundVisual },
  ];
  return (
    <L2Section tone="surface" pad="90px 0" id="marketplace">
      <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 20px' }}>
        <L2Eyebrow>Marktplatz &amp; Förderung</L2Eyebrow>
        <L2H style={{ marginTop: 18 }}>Alles, was du brauchst.<br/>Einmal sortiert.</L2H>
      </div>
      <div>
        {features.map((f, i) => <L2FeatureRow key={i} f={f} flip={i % 2 === 1}/>)}
      </div>
    </L2Section>
  );
};
