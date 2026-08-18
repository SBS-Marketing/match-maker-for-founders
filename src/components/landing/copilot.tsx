// @ts-nocheck
/* eslint-disable */
import React from "react";
import { IconMF } from "./brand";
import { L2, L2Btn, L2Eyebrow, L2Frame, L2H } from "./ds";
import { L2Logo } from "./sectionsB";
import { MFAITag, MFServiceIcon, MF_SERVICES, MF_SERVICE_BY_ID } from "./services";
import { MFDot } from "./mascot";

// matchfoundr · Landing v2 — Co-Pilot section, poke.com-style.
// Warmer Canvas, zentrales Phone-Chat-Mockup im Integrations-Logo-Schwarm,
// nummerierte (n)-Callouts. Indigo = KI/Co-Pilot (Brand Book). Kein Gendern.

const T = L2;

const COPILOT_CSS = `
@keyframes cpFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
@keyframes cpUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes cpPop{0%{opacity:0;transform:scale(.82)}60%{transform:scale(1.05)}100%{opacity:1;transform:scale(1)}}
@keyframes cpBlink{0%,60%,100%{opacity:.28;transform:translateY(0)}30%{opacity:1;transform:translateY(-2px)}}
@keyframes cpGlow{0%,100%{opacity:.7}50%{opacity:1}}
.cp-up{animation:cpUp .6s cubic-bezier(.2,.7,.3,1) both}
.cp-logo{animation:cpFloat 5.5s ease-in-out infinite}
.cp-dot{width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block;animation:cpBlink 1.3s infinite}
@media(max-width:900px){
  .cp-stage-logos{display:none!important}
  .cp-row{grid-template-columns:1fr!important;gap:28px!important}
  .cp-row-flip .cp-viz{order:-1}
}
`;

// ── Phone chat mockup — der Co-Pilot-Moment ──────────────────────────────
export function L2CopilotPhone() {
  const recs = [
    { id: 'cofounder', n: 'Anna W.', l: 'Backend · Berlin', fit: 94 },
    { id: 'legal', n: 'Dr. Lena H.', l: 'GmbH · ESOP', fit: 91 },
    { id: 'funding', n: 'EXIST', l: '€125k · 12 Mo', fit: 89 },
  ];
  return (
    <div style={{ width: 320, maxWidth: '100%', borderRadius: 46, padding: 11,
      background: 'linear-gradient(160deg,#faf7f1,#eae3d7)', border: '1px solid rgba(26,26,26,0.10)',
      boxShadow: '0 40px 90px -40px rgba(26,26,26,0.5), 0 2px 0 rgba(255,255,255,0.6) inset', position: 'relative', zIndex: 3 }}>
      <div style={{ borderRadius: 36, background: T.canvas, overflow: 'hidden', border: '1px solid rgba(26,26,26,0.06)' }}>
        {/* status + header */}
        <div style={{ position: 'relative', padding: '10px 22px 0', display: 'flex', justifyContent: 'space-between',
          fontSize: 12, fontWeight: 620, color: T.ink }}>
          <span>9:41</span>
          <span style={{ position: 'absolute', left: '50%', top: 7, transform: 'translateX(-50%)', width: 82, height: 20, borderRadius: 999, background: '#1A1A1A' }}/>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.smoke }}>●●● ▮</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px 12px', borderBottom: `1px solid ${T.lineSoft}` }}>
          <span style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(150deg,${T.indigo},${T.indigoDeep})`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 16px -6px ${T.indigo}` }}>
            <MFDot size={22} ink="#fff" paper={T.indigoDeep} align="middle" follow/>
          </span>
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 14.5, fontWeight: 680, letterSpacing: '-0.01em' }}>Co-Pilot</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.indigoDeep }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3D9970', animation: 'cpGlow 2s infinite' }}/>denkt mit
            </div>
          </div>
          <MFAITag>KI</MFAITag>
        </div>

        {/* messages */}
        <div style={{ padding: '16px 15px 14px', display: 'flex', flexDirection: 'column', gap: 10, background: T.warm }}>
          <div className="cp-up" style={{ alignSelf: 'flex-end', maxWidth: '84%', background: T.ink, color: '#F5F2EC',
            padding: '10px 13px', borderRadius: '16px 16px 5px 16px', fontSize: 13, lineHeight: 1.42 }}>
            B2B-SaaS, Prototyp steht. Ich bin Designer und such einen technischen Co-Founder — was zuerst?
          </div>
          <div className="cp-up" style={{ alignSelf: 'flex-start', maxWidth: '88%', background: T.indigoTint, color: T.inkSoft,
            border: `1px solid ${T.indigo}22`, padding: '10px 13px', borderRadius: '16px 16px 16px 5px', fontSize: 13, lineHeight: 1.45, animationDelay: '.5s' }}>
            Drei Dinge parallel — ich hab schon angefangen. Beste Treffer für deine Phase:
          </div>
          <div className="cp-up" style={{ alignSelf: 'flex-start', width: '100%', animationDelay: '.9s',
            background: T.surface, border: `1px solid ${T.line}`, borderRadius: 15, padding: 8, display: 'flex', flexDirection: 'column', gap: 6, boxShadow: T.shadowSoft }}>
            {recs.map((r, i) => {
              const s = MF_SERVICE_BY_ID[r.id];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 7px', borderRadius: 11, background: T.warm }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: s.hue, flexShrink: 0,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MFServiceIcon name={s.icon} size={13} color="#fff" stroke={2.3}/>
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 640, color: T.ink }}>{r.n}</div>
                    <div style={{ fontSize: 10.5, color: T.smoke }}>{r.l}</div>
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 720, color: T.ember }}>{r.fit}</span>
                </div>
              );
            })}
          </div>
          <div className="cp-up" style={{ alignSelf: 'flex-start', maxWidth: '84%', background: T.indigoTint, color: T.inkSoft,
            border: `1px solid ${T.indigo}22`, padding: '10px 13px', borderRadius: '16px 16px 16px 5px', fontSize: 13, lineHeight: 1.45, animationDelay: '1.25s' }}>
            Anna passt am besten. Soll ich Freitag ein Kennenlernen vorschlagen?
          </div>
          <div className="cp-up" style={{ alignSelf: 'flex-start', display: 'inline-flex', gap: 4, alignItems: 'center',
            background: T.indigoTint, color: T.indigoDeep, padding: '10px 16px', borderRadius: '16px 16px 16px 5px', animationDelay: '1.6s' }}>
            <MFDot size={20} ink={T.indigo} paper={T.indigoTint} state="thinking" align="middle"/>
          </div>
        </div>

        {/* quick replies */}
        <div style={{ padding: '10px 14px 16px', display: 'flex', gap: 7, flexWrap: 'wrap', background: T.warm }}>
          {['Ja, Freitag', 'Erst mehr zeigen'].map((c, i) => (
            <span key={i} style={{ fontSize: 12, fontWeight: 600, padding: '8px 13px', borderRadius: 999,
              background: i === 0 ? T.indigo : T.surface, color: i === 0 ? '#fff' : T.ink,
              border: i === 0 ? 'none' : `1px solid ${T.line}` }}>{c}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Integrations-Logo-Schwarm (poke „fits into your life") ───────────────
function L2CopilotCloud() {
  const spots = [
    { lg: 'notion', x: '4%',  y: '10%', d: '0s' },
    { lg: 'gmail',  x: '84%', y: '6%',  d: '.6s' },
    { lg: 'gcal',   x: '-2%', y: '46%', d: '1.1s' },
    { lg: 'linear', x: '90%', y: '40%', d: '.3s' },
    { lg: 'slack',  x: '2%',  y: '80%', d: '.9s' },
    { lg: 'stripe', x: '86%', y: '76%', d: '1.4s' },
    { lg: 'claude', x: '70%', y: '92%', d: '.5s' },
    { lg: 'gdrive', x: '20%', y: '96%', d: '1.2s' },
  ];
  return (
    <div className="cp-stage-logos" aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {spots.map((s, i) => (
        <div key={i} className="cp-logo" style={{ position: 'absolute', left: s.x, top: s.y, animationDelay: s.d,
          width: 54, height: 54, borderRadius: 16, background: T.surface, border: `1px solid ${T.line}`,
          boxShadow: '0 18px 34px -18px rgba(26,26,26,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <L2Logo name={s.lg} size={28}/>
        </div>
      ))}
    </div>
  );
}

// ── Numbered callout row (poke „(n)" cadence) ────────────────────────────
function L2CopilotRow({ n, eyebrow, h, p, viz, flip }) {
  const text = (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <span style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 600, color: T.indigo, letterSpacing: '0.02em' }}>({n})</span>
        <L2Eyebrow color={T.indigo}>{eyebrow}</L2Eyebrow>
      </div>
      <L2H size="clamp(27px, 3vw, 38px)">{h}</L2H>
      <p style={{ fontSize: 17, lineHeight: 1.6, color: T.smoke, marginTop: 16, maxWidth: 440, textWrap: 'pretty' }}>{p}</p>
    </div>
  );
  return (
    <div className={'cp-row' + (flip ? ' cp-row-flip' : '')} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center', padding: '48px 0' }}>
      {flip ? <><div className="cp-viz">{viz}</div>{text}</> : <>{text}<div className="cp-viz">{viz}</div></>}
    </div>
  );
}

// ── Visual: Subtext hören (chat) ─────────────────────────────────────────
function VizSubtext() {
  return (
    <L2Frame label="Co-Pilot" accent="indigo" pad={18}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ alignSelf: 'flex-end', maxWidth: '82%', background: T.ink, color: '#F5F2EC',
          padding: '11px 14px', borderRadius: '14px 14px 4px 14px', fontSize: 14, lineHeight: 1.45 }}>
          „Ich verliere langsam die Lust, alles allein zu stemmen."
        </div>
        <div style={{ alignSelf: 'flex-start', maxWidth: '92%', background: T.indigoTint, border: `1px solid ${T.indigo}22`,
          padding: '12px 15px', borderRadius: '14px 14px 14px 4px', fontSize: 14, lineHeight: 1.5, color: T.inkSoft }}>
          Das klingt nach einem Co-Founder-Thema, nicht nach Marketing. Ich hab drei Leute gefunden, die zu deiner Phase passen — sollen wir starten?
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
}

// ── Visual: 8 Disziplinen routen ─────────────────────────────────────────
function VizRouting() {
  return (
    <L2Frame label="Routing · 8 Disziplinen" accent="indigo" pad={16}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {MF_SERVICES.map((s, i) => (
          <div key={s.id} style={{ animation: `cpPop .5s ${0.04 + i * 0.05}s both cubic-bezier(.2,.7,.3,1)`,
            display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 12, background: T.warm, border: `1px solid ${T.line}` }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: s.hue, flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <MFServiceIcon name={s.icon} size={14} color="#fff" stroke={2.2}/>
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 620, color: T.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.short}</div>
              <div style={{ fontFamily: T.mono, fontSize: 10, color: T.faint }}>{s.count} aktiv</div>
            </div>
          </div>
        ))}
      </div>
    </L2Frame>
  );
}

// ── Visual: proaktiv, zur richtigen Zeit ─────────────────────────────────
function VizProactive() {
  const feed = [
    { t: 'EXIST-Frist in 6 Tagen — 3 Felder fehlen. Ich fülle sie aus deinem One-Pager vor.', tag: 'Förderung', hue: '#B23B0E' },
    { t: 'Anna hat geantwortet: Freitag 15:00 passt. Soll ich bestätigen?', tag: 'Co-Founder', hue: '#E2511C' },
    { t: 'Gründervertrag liegt zur Signatur bereit — ESOP-Pool auf 12,5%.', tag: 'Recht', hue: '#3D5A4A' },
  ];
  return (
    <L2Frame label="Von allein · zur richtigen Zeit" accent="indigo" pad={16}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {feed.map((f, i) => (
          <div key={i} style={{ animation: `cpUp .5s ${0.1 + i * 0.14}s both`, display: 'flex', gap: 11, alignItems: 'flex-start',
            padding: '12px 13px', borderRadius: 13, background: T.warm, border: `1px solid ${T.line}` }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(150deg,${T.indigo},${T.indigoDeep})`, flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <IconMF size={15} color="#fff" spark="#fff"/>
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, lineHeight: 1.45, color: T.inkSoft, textWrap: 'pretty' }}>{f.t}</div>
              <span style={{ display: 'inline-block', marginTop: 7, fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: f.hue }}>· {f.tag}</span>
            </div>
          </div>
        ))}
      </div>
    </L2Frame>
  );
}

// ── Section ──────────────────────────────────────────────────────────────
export function L2Copilot() {
  return (
    <section id="copilot" style={{ background: T.canvas, color: T.ink, padding: '96px 0 88px', position: 'relative', overflow: 'hidden' }}>
      <style>{COPILOT_CSS}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', position: 'relative' }}>
        {/* intro */}
        <div style={{ textAlign: 'center', maxWidth: 780, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 30 }}>
            <MFDot size={96} ink={T.indigo} paper={T.canvas} follow intro
              cycle={['idle', 'thinking', 'wink', 'notify', 'orbit', 'idle']}/>
          </div>
          <L2Eyebrow color={T.indigo}>Der Co-Pilot</L2Eyebrow>
          <L2H style={{ marginTop: 18 }} size="clamp(34px, 4.4vw, 60px)">
            Dein Co-Pilot fügt sich in deinen<br/>Gründer-Alltag — <span style={{ color: T.indigo }}>nicht andersrum.</span>
          </L2H>
          <p style={{ fontSize: 18.5, lineHeight: 1.55, color: T.smoke, marginTop: 22, maxWidth: 580, marginInline: 'auto', textWrap: 'pretty' }}>
            Erzähl ihm in deinen Worten, wo du stehst. Er versteht den Subtext, holt die richtigen
            Menschen zusammen und bleibt dabei so nahbar wie eine gute Nachricht.
          </p>
          <p style={{ fontFamily: T.mono, fontSize: 12.5, letterSpacing: '0.02em', color: T.faint, marginTop: 18 }}>
            Das ist er übrigens — der Punkt in matchfoundr.
          </p>
        </div>

        {/* centerpiece: phone im Logo-Schwarm */}
        <div style={{ position: 'relative', margin: '52px auto 0', maxWidth: 760, minHeight: 560,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: 560, height: 560, borderRadius: '50%',
            background: `radial-gradient(circle at center, ${T.indigoTint}, transparent 68%)`, filter: 'blur(12px)', animation: 'cpGlow 6s ease-in-out infinite' }}/>
          <L2CopilotCloud/>
          <L2CopilotPhone/>
        </div>

        {/* numbered callouts */}
        <div style={{ marginTop: 20 }}>
          <L2CopilotRow n="01" eyebrow="Versteht dich" flip
            h={<>Hört den <span style={{ color: T.indigo }}>Subtext</span> — nicht nur Keywords.</>}
            p="Kein Suchfeld, kein 47-Fragen-Quiz. Du schreibst, wie dir zumute ist, und der Co-Pilot erkennt, worum es wirklich geht — und was du als Nächstes brauchst."
            viz={<VizSubtext/>}/>
          <L2CopilotRow n="02" eyebrow="Denkt in Zusammenhängen"
            h={<>Routet über <span style={{ color: T.indigo }}>acht Disziplinen</span> — in sinnvoller Reihenfolge.</>}
            p="Co-Founder, Recht, Steuer, Förderung, Kapital, Mentoren, Talent, Growth. Der Co-Pilot weiß, was zuerst dran ist — und zieht die passenden Menschen in der richtigen Folge heran."
            viz={<VizRouting/>}/>
          <L2CopilotRow n="03" eyebrow="Handelt für dich" flip
            h={<>Meldet sich <span style={{ color: T.indigo }}>zur richtigen Zeit</span> — von allein.</>}
            p="Fristen, Antworten, offene Verträge: Der Co-Pilot bereitet vor, erinnert und fragt nur nach, wenn eine Entscheidung ansteht. Du baust — er hält den Plan zusammen."
            viz={<VizProactive/>}/>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <L2Btn href="#cta" accent="indigo" size="lg">Erzähl dem Co-Pilot von dir</L2Btn>
        </div>
      </div>
    </section>
  );
};
