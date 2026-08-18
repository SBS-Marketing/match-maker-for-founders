// @ts-nocheck
/* eslint-disable */
import React from "react";
import { IconMF } from "./brand";
import { L2, L2Btn, L2Eyebrow, L2Frame, L2H, L2Section } from "./ds";
import { MFAvatar } from "./glass";
import { MFServiceIcon, MF_SERVICE_BY_ID } from "./services";
import { MFWordmarkDot } from "./mascot";

// matchfoundr · Landing v2 — B: MCP · Community · Testimonials · Pricing · FAQ · CTA · Footer

const T = L2;

// ══ CONNECT · ToolTime-style animated tab showcase ═══════════════════════
// KI/Co-Pilot = Indigo (Brand Book). Auto-advancing tabs, animierte Visuals.

const L2MCP_CSS = `
@keyframes l2mcpUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes l2mcpPop{0%{opacity:0;transform:scale(.7)}60%{transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}
@keyframes l2mcpFly{0%{opacity:0;transform:translateX(0) scale(.9)}18%{opacity:1;transform:translateX(0) scale(1)}70%{opacity:1;transform:translateX(96px) scale(1)}100%{opacity:0;transform:translateX(96px) scale(.9)}}
@keyframes l2mcpWire{to{stroke-dashoffset:-24}}
@keyframes l2mcpMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes l2mcpDraw{from{stroke-dashoffset:26}to{stroke-dashoffset:0}}
.l2mcp-anim{animation:l2mcpUp .5s cubic-bezier(.2,.7,.3,1) both}
.l2mcp-wire{stroke-dasharray:5 7;animation:l2mcpWire 1s linear infinite}
@media(max-width:640px){
  .l2mcp-handoff{grid-template-columns:1fr!important;gap:14px!important;min-height:0!important}
  .l2mcp-handoff > div{width:auto!important;margin-left:0!important}
  .l2mcp-fly{display:none!important}
  .l2mcp-hub{transform:scale(.74);transform-origin:top center;height:236px!important}
  .l2mcp-tabs > *{font-size:12px!important}
}
`;

// —— Echte Brand-Logos (simple-icons, MIT) + handgezeichnet für OpenAI/Slack —
export function L2Logo({ name, size = 22 }) {
  const P = {
    claude:['#D97757','m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z'],
    cursor:['#111111','M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23'],
    notion:['#191918','M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z'],
    google:['#4285F4','M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z'],
    gcal:['#4285F4','M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM18.316 5.684V0H1.895A1.894 1.894 0 0 0 0 1.895v16.421h5.684V5.684h12.632zm-7.207 6.25v-.065c.272-.144.5-.349.687-.617s.279-.595.279-.982c0-.379-.099-.72-.3-1.025a2.05 2.05 0 0 0-.832-.714 2.703 2.703 0 0 0-1.197-.257c-.6 0-1.094.156-1.481.467-.386.311-.65.671-.793 1.078l1.085.452c.086-.249.224-.461.413-.633.189-.172.445-.257.767-.257.33 0 .602.088.816.264a.86.86 0 0 1 .322.703c0 .33-.12.589-.36.778-.24.19-.535.284-.886.284h-.567v1.085h.633c.407 0 .748.109 1.02.327.272.218.407.499.407.843 0 .336-.129.614-.387.832s-.565.327-.924.327c-.351 0-.651-.103-.897-.311-.248-.208-.422-.502-.521-.881l-1.096.452c.178.616.505 1.082.977 1.401.472.319.984.478 1.538.477a2.84 2.84 0 0 0 1.293-.291c.382-.193.684-.458.902-.794.218-.336.327-.72.327-1.149 0-.429-.115-.797-.344-1.105a2.067 2.067 0 0 0-.881-.689zm2.093-1.931l.602.913L15 10.045v5.744h1.187V8.446h-.827l-2.158 1.557z'],
    stripe:['#635BFF','M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z'],
    hubspot:['#FF7A59','M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978v-.067A2.2 2.2 0 0017.238.845h-.067a2.2 2.2 0 00-2.193 2.193v.067a2.196 2.196 0 001.252 1.973l.013.006v2.852a6.22 6.22 0 00-2.969 1.31l.012-.01-7.828-6.095A2.497 2.497 0 104.3 4.656l-.012.006 7.697 5.991a6.176 6.176 0 00-1.038 3.446c0 1.343.425 2.588 1.147 3.607l-.013-.02-2.342 2.343a1.968 1.968 0 00-.58-.095h-.002a2.033 2.033 0 102.033 2.033 1.978 1.978 0 00-.1-.595l.005.014 2.317-2.317a6.247 6.247 0 104.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 113.215-3.207v.002a3.206 3.206 0 01-3.207 3.207z'],
    linear:['#5E6AD2','M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z'],
    gdrive:['#1FA463','M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.1 4.704 7.255 3.22 7.25 3.214zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z'],
    gmail:['#EA4335','M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z'],
  };
  if (name === 'openai') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display:'block' }}>
      {[0,60,120].map(a=>(<ellipse key={a} cx="12" cy="12" rx="9.6" ry="3.9" stroke="#0A0A0A" strokeWidth="1.7" transform={`rotate(${a} 12 12)`}/>))}
    </svg>
  );
  if (name === 'slack') {
    const cols = ['#36C5F0','#2EB67D','#ECB22E','#E01E5A'];
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display:'block' }}>
        {cols.map((col,i)=>(<rect key={i} x="9.1" y="1.9" width="3.4" height="7.6" rx="1.7" fill={col} transform={`rotate(${i*90} 12 12)`}/>))}
      </svg>
    );
  }
  const e = P[name]; if (!e) return null;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={e[0]} style={{ display:'block' }}><path d={e[1]}/></svg>;
};

// —— Visual 1 · Nahtloser Hand-off ————————————————————————————————————————
function L2VizHandoff() {
  return (
    <div className="l2mcp-handoff" style={{ position:'relative', display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, alignItems:'center', minHeight:300 }}>
      <div className="l2mcp-anim" style={{ position:'relative', zIndex:2, borderRadius:18, background:T.surface, border:`1px solid ${T.line}`, boxShadow:T.shadowSoft, padding:16, width:196 }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:12 }}>
          <span style={{ width:28, height:28, borderRadius:8, background:T.ember, display:'inline-flex', alignItems:'center', justifyContent:'center' }}><IconMF size={14} color="#fff" spark="#fff"/></span>
          <span style={{ fontSize:13, fontWeight:660, color:T.ink }}>matchfoundr</span>
        </div>
        {[['people','Dein Profil & Ziele'],['layers','Aktive Services'],['cal','Deine Pipeline']].map(([ic,t],i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', borderRadius:9, background:T.warm, border:`1px solid ${T.lineSoft}`, marginBottom:6 }}>
            <MFServiceIcon name={ic} size={13} color={T.ember} stroke={2.2}/>
            <span style={{ fontSize:11.5, fontWeight:520, color:T.inkSoft }}>{t}</span>
          </div>
        ))}
      </div>
      <div className="l2mcp-fly" style={{ position:'absolute', left:'44%', top:'50%', transform:'translateY(-50%)', zIndex:3, animation:'l2mcpFly 2.6s cubic-bezier(.5,0,.3,1) infinite' }}>
        <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'6px 11px', borderRadius:999, background:T.indigo, color:'#fff', fontSize:11, fontWeight:600, boxShadow:`0 10px 22px -8px ${T.indigoDeep}` }}>
          <MFServiceIcon name="spark2" size={12} color="#fff" stroke={2.4}/> dein Kontext
        </span>
      </div>
      <div className="l2mcp-anim" style={{ animationDelay:'.15s', borderRadius:18, background:T.ink, border:'1px solid rgba(255,255,255,0.1)', padding:16, marginLeft:-8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
          <span style={{ width:26, height:26, borderRadius:8, background:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center' }}><L2Logo name="claude" size={16}/></span>
          <span style={{ fontSize:12.5, fontWeight:600, color:'#F5F2EC' }}>Claude</span>
          <span style={{ marginLeft:'auto', fontFamily:T.mono, fontSize:9, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(245,242,236,0.45)' }}>via mcp</span>
        </div>
        <div style={{ animation:'l2mcpUp .5s .5s both', marginLeft:'auto', maxWidth:'88%', background:'rgba(255,255,255,0.1)', color:'#F5F2EC', fontSize:11.5, lineHeight:1.45, padding:'8px 11px', borderRadius:'12px 12px 3px 12px', marginBottom:8 }}>
          „Wer aus meinem Netzwerk passt als CTO?"
        </div>
        <div style={{ animation:'l2mcpUp .5s 1s both', maxWidth:'92%', background:'rgba(55,86,196,0.28)', border:'1px solid rgba(120,140,230,0.4)', color:'#EDEFFB', fontSize:11.5, lineHeight:1.45, padding:'8px 11px', borderRadius:'12px 12px 12px 3px' }}>
          3 Founder gefunden — ich hab dir <b style={{ color:'#fff' }}>Elias R.</b> als Erstes angepinnt.
        </div>
      </div>
    </div>
  );
}

// —— Visual 2 · Offene MCP (Hub mit Live-Leitungen) ————————————————————————
function L2VizMcp() {
  // Koordinaten im viewBox-System (420x300) — Chips werden prozentual daraus positioniert.
  const clients = [
    { n:'Claude',  logo:'claude', x:74,  y:60,  anchor:'left' },
    { n:'ChatGPT', logo:'openai', x:346, y:60,  anchor:'right' },
    { n:'Cursor',  logo:'cursor', x:210, y:250, anchor:'center' },
  ];
  const VB_W = 420, VB_H = 300;
  return (
    <div className="l2mcp-anim l2mcp-hub" style={{ position:'relative', width:'100%', maxWidth:420, margin:'0 auto', aspectRatio:'420 / 300' }}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet" style={{ position:'absolute', inset:0, width:'100%', height:'100%', overflow:'visible' }}>
        {clients.map((c,i)=>(
          <g key={i}>
            <line x1="210" y1="150" x2={c.x} y2={c.y} stroke={T.indigo} strokeOpacity="0.35" strokeWidth="2" className="l2mcp-wire" style={{ animationDelay:`${i*0.2}s` }}/>
            <circle r="4" fill={T.indigo}>
              <animateMotion dur="1.8s" repeatCount="indefinite" begin={`${i*0.4}s`} path={`M210,150 L${c.x},${c.y}`}/>
            </circle>
          </g>
        ))}
      </svg>
      <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', zIndex:2, width:112, borderRadius:16, background:T.ink, boxShadow:'0 18px 40px -18px rgba(26,26,26,.6)', padding:'12px 12px 14px', textAlign:'center' }}>
        <span style={{ width:34, height:34, borderRadius:10, background:T.ember, display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:7 }}><IconMF size={17} color="#fff" spark="#fff"/></span>
        <div style={{ fontSize:11.5, fontWeight:640, color:'#F5F2EC' }}>matchfoundr</div>
        <div style={{ fontFamily:T.mono, fontSize:8.5, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(245,242,236,.5)', marginTop:1 }}>mcp · oauth</div>
      </div>
      {clients.map((c,i)=>{
        const pos = c.anchor === 'left'
          ? { left:0, transform:'translateY(-50%)' }
          : c.anchor === 'right'
            ? { right:0, transform:'translateY(-50%)' }
            : { left:'50%', transform:'translate(-50%,-50%)' };
        return (
          <div key={i} className="l2mcp-anim" style={{ animationDelay:`${0.2+i*0.12}s`, position:'absolute', top:`${(c.y/VB_H)*100}%`, ...pos, zIndex:2, display:'inline-flex', alignItems:'center', gap:8, padding:'7px 13px 7px 10px', borderRadius:999, background:T.surface, border:`1px solid ${T.line}`, boxShadow:T.shadowSoft, fontSize:12, fontWeight:600, color:T.ink, whiteSpace:'nowrap', maxWidth:'46%' }}>
            <L2Logo name={c.logo} size={15}/>{c.n}
          </div>
        );
      })}
    </div>
  );
}


// —— Visual 3 · Konnektoren ohne Ende ————————————————————————————————————
function L2VizConnectors() {
  const tiles = [['Slack','slack'],['Notion','notion'],['Gmail','gmail'],['Kalender','gcal'],['Stripe','stripe'],['HubSpot','hubspot'],['Linear','linear'],['Drive','gdrive']];
  const marquee = ['Airtable','Zoom','Sheets','Trello','LinkedIn','Discord','GitHub','DocuSign','Zapier','Miro','Figma','Loom'];
  return (
    <div className="l2mcp-anim">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:9, marginBottom:14 }}>
        {tiles.map(([n,lg],i)=>(
          <div key={i} style={{ animation:`l2mcpPop .5s ${0.05+i*0.06}s both cubic-bezier(.2,.7,.3,1)`, display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'14px 6px', borderRadius:13, background:T.surface, border:`1px solid ${T.line}`, boxShadow:T.shadowSoft }}>
            <span style={{ width:28, height:28, display:'inline-flex', alignItems:'center', justifyContent:'center' }}><L2Logo name={lg} size={24}/></span>
            <span style={{ fontSize:11, fontWeight:540, color:T.inkSoft }}>{n}</span>
          </div>
        ))}
      </div>
      <div style={{ overflow:'hidden', maxWidth:'100%', maskImage:'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)', WebkitMaskImage:'linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)' }}>
        <div style={{ display:'flex', gap:8, width:'max-content', animation:'l2mcpMarquee 18s linear infinite' }}>
          {[...marquee,...marquee].map((n,i)=>(
            <span key={i} style={{ padding:'6px 13px', borderRadius:999, background:T.panel, border:`1px solid ${T.lineSoft}`, fontSize:12, fontWeight:520, color:T.smoke, whiteSpace:'nowrap' }}>{n}</span>
          ))}
        </div>
      </div>
      <div style={{ textAlign:'center', marginTop:13, fontFamily:T.mono, fontSize:10.5, letterSpacing:'.1em', textTransform:'uppercase', color:T.faint }}>+ jedes MCP-fähige Tool</div>
    </div>
  );
}

// —— Visual 4 · Aktionen statt Antworten ————————————————————————————————
function L2VizActions() {
  const acts = [['create_task','3 Investoren-Follow-ups angelegt'],['book_event','Legal-Sprechstunde · Do 17:00'],['send_intro','Vorstellung an Elias R. geschickt']];
  return (
    <div className="l2mcp-anim" style={{ borderRadius:18, background:T.surface, border:`1px solid ${T.line}`, boxShadow:T.shadow, padding:16, maxWidth:420, margin:'0 auto' }}>
      <div style={{ animation:'l2mcpUp .5s both', marginLeft:'auto', maxWidth:'86%', background:T.indigoTint, color:T.indigoDeep, fontSize:12, lineHeight:1.45, padding:'9px 12px', borderRadius:'13px 13px 3px 13px', marginBottom:14, fontWeight:520 }}>
        „Kümmer dich um mein Fundraising-Setup."
      </div>
      {acts.map(([fn,label],i)=>(
        <div key={i} style={{ animation:`l2mcpUp .5s ${0.5+i*0.5}s both`, display:'flex', alignItems:'center', gap:11, padding:'11px 12px', borderRadius:11, background:T.warm, border:`1px solid ${T.lineSoft}`, marginBottom:8 }}>
          <span style={{ width:24, height:24, borderRadius:7, background:'rgba(79,176,112,0.15)', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4FB070" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" style={{ strokeDasharray:26, animation:`l2mcpDraw .45s ${0.75+i*0.5}s both` }}/></svg>
          </span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:T.mono, fontSize:11, color:T.indigo, fontWeight:600 }}>{fn}</div>
            <div style={{ fontSize:12.5, fontWeight:540, color:T.ink, marginTop:1 }}>{label}</div>
          </div>
        </div>
      ))}
      <div style={{ animation:'l2mcpUp .5s 2.2s both', display:'flex', alignItems:'center', gap:8, marginTop:4, paddingTop:12, borderTop:`1px solid ${T.lineSoft}` }}>
        <MFServiceIcon name="spark2" size={14} color={T.indigo} stroke={2.2}/>
        <span style={{ fontSize:12, color:T.smoke }}>Erledigt — <b style={{ color:T.ink }}>ohne einen Klick von dir</b>.</span>
      </div>
    </div>
  );
}

// ── CONNECT band ─────────────────────────────────────────────────────────
export function L2Connect() {
  const tabs = [
    { tab:'Nahtloser Hand-off', badge:'live', eyebrow:'Übergabe', Viz:L2VizHandoff,
      title:<>Ein Satz im Chat — <span style={{ color:T.indigo }}>dein ganzes matchfoundr</span> ist dabei.</>,
      body:'Kein Copy-paste, kein Tab-Wechsel. Dein Assistent bekommt Profil, Services und Pipeline als Kontext — und arbeitet damit weiter, wo du gerade bist.' },
    { tab:'Offene MCP', badge:'standard', eyebrow:'Kein Lock-in', Viz:L2VizMcp,
      title:<>Ein offener Standard. <span style={{ color:T.indigo }}>Dein Tool, deine Wahl.</span></>,
      body:'matchfoundr spricht das Model Context Protocol — sicher per OAuth, jederzeit widerrufbar. Verbinde Claude, ChatGPT oder Cursor mit einem Klick.' },
    { tab:'Konnektoren ohne Ende', badge:'wächst', eyebrow:'Ökosystem', Viz:L2VizConnectors,
      title:<>Andocken an <span style={{ color:T.indigo }}>alles, was du schon nutzt.</span></>,
      body:'Slack, Notion, Kalender, Stripe und Dutzende mehr. Jedes MCP-fähige Tool hängt sich an — dein matchfoundr wird zur Schaltzentrale, nicht zur nächsten Insel.' },
    { tab:'Aktionen statt Antworten', badge:'agentic', eyebrow:'Es passiert', Viz:L2VizActions,
      title:<>Der Assistent <span style={{ color:T.indigo }}>erledigt es</span> — nicht nur erklärt.</>,
      body:'Aufgaben anlegen, Events buchen, Vorstellungen anstoßen: dein KI-Tool führt echte matchfoundr-Aktionen aus. Du sagst was, es macht.' },
  ];
  const [active, setActive] = React.useState(0);
  const [prog, setProg] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const DUR = 7000;
  React.useEffect(() => {
    if (paused) return;
    setProg(0);
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / DUR);
      setProg(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setActive(a => (a + 1) % tabs.length);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, paused]);
  const cur = tabs[active];
  const Viz = cur.Viz;
  return (
    <L2Section tone="panel" pad="96px 0" id="connect">
      <style>{L2MCP_CSS}</style>
      <div style={{ textAlign:'center', maxWidth:760, margin:'0 auto 44px' }}>
        <L2Eyebrow color={T.indigo}>Verbinden · offener Standard</L2Eyebrow>
        <L2H style={{ marginTop:18 }}>Nimm matchfoundr mit — <span style={{ color:T.indigo }}>in jedes KI-Tool</span>.</L2H>
        <p style={{ fontSize:17.5, lineHeight:1.6, color:T.smoke, marginTop:18, textWrap:'pretty' }}>
          Dein Co-Pilot lebt in matchfoundr — aber er bleibt nicht darin gefangen. Über MCP arbeitest du mit deinem gewohnten Assistenten weiter, überall.
        </p>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'center', gap:8, marginBottom:34 }} className="l2mcp-tabs">
        {tabs.map((t,i)=>{
          const on = i===active;
          return (
            <button key={i} onClick={()=>setActive(i)} style={{ position:'relative', overflow:'hidden', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:9, padding:'11px 18px', borderRadius:12, fontFamily:T.font, fontSize:14, fontWeight:600, letterSpacing:'-0.01em', transition:'all .2s', background: on ? T.surface : 'transparent', color: on ? T.ink : T.smoke, border:`1px solid ${on ? T.line : 'transparent'}`, boxShadow: on ? T.shadowSoft : 'none' }}>
              {t.tab}
              <span style={{ fontFamily:T.mono, fontSize:8.5, letterSpacing:'.08em', textTransform:'uppercase', padding:'2px 6px', borderRadius:5, color: on ? T.indigo : T.faint, background: on ? T.indigoTint : 'transparent' }}>{t.badge}</span>
              {on && <span style={{ position:'absolute', left:0, bottom:0, height:2.5, width:`${prog*100}%`, background:T.indigo, borderRadius:2 }}/>}
            </button>
          );
        })}
      </div>
      <div onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} style={{ display:'grid', gridTemplateColumns:'0.92fr 1.08fr', gap:56, alignItems:'center', minHeight:340 }} className="l2-feature">
        <div key={'txt'+active} className="l2mcp-anim" style={{ minWidth:0 }}>
          <L2Eyebrow color={T.indigo}>{cur.eyebrow}</L2Eyebrow>
          <h3 style={{ margin:'14px 0 0', fontSize:'clamp(26px,2.7vw,34px)', fontWeight:680, lineHeight:1.1, letterSpacing:'-0.03em', color:T.ink, textWrap:'balance' }}>{cur.title}</h3>
          <p style={{ fontSize:16.5, lineHeight:1.6, color:T.smoke, marginTop:16, maxWidth:440, textWrap:'pretty' }}>{cur.body}</p>
          <div style={{ marginTop:24 }}><L2Btn href="#" accent="indigo">Co-Pilot verbinden</L2Btn></div>
        </div>
        <div style={{ position:'relative', minWidth:0, minHeight:300, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div key={'viz'+active} style={{ width:'100%', minWidth:0, position:'relative' }}><Viz/></div>
        </div>
      </div>
    </L2Section>
  );
};

// ── Community ────────────────────────────────────────────────────────────
export function L2Community() {
  const events = [
    { id: 'growth', t: 'Founder-Frühstück', when: 'Di · 8:30', city: 'Berlin', going: 24, spots: 30 },
    { id: 'legal', t: 'Legal-Sprechstunde', when: 'Do · 17:00', city: 'online', going: 41, spots: 50 },
    { id: 'cofounder', t: 'Co-Founder-Speed-Dating', when: 'Sa · 11:00', city: 'München', going: 18, spots: 24 },
  ];
  return (
    <L2Section tone="canvas" pad="96px 0" id="community">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="l2-feature">
        <div>
          <L2Eyebrow>Gemeinsam stärker</L2Eyebrow>
          <L2H style={{ marginTop: 18 }}>Nicht die KI macht dich stark.<br/><span style={{ color: T.ember }}>Die Menschen</span> um dich.</L2H>
          <p style={{ fontSize: 17.5, lineHeight: 1.6, color: T.smoke, marginTop: 18, maxWidth: 470, textWrap: 'pretty' }}>
            Der Co-Pilot räumt dir den Weg frei — gegründet wird mit echten Menschen. Co-Founder,
            die mit anpacken. Mentoren, die den Umweg kennen. Andere Founder, die genau da stehen,
            wo du morgen stehst.
          </p>
          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[['people', 'Peers auf Augenhöhe'], ['cal', 'Events in deiner Stadt'], ['compass', 'Mentoren, die geliefert haben']].map(([ic, t], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 24, height: 24, borderRadius: 7, background: T.emberTint, flexShrink: 0,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MFServiceIcon name={ic} size={13} color={T.ember} stroke={2.2}/>
                </span>
                <span style={{ fontSize: 15.5, fontWeight: 560, color: T.inkSoft }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <L2Frame label="Diese Woche · Berlin · DACH" pad={18}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {events.map((e, i) => {
              const s = MF_SERVICE_BY_ID[e.id];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 13, borderRadius: 13,
                  background: T.warm, border: `1px solid ${T.line}` }}>
                  <span style={{ width: 38, height: 38, borderRadius: 10, background: s.hue, flexShrink: 0,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MFServiceIcon name={s.icon} size={17} color="#fff" stroke={2.2}/>
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 620, color: T.ink }}>{e.t}</div>
                    <div style={{ fontSize: 12, color: T.smoke, marginTop: 2 }}>{e.when} · {e.city}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 680, color: T.ember }}>{e.going}/{e.spots}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.faint }}>dabei</div>
                  </div>
                </div>
              );
            })}
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', borderRadius: 13,
              background: 'rgba(26,26,26,0.035)', border: `1px solid ${T.line}` }}>
              <div style={{ display: 'flex' }}>
                {['Lena K.', 'Tom R.', 'Aylin D.', 'Jonas P.'].map((n, i) => (
                  <span key={i} style={{ marginLeft: i === 0 ? 0 : -11, border: '2px solid #fff', borderRadius: '50%', display: 'inline-flex' }}>
                    <MFAvatar name={n} size={32}/>
                  </span>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 620, color: T.ink }}>+ 38 Founder in deiner Phase</div>
                <div style={{ fontSize: 12, color: T.smoke, marginTop: 1 }}>gerade aktiv · vor Ausgründung · B2B</div>
              </div>
            </div>
          </div>
        </L2Frame>
      </div>
    </L2Section>
  );
};

// ── Testimonials (warm, ToolTime-style) ──────────────────────────────────
export function L2Testimonials() {
  const quotes = [
    { name: 'Marie Lambert', role: 'Co-Founder · Cassia', city: 'Berlin',
      q: 'In zwei Wochen hatten wir einen technischen Co-Founder, eine Anwältin und einen EXIST-Slot. Vorher: drei Monate Slack und €4.800 an Erstberatungen.', k: '€4.800', v: 'gespart' },
    { name: 'Jonas Kessler', role: 'Solo-Founder · ML-Agents', city: 'München',
      q: '„Ich brauche jemand für Distribution" — drei Tage später drei Telefonate. Mit Menschen, die meinen Prototyp gelesen hatten.', k: '3 Tage', v: 'bis Match' },
    { name: 'Sofia Hellström', role: 'COO → Solo-Founder', city: 'Wien',
      q: 'Aus meinem 4-Minuten-Voice-Memo baute der Co-Pilot einen Plan, den ich sonst mit zwei Beratern für €6k erstellt hätte. Und er stimmte.', k: '4 Min', v: 'ganzer Plan' },
  ];
  return (
    <L2Section tone="warm" pad="96px 0" id="stories">
      <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 48px' }}>
        <L2Eyebrow>Aus dem Netzwerk</L2Eyebrow>
        <L2H style={{ marginTop: 18 }}>Echte Founder. Echte Bewegungen.</L2H>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }} className="l2-3col">
        {quotes.map((q, i) => (
          <div key={i} style={{ borderRadius: 22, background: T.surface, border: `1px solid ${T.line}`,
            padding: 26, display: 'flex', flexDirection: 'column', gap: 18, boxShadow: T.shadowSoft }}>
            <div style={{ display: 'flex', gap: 3 }}>
              {[0,1,2,3,4].map(j => <MFServiceIcon key={j} name="sparkles" size={15} color={T.ember} stroke={2}/>)}
            </div>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, color: T.ink, letterSpacing: '-0.01em', textWrap: 'pretty', flex: 1 }}>„{q.q}"</p>
            <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'baseline', gap: 8,
              background: T.emberTint, borderRadius: 999, padding: '7px 14px' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: T.emberDeep, letterSpacing: '-0.02em' }}>{q.k}</span>
              <span style={{ fontSize: 12.5, color: T.emberDeep }}>{q.v}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 16, borderTop: `1px solid ${T.lineSoft}` }}>
              <MFAvatar name={q.name} size={42}/>
              <div>
                <div style={{ fontSize: 14, fontWeight: 620, color: T.ink }}>{q.name}</div>
                <div style={{ fontSize: 12, color: T.smoke, marginTop: 1 }}>{q.role} · {q.city}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </L2Section>
  );
};

// ── Pricing ──────────────────────────────────────────────────────────────
export function L2Pricing() {
  const tiers = [
    { name: 'Explorer', price: '€0', sub: 'für 90 Tage', blurb: 'Co-Pilot kennenlernen, einen Service freischalten.',
      feats: ['1 aktiver Service', '3 Empfehlungen / Woche', 'Co-Pilot · 20 Nachrichten/Tag', 'Marketplace lesen'], cta: 'Kostenlos starten', featured: false },
    { name: 'Founder', price: '€49', sub: '/ Monat · jährlich', blurb: 'Der volle Stack. Alle 8 Disziplinen. Co-Pilot ohne Limit.',
      feats: ['Alle 8 Services · unbegrenzt', 'Co-Pilot · Plan & Auto-Fill', 'Förderung-Pipeline', 'Anwalts-Erstgespräche · 3 inkl.', 'MCP-Zugang'], cta: 'Founder starten', featured: true },
    { name: 'Team', price: '€129', sub: '/ Monat · 3+ Sitze', blurb: 'Wenn ihr schon zu zweit oder zu dritt baut.',
      feats: ['Alles aus Founder', '3–10 Sitze · geteilte Pipeline', 'Shared Co-Pilot-Sessions', 'Onboarding-Coach', 'Cap-Table & ESOP'], cta: 'Team einrichten', featured: false },
  ];
  return (
    <L2Section tone="canvas" pad="96px 0" id="pricing">
      <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 48px' }}>
        <L2Eyebrow>Preise</L2Eyebrow>
        <L2H style={{ marginTop: 18 }}>Weniger als eine Erstberatung.</L2H>
        <p style={{ fontSize: 16.5, lineHeight: 1.55, color: T.smoke, marginTop: 16, maxWidth: 500, marginInline: 'auto', textWrap: 'pretty' }}>
          Transparent, jährlich kündbar. Niemand zahlt für Sichtbarkeit — Empfehlungen ergeben sich aus Phase, nicht Provision.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, alignItems: 'stretch' }} className="l2-3col">
        {tiers.map((t, i) => {
          const feat = t.featured;
          return (
            <div key={i} style={{ borderRadius: 24, padding: 30, display: 'flex', flexDirection: 'column', gap: 16,
              background: feat ? T.ink : T.surface, color: feat ? '#F5F2EC' : T.ink,
              border: feat ? '1px solid ' + T.ink : `1px solid ${T.line}`,
              boxShadow: feat ? T.shadow : T.shadowSoft, transform: feat ? 'translateY(-10px)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
                  color: feat ? 'rgba(245,242,236,0.6)' : T.smoke }}>{t.name}</span>
                {feat && <span style={{ padding: '3px 9px', borderRadius: 999, background: T.ember, color: '#fff', fontFamily: T.mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em' }}>EMPFOHLEN</span>}
              </div>
              <div>
                <span style={{ fontSize: 52, fontWeight: 720, letterSpacing: '-0.04em', color: feat ? '#F5F2EC' : T.ink }}>{t.price}</span>
                <span style={{ fontSize: 14, color: feat ? 'rgba(245,242,236,0.6)' : T.smoke, marginLeft: 8 }}>{t.sub}</span>
              </div>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: feat ? 'rgba(245,242,236,0.7)' : T.smoke, textWrap: 'pretty' }}>{t.blurb}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16,
                borderTop: feat ? '1px solid rgba(255,255,255,0.12)' : `1px solid ${T.lineSoft}` }}>
                {t.feats.map((f, j) => (
                  <div key={j} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, lineHeight: 1.4 }}>
                    <MFServiceIcon name="check2" size={14} color={T.ember} stroke={2.5}/>
                    <span style={{ color: feat ? '#F5F2EC' : T.inkSoft }}>{f}</span>
                  </div>
                ))}
              </div>
              <a href="/auth" style={{ marginTop: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '14px 18px', borderRadius: 12, fontWeight: 620, fontSize: 14.5, textDecoration: 'none',
                background: feat ? T.ember : (i === 2 ? T.surface : T.ink), color: feat ? '#fff' : (i === 2 ? T.ink : '#F5F2EC'),
                border: i === 2 ? `1px solid ${T.line}` : 'none',
                boxShadow: feat ? `0 14px 30px -12px ${T.emberDeep}` : 'none' }}>
                {t.cta}<MFServiceIcon name="arrowR" size={13} color={feat ? '#fff' : (i === 2 ? T.ink : '#F5F2EC')} stroke={2.2}/>
              </a>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 26, textAlign: 'center', fontSize: 13, color: T.smoke }}>
        Alle Preise zzgl. USt. · 30 Tage Rückerstattung · keine Setup-Gebühr
      </div>
    </L2Section>
  );
};

// ── FAQ ──────────────────────────────────────────────────────────────────
export function L2Faq() {
  const items = [
    ['Ist das ein Dating-App-Klon für Founder?', 'Nein. Näher an einem Chief-of-Staff, der dich durch Gründung, Förderung und die ersten Hires begleitet — mit einem Co-Pilot vorne und 1.847 vorgeprüften Menschen dahinter. Swipe gibt es nicht.', true],
    ['Wer prüft die Anwälte, Steuerberater und Mentoren?', 'Jeder Partner durchläuft eine 4-Stufen-Prüfung: Branchenfit, Founder-Referenzen, Reaktionszeit-SLA, jährliche Re-Validierung. Wer länger als 14 Tage nicht antwortet, fällt aus dem Feed.', false],
    ['Bekommt jemand für eine Empfehlung Geld?', 'Niemand zahlt für Sichtbarkeit. Partner zahlen Mitgliedsgebühren, aber Reihenfolge und Konfidenz ergeben sich ausschließlich aus deinem Profil und deiner Phase.', false],
    ['Was passiert mit meinen Daten?', 'Dein Pitch wird nicht fürs KI-Training verwendet. Co-Pilot-Sessions sind verschlüsselt; nur du und gezielt freigegebene Partner sehen sie. AV-Verträge nach DSGVO in jedem Plan.', false],
    ['Funktioniert das außerhalb Deutschlands?', 'Heute: Berlin, München, Wien, Zürich. Recht & Steuer nach Jurisdiktion (DE/AT/CH), Co-Founder-Matching DACH-weit mit „remote ok"-Filter.', false],
  ];
  return (
    <L2Section tone="surface" pad="96px 0">
      <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: 72, alignItems: 'flex-start' }} className="l2-feature">
        <div>
          <L2Eyebrow>Häufige Fragen</L2Eyebrow>
          <L2H style={{ marginTop: 18 }} size="clamp(32px, 3.6vw, 46px)">Was Founder<br/>uns fragen.</L2H>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: T.smoke, marginTop: 18, maxWidth: 320 }}>
            Deine Frage nicht dabei? <a href="mailto:founders@matchfoundr.com" style={{ color: T.ember, textDecoration: 'underline', textUnderlineOffset: 3 }}>founders@matchfoundr.com</a> — Antwort in 24h.
          </p>
        </div>
        <div>
          {items.map(([q, a, open], i) => (
            <div key={i} style={{ padding: '22px 0', borderTop: `1px solid ${T.line}`, borderBottom: i === items.length - 1 ? `1px solid ${T.line}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18.5, fontWeight: 620, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.3 }}>{q}</div>
                  {open && <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.6, color: T.smoke, maxWidth: 600, textWrap: 'pretty' }}>{a}</p>}
                </div>
                <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: open ? T.ember : 'transparent',
                  border: open ? 'none' : `1px solid ${T.line}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MFServiceIcon name={open ? 'check2' : 'plus2'} size={12} color={open ? '#fff' : T.ink} stroke={2.4}/>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </L2Section>
  );
};

// ── CTA band (punch) ─────────────────────────────────────────────────────
export function L2Cta() {
  return (
    <section id="cta" style={{ background: T.ember, color: '#fff', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', bottom: -240, left: -120, width: 640, height: 640,
        background: 'radial-gradient(circle at center, rgba(255,255,255,0.22), transparent 66%)', pointerEvents: 'none' }}/>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '104px 40px', position: 'relative', textAlign: 'center' }}>
        <div style={{ fontFamily: T.mono, fontSize: 13, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)' }}>Bereit?</div>
        <h2 style={{ margin: '18px auto 0', fontWeight: 720, fontSize: 'clamp(48px, 7vw, 96px)', lineHeight: 0.98,
          letterSpacing: '-0.045em', maxWidth: 900, textWrap: 'balance' }}>
          Finde, was gründet.
        </h2>
        <p style={{ margin: '22px auto 0', fontSize: 18.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.9)', maxWidth: 560, textWrap: 'pretty' }}>
          Fünf Minuten reichen. Du erzählst, der Co-Pilot sortiert — und die Community trägt mit.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 36, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#start" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '18px 30px', borderRadius: 14,
            background: '#fff', color: T.emberDeep, fontWeight: 680, fontSize: 16, textDecoration: 'none' }}>
            Kostenlos starten<MFServiceIcon name="arrowR" size={16} color={T.emberDeep} stroke={2.2}/>
          </a>
          <a href="#demo" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '18px 28px', borderRadius: 14,
            background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontWeight: 560, fontSize: 16, textDecoration: 'none' }}>
            <MFServiceIcon name="play" size={16} color="#fff" stroke={2}/>Demo · 2:14
          </a>
        </div>
        <div style={{ marginTop: 30, display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', fontSize: 13.5, color: 'rgba(255,255,255,0.85)' }}>
          {['90 Tage kostenlos', 'Keine Kreditkarte', 'DSGVO · Hosting in DE'].map((t, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <MFServiceIcon name="check2" size={14} color="#fff" stroke={2.4}/>{t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

// ── Footer ─────────────────────────────────────────────────────────────
export function L2Footer() {
  const cols = [
    ['Plattform', ['Marketplace', 'Co-Pilot', 'MCP-Server', 'Pipeline', 'Förderung-Radar']],
    ['Disziplinen', ['Co-Founder', 'Recht', 'Steuer', 'Förderung', 'Mentoren', 'Talent']],
    ['Unternehmen', ['Über uns', 'Stories', 'Karriere', 'Presse', 'Partner werden']],
    ['Rechtliches', ['Impressum', 'Datenschutz', 'AGB', 'AV-Vertrag']],
  ];
  return (
    <footer style={{ background: T.ink, color: '#F5F2EC', padding: '72px 0 34px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(4, 1fr)', gap: 34, marginBottom: 50 }} className="l2-footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IconMF size={26} color="#F5F2EC" spark={T.ember}/>
              <span style={{ fontWeight: 700, fontSize: 21, letterSpacing: '-0.03em' }}>matchfoundr<MFWordmarkDot paper={T.ink} follow={false}/></span>
            </div>
            <p style={{ marginTop: 18, fontSize: 14, lineHeight: 1.6, color: 'rgba(245,242,236,0.62)', maxWidth: 280, textWrap: 'pretty' }}>
              Alles fürs Gründen an einem Ort — getragen von einer Community, die gemeinsam weiterkommt.
            </p>
          </div>
          {cols.map(([h, items], i) => (
            <div key={i}>
              <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(245,242,236,0.5)', marginBottom: 14 }}>{h}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {items.map((it, j) => (
                  <a key={j} href="#" style={{ fontSize: 14, color: 'rgba(245,242,236,0.82)', textDecoration: 'none' }}>{it}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ paddingTop: 26, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap',
          fontFamily: T.mono, fontSize: 11, letterSpacing: '0.08em', color: 'rgba(245,242,236,0.5)' }}>
          <span>© 2026 matchfoundr GmbH</span>
          <span>Berlin · München · Wien · Zürich</span>
        </div>
      </div>
    </footer>
  );
};
