// Builds the three SBS phone screens as SVG strings. Runs in a browser page that has Sora and Manrope loaded, so
// every line break, pill width and word highlight is measured with the real fonts.
// window.buildScreens() → { svgs: { name: svg }, chars: { Sora, Manrope } }. Fonts are embedded later by build.mjs
// (the placeholder <!--FONTS--> is replaced with subset @font-face rules).
(() => {
  'use strict';
  const W = 393, H = 852;                                     // screen in points (iPhone-class)
  const C = {
    ink: '#0b1220', body: '#3d4657', slate: '#5b6475', muted: '#8a93a3', line: '#e6eaf2', canvas: '#f6f8fc',
    em: '#10b981', em6: '#059669', em7: '#047857', mint: '#6ee7b7', mint50: '#e6fbf3', check: '#22c55e',
    navy: '#0b1220', peach: '#fdd9bf', peachInk: '#7c3a12', blue: '#e3e9f5', blueInk: '#1e3a8a', red: '#dc2626',
    black: '#050505', bar: '#dfe6f0',
  };
  const used = { Sora: new Set(), Manrope: new Set() };
  const cv = document.createElement('canvas').getContext('2d');

  // ── text ─────────────────────────────────────────────────────────────────
  const F = (fam, w, s, fill = C.ink, ls = 0) => ({ fam, w, s, fill, ls });
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const n = (v) => +(+v).toFixed(2);
  function measure(s, f) {
    cv.font = `${f.w} ${f.s}px ${f.fam}`;
    cv.letterSpacing = `${f.ls}px`;
    return cv.measureText(s).width;
  }
  function note(s, f) { for (const ch of s) used[f.fam].add(ch); }
  function attrs(f) {
    return `font-family="${f.fam}, sans-serif" font-size="${f.s}" font-weight="${f.w}"${f.ls ? ` letter-spacing="${f.ls}"` : ''}`;
  }
  // one line of text; anchor: start | middle | end
  function text(x, y, s, f, { anchor = 'start', fill = f.fill, opacity, extra = '' } = {}) {
    note(s, f);
    return `<text x="${n(x)}" y="${n(y)}" ${attrs(f)} fill="${fill}"${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}${opacity != null ? ` opacity="${opacity}"` : ''}${extra}>${esc(s)}</text>`;
  }
  // greedy word wrap → [{ s, words: [{ w, x0, x1 }] }]
  function wrap(s, f, maxW) {
    const words = s.split(' '), lines = [];
    let cur = [];
    for (const w of words) {
      const t = [...cur, w].join(' ');
      if (cur.length && measure(t, f) > maxW) { lines.push(cur); cur = [w]; } else cur.push(w);
    }
    if (cur.length) lines.push(cur);
    let gi = 0;
    return lines.map((ws) => {
      const s2 = ws.join(' ');
      const out = ws.map((w, k) => {
        const pre = ws.slice(0, k).join(' ') + (k ? ' ' : '');
        return { w, i: gi++, x0: measure(pre, f), x1: measure(pre + w, f) };
      });
      return { s: s2, words: out, width: measure(s2, f) };
    });
  }

  // like CSS text-wrap: pretty — no single word left alone on the last line (without adding a line)
  function wrapPretty(s, f, maxW) {
    let lines = wrap(s, f, maxW);
    const count = lines.length;
    for (let w = maxW - 4; lines.length > 1 && lines[lines.length - 1].words.length < 2 && w > maxW * 0.7; w -= 4) {
      const t = wrap(s, f, w);
      if (t.length > count) break;
      lines = t;
    }
    return lines;
  }

  // ── shapes & icons ───────────────────────────────────────────────────────
  const rect = (x, y, w, h, r, a = '') => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${r ? ` rx="${n(r)}"` : ''} ${a}/>`;
  // rounded rect with per-corner radii [tl, tr, br, bl]
  function rr4(x, y, w, h, [a, b, c, d], attr = '') {
    return `<path d="M${n(x + a)} ${n(y)}H${n(x + w - b)}Q${n(x + w)} ${n(y)} ${n(x + w)} ${n(y + b)}V${n(y + h - c)}Q${n(x + w)} ${n(y + h)} ${n(x + w - c)} ${n(y + h)}H${n(x + d)}Q${n(x)} ${n(y + h)} ${n(x)} ${n(y + h - d)}V${n(y + a)}Q${n(x)} ${n(y)} ${n(x + a)} ${n(y)}Z" ${attr}/>`;
  }
  // stroke icons drawn on a 24-unit grid, placed with their top-left at (x, y) and scaled to `size`
  const ICON = {
    bolt: 'M13 2 4 14h8l-1 8 9-12h-8l1-8z',
    arrow: 'M7 17 17 7M9 7h8v8',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    phoneDown: 'M3.5 13.2c4.9-4 12.1-4 17 0l-1.6 3.1c-.3.6-1 .8-1.6.6l-2.8-1.1c-.5-.2-.8-.7-.8-1.2v-1.5c-2.4-.8-4.9-.8-7.3 0v1.5c0 .5-.3 1-.8 1.2l-2.8 1.1c-.6.2-1.3 0-1.6-.6z',
    headset: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H5a1 1 0 0 1-1-1zM20 14h-3v6h2a1 1 0 0 0 1-1zM17 20c0 1.5-2 2-5 2',
    bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0',
    home: 'M4 11 12 4l8 7v9h-5v-6H9v6H4z',
    phone: 'M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z',
    calendar: 'M5 6h14v14H5zM5 10h14M9 3.5V7M15 3.5V7',
    sliders: 'M5 7h9M18 7h1M5 17h3M12 17h7M16 4.5v5M10 14.5v5',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2',
    chevron: 'M8 10l4 4 4-4',
  };
  function icon(name, x, y, size, color, sw = 2) {
    const k = size / 24;
    return `<path d="${ICON[name]}" transform="translate(${n(x)} ${n(y)}) scale(${n(k)})" fill="none" stroke="${color}" stroke-width="${n(sw / k)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  // SBS helmet (traced logo, 1760×520 space, helmet bbox x 31..478, y 28..484), fitted to height h, top-left (x, y)
  function helmet(x, y, h, fill) {
    const k = h / 456;
    return `<path d="${window.SBS_HELMET_D}" transform="translate(${n(x - 31 * k)} ${n(y - 28 * k)}) scale(${n(k)})" fill="${fill}" fill-rule="evenodd"/>`;
  }
  // full lockup (helmet + SBS wordmark) at logo height h (the PNG's 520 units), top-left (x, y); returns { svg, w }
  function logo(x, y, h, fill) {
    const k = h / 520;
    return {
      svg: `<g transform="translate(${n(x - 31 * k)} ${n(y)}) scale(${n(k)})" fill="${fill}"><path d="${window.SBS_HELMET_D}" fill-rule="evenodd"/><path d="${window.SBS_WORDMARK_D}" fill-rule="evenodd"/></g>`,
      w: (1739 - 31) * k,
    };
  }
  // seeded random, so every build draws the same stars and bars
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  // ── status bar & island (shared by all screens) ──────────────────────────
  function statusBar(col = C.ink) {
    const f = F('Manrope', 700, 16.5, col);
    const sig = [0, 1, 2, 3].map((i) => rect(301 + i * 5, 33 - (4 + i * 2.6), 3.2, 4 + i * 2.6, 1, `fill="${col}"`)).join('');
    const wifi = `<g fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round"><path d="M322 26.5a10 10 0 0 1 13 0"/><path d="M324.6 29.6a6 6 0 0 1 7.8 0"/></g><circle cx="328.5" cy="32.3" r="1.6" fill="${col}"/>`;
    const bat = `${rect(342, 23.5, 25, 12, 3.6, `fill="none" stroke="${col}" stroke-opacity=".4" stroke-width="1"`)}${rect(344, 25.5, 19, 8, 2, `fill="${col}"`)}${rect(368.2, 27.5, 1.6, 4, 0.8, `fill="${col}" fill-opacity=".4"`)}`;
    return `<g>${text(72, 35, '9:41', f, { anchor: 'middle' })}${sig}${wifi}${bat}</g>`;
  }
  const island = (w = 125, h = 37) => rect((W - w) / 2, 11, w, h, h / 2, 'fill="#000"');
  const homeBar = (col = C.ink) => rect((W - 134) / 2, H - 13, 134, 5, 2.5, `fill="${col}"`);

  // ── device frame (identical for all three) ───────────────────────────────
  // body 415×874 with 11 pt bezel; side buttons stick out 4 pt, so the canvas is 423 wide
  const DEV = { w: 423, h: 874, sx: 15, sy: 11, r: 55 };
  function device(id, screen, defs) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${DEV.w}" height="${DEV.h}" viewBox="0 0 ${DEV.w} ${DEV.h}">
<!--FONTS-->
<defs>
<linearGradient id="${id}-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4f58"/><stop offset=".35" stop-color="#1c1f24"/><stop offset=".7" stop-color="#2c3037"/><stop offset="1" stop-color="#16181c"/></linearGradient>
<clipPath id="${id}-scr"><rect x="${DEV.sx}" y="${DEV.sy}" width="${W}" height="${H}" rx="${DEV.r}"/></clipPath>
${defs}
</defs>
<g fill="#22252b">${rect(1, 150, 4, 32, 1.5)}${rect(1, 204, 4, 58, 1.5)}${rect(1, 274, 4, 58, 1.5)}${rect(418, 228, 4, 92, 1.5)}</g>
${rect(4, 0, 415, 874, 66, `fill="url(#${id}-rim)"`)}
${rect(5.5, 1.5, 412, 871, 64.5, 'fill="#08090b"')}
<g clip-path="url(#${id}-scr)"><g transform="translate(${DEV.sx} ${DEV.sy})">
${screen}
</g></g>
</svg>`;
  }
  // the same screen without the device, corners rounded like the display
  function bare(id, screen, defs) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<!--FONTS-->
<defs>
<clipPath id="${id}-scr"><rect width="${W}" height="${H}" rx="${DEV.r}"/></clipPath>
${defs}
</defs>
<g clip-path="url(#${id}-scr)">
${screen}
</g>
</svg>`;
  }
  const shadow = (id, dy, blur, op, col = '#0b1220') => `<filter id="${id}" x="-30%" y="-30%" width="160%" height="190%"><feDropShadow dx="0" dy="${dy}" stdDeviation="${blur}" flood-color="${col}" flood-opacity="${op}"/></filter>`;

  // ═══ 1 · Voice-Agent: live call ══════════════════════════════════════════
  function voiceAgent() {
    const id = 'va';
    const defs = [
      `<radialGradient id="${id}-glow" cx="196.5" cy="150" r="300" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.mint50}"/><stop offset=".55" stop-color="${C.mint50}" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
      `<radialGradient id="${id}-orb" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${C.mint50}"/><stop offset="1" stop-color="${C.mint50}" stop-opacity="0"/></radialGradient>`,
      `<linearGradient id="${id}-card" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#111a2e"/><stop offset="1" stop-color="${C.navy}"/></linearGradient>`,
      shadow(`${id}-sh`, 8, 10, 0.14), shadow(`${id}-sh2`, 6, 9, 0.08), shadow(`${id}-sh3`, 14, 16, 0.22),
    ].join('\n');
    const o = [];
    o.push(rect(0, 0, W, H, 0, 'fill="#fff"'), rect(0, 0, W, 420, 0, `fill="url(#${id}-glow)"`));
    o.push(statusBar());
    // island as a live activity: speaking bars + call timer
    o.push(island(170));
    [9, 15, 11, 6].forEach((h, i) => o.push(rect(126 + i * 6, 29.5 - h / 2, 3, h, 1.5, `fill="${C.em}"`)));
    o.push(text(266, 34.5, '0:42', F('Manrope', 700, 14, '#fff'), { anchor: 'end' }));
    // header
    o.push(text(24, 79, 'SBS VOICE-AGENT', F('Manrope', 800, 10.5, C.slate, 1.5)));
    o.push(text(24, 101, 'Elektro Wagner GmbH', F('Manrope', 700, 17, C.ink)));
    const lf = F('Manrope', 800, 10.5, C.em7, 1.3), lw = measure('LIVE', lf);
    const lx = W - 24 - (lw + 32);
    o.push(rect(lx, 75, lw + 32, 26, 13, `fill="${C.mint50}"`), `<circle cx="${n(lx + 14)}" cy="88" r="3.6" fill="${C.em}"/>`, text(lx + 23, 92, 'LIVE', lf));
    // orb: helmet on a white disc, pulse rings
    const oy = 188;
    o.push(`<circle cx="196.5" cy="${oy}" r="96" fill="url(#${id}-orb)"/>`);
    [[80, 0.18], [66, 0.32], [54, 0.5]].forEach(([r, a]) => o.push(`<circle cx="196.5" cy="${oy}" r="${r}" fill="none" stroke="${C.mint}" stroke-opacity="${a}" stroke-width="1.5"/>`));
    o.push(`<circle cx="196.5" cy="${oy}" r="44" fill="#fff" filter="url(#${id}-sh)"/>`, helmet(196.5 - 25.6, oy - 26, 52, C.ink));
    // voice bars: the agent is speaking (dotted where idle, like the website)
    const R = rng(7), by = 266;
    for (let i = 0; i < 32; i++) {
      const x = 196.5 + (i - 15.5) * 9 - 2;
      const edge = i < 4 || i > 27;
      const env = Math.sin(Math.PI * (i - 3) / 25) ** 0.7;
      const h = edge ? 4 : Math.max(4, 6 + 22 * env * (0.45 + 0.55 * R()));
      o.push(rect(x, by - h / 2, 4, h, 2, `fill="${C.em}"${edge ? ' fill-opacity=".45"' : ''}`));
    }
    o.push(text(196.5, 303, 'Agent spricht …', F('Manrope', 600, 14.5, C.ink), { anchor: 'middle' }));
    // live transcript
    const tl = F('Manrope', 800, 10, C.muted, 1.5), tlw = measure('LIVE-TRANSKRIPT', tl);
    o.push(text(24, 334, 'LIVE-TRANSKRIPT', tl), `<path d="M${n(24 + tlw + 10)} 330.5H${W - 24}" stroke="${C.line}" stroke-width="1"/>`);
    const bf = F('Manrope', 500, 14.5), LH = 20, PX = 13, PT = 10, PB = 9;
    function bubble(y, ki, label, s, marks = [], live = false) {
      const lines = wrap(s, bf, 262);
      const tw = Math.max(...lines.map((l) => l.width));
      const bw = tw + 2 * PX, bh = PT + lines.length * LH + PB;
      const bx = ki ? 24 : W - 24 - bw, top = y + 15;
      o.push(text(ki ? 24 : W - 24, y + 8, label, F('Manrope', 800, 9.5, ki ? C.em7 : C.slate, 1.3), { anchor: ki ? 'start' : 'end' }));
      o.push(rr4(bx, top, bw, bh, ki ? [18, 18, 18, 6] : [18, 18, 6, 18], ki ? `fill="${C.em}"` : `fill="#fff" stroke="${C.line}" filter="url(#${id}-sh2)"`));
      const last = lines.flatMap((l) => l.words).length - 1;
      lines.forEach((l, li) => {
        const base = top + PT + li * LH + 15;
        for (const w of l.words) {
          if (!marks.includes(w.i)) continue;
          const nx = l.words.find((v) => v.i === w.i + 1);
          const x1 = nx && marks.includes(nx.i) ? nx.x0 : w.x1;      // a marked run is one box
          o.push(rect(bx + PX + w.x0 - 3, base - 14.5, x1 - w.x0 + 6, 19.5, 5, ki ? `fill="${C.em7}" fill-opacity=".55"` : `fill="${C.mint50}"`));
          if (!ki) o.push(rect(bx + PX + w.x0 - 3, base + 3.6, x1 - w.x0 + 6, 1.6, 0.8, `fill="${C.em}"`));
        }
        if (live && l.words.some((w) => w.i === last)) {
          // the word being heard right now is still settling in
          const pre = l.words.filter((w) => w.i < last).map((w) => w.w).join(' ');
          const wl = l.words.find((w) => w.i === last);
          if (pre) o.push(text(bx + PX, base, pre, bf, { fill: ki ? '#fff' : C.ink }));
          o.push(text(bx + PX + wl.x0, base, wl.w, bf, { fill: ki ? '#fff' : C.ink, opacity: 0.55 }));
          o.push(rect(bx + PX + wl.x1 + 3, base - 13, 2, 16, 1, `fill="${ki ? '#fff' : C.ink}"`));
        } else o.push(text(bx + PX, base, l.s, bf, { fill: ki ? '#fff' : C.ink }));
      });
      return top + bh;
    }
    let y = 348;
    y = bubble(y, true, 'KI-AGENT', 'Elektro Wagner, guten Tag! Wie kann ich Ihnen helfen?') + 11;
    y = bubble(y, false, 'ANRUFERIN', 'Bei uns im Büro fliegt ständig die Sicherung raus.', [7, 8]) + 11;
    y = bubble(y, true, 'KI-AGENT', 'Das klingt dringend. Morgen um 8 Uhr ist ein Techniker frei. Passt das?', [3, 4, 5, 6], true) + 14;
    // what the agent already did in the background
    const cy = y, ch = 142;
    o.push(rect(16, cy, W - 32, ch, 22, `fill="url(#${id}-card)" filter="url(#${id}-sh3)"`));
    o.push(text(34, cy + 29, 'IM HINTERGRUND ERLEDIGT', F('Manrope', 800, 10, C.mint, 1.5)));
    const pf = F('Manrope', 800, 9.5, C.peachInk, 0.8), pw = measure('PRIORITÄT HOCH', pf) + 20;
    o.push(rect(W - 34 - pw, cy + 15, pw, 21, 10.5, `fill="${C.peach}"`), text(W - 34 - pw / 2, cy + 29.2, 'PRIORITÄT HOCH', pf, { anchor: 'middle' }));
    const rows = [['done', 'Anliegen erkannt · Sicherung löst aus'], ['done', 'Anfrage im CRM angelegt'], ['busy', 'Termin morgen 08:00 wird reserviert …']];
    rows.forEach(([st, s], i) => {
      const ry = cy + 59 + i * 29, rx = 43;
      if (st === 'done') o.push(`<circle cx="${rx}" cy="${ry}" r="9.5" fill="${C.check}"/>`, icon('check', rx - 6.5, ry - 6.5, 13, '#fff', 2.4));
      else o.push(`<circle cx="${rx}" cy="${ry}" r="8.5" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>`, `<path d="M${rx} ${ry - 8.5}a8.5 8.5 0 0 1 8.5 8.5" fill="none" stroke="${C.mint}" stroke-width="2" stroke-linecap="round"/>`);
      o.push(text(62, ry + 5, s, F('Manrope', 600, 14, '#fff'), { opacity: st === 'done' ? null : 0.72 }));
    });
    // call controls
    const by2 = cy + ch + 16, bw2 = 166, bh2 = 48;
    const bfont = F('Manrope', 700, 15);
    const x1 = W / 2 - 6 - bw2, x2 = W / 2 + 6;
    o.push(rect(x1, by2, bw2, bh2, 14, `fill="${C.red}"`));
    const t1 = measure('Auflegen', bfont), g1 = x1 + (bw2 - (20 + 9 + t1)) / 2;
    o.push(icon('phoneDown', g1, by2 + 14, 20, '#fff', 2), text(g1 + 29, by2 + 29.5, 'Auflegen', bfont, { fill: '#fff' }));
    o.push(rect(x2, by2, bw2, bh2, 14, `fill="#fff" stroke="${C.line}"`));
    const t2 = measure('Übernehmen', bfont), g2 = x2 + (bw2 - (19 + 9 + t2)) / 2;
    o.push(icon('headset', g2, by2 + 14.5, 19, C.ink, 2), text(g2 + 28, by2 + 29.5, 'Übernehmen', bfont, { fill: C.ink }));
    o.push(homeBar());
    if (by2 + bh2 > H - 22) throw new Error(`voice agent screen overflows: controls end at ${by2 + bh2}`);
    return { id, screen: o.join('\n'), defs };
  }

  // ═══ 2 · SBS website, mobile hero ════════════════════════════════════════
  function website() {
    const id = 'web';
    const vr = 0.42 * H / (0.48 * W);
    const shine = (wid, x0, x1) => `<linearGradient id="${wid}" x1="${n(x0)}" y1="0" x2="${n(x1)}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.em7}"/><stop offset=".3" stop-color="${C.em}"/><stop offset=".45" stop-color="#4fd8a3"/><stop offset=".6" stop-color="${C.em}"/><stop offset="1" stop-color="${C.em7}"/></linearGradient>`;
    const defs = [
      `<radialGradient id="${id}-veil" cx="${W / 2}" cy="${0.46 * H}" r="${0.48 * W}" gradientUnits="userSpaceOnUse" gradientTransform="translate(${W / 2} ${0.46 * H}) scale(1 ${n(vr)}) translate(${-W / 2} ${-0.46 * H})"><stop offset=".3" stop-color="#fff" stop-opacity=".96"/><stop offset=".65" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
      `<radialGradient id="${id}-glow" cx="${W / 2}" cy="${H / 2}" r="600" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.em}" stop-opacity=".12"/><stop offset=".6" stop-color="${C.em}" stop-opacity="0"/></radialGradient>`,
      `<linearGradient id="${id}-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f172a" stop-opacity=".15"/><stop offset=".55" stop-color="#0f172a" stop-opacity=".15"/><stop offset=".8" stop-color="${C.mint}" stop-opacity=".95"/><stop offset=".9" stop-color="#fff"/><stop offset="1" stop-color="#0f172a" stop-opacity=".15"/></linearGradient>`,
      `<filter id="${id}-blur" x="-50%" y="-80%" width="200%" height="260%"><feGaussianBlur stdDeviation="13"/></filter>`,
      `<filter id="${id}-emglow" x="-30%" y="-60%" width="160%" height="220%"><feDropShadow dx="0" dy="0" stdDeviation="9" flood-color="${C.em}" flood-opacity=".45"/></filter>`,
    ];
    const o = [];
    // the site's soft "0 30px 70px -30px" shadow: a blurred, inset slab under the element
    const under = (x, y, w, h, a = 0.2) => rect(x + w * 0.14, y + h * 0.5, w * 0.72, h * 0.7, h * 0.35, `fill="#0f172a" fill-opacity="${a}" filter="url(#${id}-blur)"`);
    o.push(rect(0, 0, W, H, 0, 'fill="#fff"'));
    // warp star field, light variant, at rest: short streaks from the centre (same rules as the site's canvas)
    const R = rng(20251009), stars = [];
    for (let k = 0; k < 320; k++) {
      const x = (R() - 0.5) * W * 2, y0 = (R() - 0.5) * H * 2, z = 1 + R() * (W - 1), pz = z + 1.6, f = 250;
      const sx = x / z * f + W / 2, sy = y0 / z * f + H / 2, px = x / pz * f + W / 2, py = y0 / pz * f + H / 2;
      if (sx < 0 || sx > W || sy < 0 || sy > H) continue;
      const a = Math.min(1, Math.max(0.1, 1 - z / W)), lw = (1 - z / W) * 2.5 + 0.5;
      const em = Math.abs(x) % 7 < 1.6;
      stars.push(`<path d="M${n(px)} ${n(py)}L${n(sx)} ${n(sy)}" stroke="${em ? C.em : C.ink}" stroke-opacity="${n(em ? a : a * 0.75)}" stroke-width="${n(lw)}"/>`);
    }
    o.push(`<g stroke-linecap="round">${stars.join('')}</g>`);
    o.push(rect(0, 0, W, H, 0, `fill="url(#${id}-veil)"`), rect(0, 0, W, H, 0, `fill="url(#${id}-glow)"`));
    o.push(statusBar());
    o.push(island());
    // header: glass pill with logo and the two-bar menu button
    const ny = 56;
    o.push(under(16, ny, W - 32, 56, 0.08), rect(16, ny, W - 32, 56, 28, `fill="#fff" fill-opacity=".72" stroke="#fff" stroke-opacity=".9"`));
    o.push(logo(36, ny + 16, 24, C.ink).svg);
    o.push(`<circle cx="${W - 16 - 6 - 22}" cy="${ny + 28}" r="22" fill="${C.black}"/>`);
    o.push(rect(W - 44 - 9, ny + 28 - 4.5, 18, 2, 1, 'fill="#fff"'), rect(W - 44 - 9, ny + 28 + 2.5, 18, 2, 1, 'fill="#fff"'));
    // hero block, centred in the viewport like the site (flex column, gap 28)
    const tagF = F('Manrope', 600, 13, C.ink), tagS = 'KI-Software · Web Apps · Automatisierung';
    const tagW = 12 + 8 + 10 + measure(tagS, tagF) + 16, tagH = 34;
    const hs = 38, hlh = hs * 0.98, hF = F('Sora', 600, hs, C.ink, n(-0.055 * hs)), hI = F('Sora', 500, hs, C.ink, n(-0.04 * hs));
    const pF = F('Manrope', 500, 17, C.body), plh = 17 * 1.55;
    const pLines = wrapPretty('SBS entwickelt KI-Agenten, Web Apps und Automatisierungen für den Mittelstand – von der ersten Idee bis zum laufenden System.', pF, W - 48);
    const b1F = F('Manrope', 600, 16, '#FAFAFA'), b2F = F('Manrope', 600, 16, C.ink);
    const b1W = 2 + 28 + 16 + 10 + measure('Projekt starten', b1F) + 28, b2W = 26 + 13 + 10 + measure('Voice-Agent live testen', b2F) + 26;
    const gap = 28, blockH = tagH + gap + 4 * hlh + gap + pLines.length * plh + gap + 56 + 12 + 56;
    let y = (H - blockH) / 2;
    // tag pill with the pulsing dot
    const tx = (W - tagW) / 2;
    o.push(under(tx, y, tagW, tagH), rect(tx, y, tagW, tagH, tagH / 2, `fill="#fff" fill-opacity=".9" stroke="#fff" stroke-opacity=".9"`));
    o.push(`<circle cx="${n(tx + 16)}" cy="${n(y + 17)}" r="8" fill="${C.em}" fill-opacity=".18"/><circle cx="${n(tx + 16)}" cy="${n(y + 17)}" r="4" fill="${C.em}"/>`);
    o.push(text(tx + 30, y + 21.6, tagS, tagF));
    y += tagH + gap;
    // headline: 4 lines (line-height .98), "KI-Software" in a synthetic oblique, "messbares Wachstum" in the emerald shine
    const base = (i) => y + hlh * i + hlh * 0.5 + hs * 0.36;   // baseline inside each line box
    const sp = measure(' ', hF);
    o.push(text(W / 2, base(0), 'Wir bauen', hF, { anchor: 'middle' }));
    const kiW = measure('KI-Software', hI);
    o.push(`<g transform="translate(${n(W / 2)} ${n(base(1))}) skewX(-12)">${text(0, 0, 'KI-Software', hI, { anchor: 'middle' })}</g>`);
    const furW = measure('für', hF), mW = measure('messbares', hF), l3 = furW + sp + mW, l3x = (W - l3) / 2;
    defs.push(shine(`${id}-shine1`, l3x + furW + sp, l3x + l3));
    o.push(text(l3x, base(2), 'für', hF));
    o.push(text(l3x + furW + sp, base(2), 'messbares', hF, { fill: `url(#${id}-shine1)` }));
    o.push(rect(l3x + furW + sp, base(2) + 7, mW + hF.ls, 0.07 * hs, 1.3, `fill="${C.em}"`));
    const wW = measure('Wachstum', hF), aW = 0.62 * hs, l4 = wW + 0.12 * hs + aW, l4x = (W - l4) / 2;
    defs.push(shine(`${id}-shine2`, l4x, l4x + wW));
    o.push(text(l4x, base(3), 'Wachstum', hF, { fill: `url(#${id}-shine2)` }));
    o.push(rect(l4x, base(3) + 7, wW + hF.ls, 0.07 * hs, 1.3, `fill="${C.em}"`));
    const ax = l4x + wW + 0.12 * hs, ay = base(3) - 0.12 * hs - aW;
    o.push(rect(ax, ay, aW, aW, 0.18 * hs, `fill="${C.em}"`), icon('arrow', ax + aW * 0.15, ay + aW * 0.15, aW * 0.7, '#04140d', 3));
    y += 4 * hlh + gap;
    // paragraph
    pLines.forEach((l, i) => o.push(text(W / 2, y + plh * i + plh * 0.5 + 6, l.s, pF, { anchor: 'middle' })));
    y += pLines.length * plh + gap;
    // buttons (they wrap onto two rows at phone width, as on the site)
    const b1x = (W - b1W) / 2;
    o.push(rect(b1x, y, b1W, 56, 14, `fill="url(#${id}-ring)" filter="url(#${id}-emglow)"`));
    o.push(rect(b1x + 1, y + 1, b1W - 2, 54, 13, `fill="${C.black}"`));
    o.push(icon('bolt', b1x + 29, y + 20, 16, '#E5E5E5', 2), text(b1x + 29 + 16 + 10, y + 33.5, 'Projekt starten', b1F));
    y += 56 + 12;
    const b2x = (W - b2W) / 2;
    o.push(under(b2x, y, b2W, 56), rect(b2x, y, b2W, 56, 14, `fill="#fff" fill-opacity=".9" stroke="#fff" stroke-opacity=".9"`));
    [12, 16, 9].forEach((h, i) => o.push(rect(b2x + 26 + i * 5, y + 28 - h / 2, 3, h, 1.5, `fill="${C.em}"`)));
    o.push(text(b2x + 26 + 13 + 10, y + 33.5, 'Voice-Agent live testen', b2F));
    // scroll cue
    o.push(text(W / 2 + 0.9, H - 26 - 44 - 10 - 3, 'SCROLLEN', F('Manrope', 600, 11, C.slate, 1.76), { anchor: 'middle' }));
    o.push(rect(W / 2 - 0.5, H - 26 - 44, 1, 44, 0, `fill="${C.ink}"`));
    o.push(homeBar());
    return { id, screen: o.join('\n'), defs: defs.join('\n') };
  }

  // ═══ 3 · Admin dashboard ═════════════════════════════════════════════════
  function dashboard() {
    const id = 'db';
    const defs = [
      `<radialGradient id="${id}-glow" cx="330" cy="70" r="280" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.mint50}"/><stop offset="1" stop-color="${C.canvas}" stop-opacity="0"/></radialGradient>`,
      shadow(`${id}-card`, 6, 10, 0.06), shadow(`${id}-tab`, -4, 10, 0.06),
    ].join('\n');
    const o = [];
    const card = (x, y, w, h, r = 20) => rect(x, y, w, h, r, `fill="#fff" stroke="${C.line}" filter="url(#${id}-card)"`);
    o.push(rect(0, 0, W, H, 0, `fill="${C.canvas}"`), rect(0, 0, W, 360, 0, `fill="url(#${id}-glow)"`));
    o.push(statusBar(), island());
    // top bar: logo, notifications, account
    o.push(logo(24, 66, 22, C.ink).svg);
    o.push(`<circle cx="${W - 24 - 20 - 48}" cy="77" r="20" fill="#fff" stroke="${C.line}"/>`, icon('bell', W - 24 - 20 - 48 - 9.5, 67.5, 19, C.ink, 1.9), `<circle cx="${W - 24 - 20 - 48 + 7}" cy="69.5" r="4" fill="${C.em}" stroke="#fff" stroke-width="2"/>`);
    o.push(`<circle cx="${W - 24 - 20}" cy="77" r="20" fill="${C.ink}"/>`, text(W - 24 - 20, 81.5, 'EW', F('Manrope', 800, 13, '#fff'), { anchor: 'middle' }));
    // title + period
    o.push(text(24, 127, 'ADMIN · ELEKTRO WAGNER', F('Manrope', 800, 10, C.em7, 1.5)));
    o.push(text(24, 158, 'Übersicht', F('Sora', 600, 29, C.ink, -1.3)));
    const perF = F('Manrope', 700, 13, C.ink), perT = measure('7 Tage', perF), perW = 32 + perT + 6 + 14 + 10, px = W - 24 - perW;
    o.push(rect(px, 134, perW, 32, 16, `fill="#fff" stroke="${C.line}"`), icon('calendar', px + 11, 142, 16, C.slate, 1.9));
    o.push(text(px + 32, 154.5, '7 Tage', perF), icon('chevron', px + 32 + perT + 6, 143, 14, C.slate, 2));
    // agent status with an on switch
    const ay = 176;
    o.push(card(24, ay, W - 48, 64, 18));
    o.push(rect(38, ay + 12, 40, 40, 12, `fill="${C.ink}"`), helmet(38 + 9.3, ay + 12 + 9.2, 21.6, '#fff'));
    o.push(text(90, ay + 29, 'Voice-Agent ist online', F('Manrope', 700, 15, C.ink)));
    o.push(`<circle cx="94" cy="${ay + 44}" r="3.5" fill="${C.em}"/>`, text(103, ay + 48, 'Nimmt alle Anrufe an · 24/7', F('Manrope', 500, 12, C.slate)));
    o.push(rect(W - 38 - 46, ay + 18, 46, 28, 14, `fill="${C.em}"`), `<circle cx="${W - 38 - 14}" cy="${ay + 32}" r="11" fill="#fff"/>`);
    // stat tiles (last 7 days)
    const kx = [24, 24 + (W - 48 - 12) / 2 + 12], kw = (W - 48 - 12) / 2, kh = 82, ky = [ay + 64 + 12, ay + 64 + 12 + kh + 12];
    const kpis = [
      ['Anrufe angenommen', '290', '+12 % ggü. Vorwoche', 'up'],
      ['Termine gebucht', '104', '36 % der Anrufe', null],
      ['Ø Annahmezeit', '0,8 s', 'beim 1. Klingeln', null],
      ['Verpasste Anrufe', '0', 'in 7 Tagen', 'ok'],
    ];
    kpis.forEach(([lab, val, sub, kind], i) => {
      const x = kx[i % 2], y = ky[i >> 1];
      o.push(card(x, y, kw, kh, 18));
      o.push(text(x + 16, y + 23, lab, F('Manrope', 600, 12, C.slate)));
      o.push(text(x + 16, y + 54, val, F('Sora', 600, 26, C.ink, -0.9)));
      const sf = F('Manrope', 600, 11, kind ? C.em7 : C.muted);
      if (kind === 'up') o.push(`<path d="M${x + 16} ${y + 70.5}l4-5 4 5z" fill="${C.em}"/>`);
      if (kind === 'ok') o.push(`<circle cx="${x + 20}" cy="${y + 67.5}" r="5" fill="${C.check}"/>`, icon('check', x + 16.6, y + 64.1, 6.8, '#fff', 1.6));
      o.push(text(x + 16 + (kind ? 13 : 0), y + 71.5, sub, sf));
    });
    // calls per day: one series, so no legend; today in emerald, the other days recessive
    const cyy = ky[1] + kh + 12, chH = 160;
    o.push(card(24, cyy, W - 48, chH, 20));
    o.push(text(40, cyy + 28, 'Anrufe pro Tag', F('Manrope', 700, 14, C.ink)), text(W - 40, cyy + 28, '290 gesamt', F('Manrope', 600, 12, C.muted), { anchor: 'end' }));
    const days = [['Fr', 52], ['Sa', 21], ['So', 11], ['Mo', 63], ['Di', 71], ['Mi', 58], ['Heute', 14]];
    const px0 = 66, px1 = W - 40, base = cyy + chH - 32, top = cyy + 48, vmax = 80;
    [0, 40, 80].forEach((v) => {
      const gy = base - (base - top) * v / vmax;
      o.push(`<path d="M${px0} ${n(gy)}H${px1}" stroke="${v ? C.line : '#d5dbe6'}" stroke-width="1"/>`, text(px0 - 10, gy + 4, String(v), F('Manrope', 600, 10.5, C.muted), { anchor: 'end' }));
    });
    const slot = (px1 - px0) / days.length;
    days.forEach(([d, v], i) => {
      const cx = px0 + slot * (i + 0.5), bw = 22, bh = (base - top) * v / vmax, today = i === days.length - 1;
      o.push(rr4(cx - bw / 2, base - bh, bw, bh, [4, 4, 0, 0], `fill="${today ? C.em : C.bar}"`));
      o.push(text(cx, base + 17, d, F('Manrope', today ? 800 : 600, 10.5, today ? C.ink : C.muted), { anchor: 'middle' }));
      if (v === 71 || today) o.push(text(cx, base - bh - 6, String(v), F('Manrope', 700, 11, C.ink), { anchor: 'middle' }));
    });
    // latest calls
    const ly = cyy + chH + 12, lh = 136;
    o.push(card(24, ly, W - 48, lh, 20));
    o.push(text(40, ly + 28, 'Letzte Anrufe', F('Manrope', 700, 14, C.ink)), text(W - 40, ly + 28, 'Alle ansehen', F('Manrope', 700, 12, C.em7), { anchor: 'end' }));
    const calls = [
      ['SK', 'Sabine Krüger', 'Sicherung löst aus · 09:12', 'Termin gebucht', 'ok'],
      ['JW', 'Jonas Weber', 'Angebot Wallbox · 08:47', 'Rückruf geplant', 'later'],
    ];
    calls.forEach(([ini, name, sub, st, kind], i) => {
      const ry = ly + 46 + i * 45;
      if (i) o.push(`<path d="M40 ${ry - 6}H${W - 40}" stroke="${C.line}"/>`);
      o.push(`<circle cx="57" cy="${ry + 17}" r="17" fill="${kind === 'ok' ? C.mint50 : C.blue}"/>`, text(57, ry + 21.5, ini, F('Manrope', 800, 12, kind === 'ok' ? C.em7 : C.blueInk), { anchor: 'middle' }));
      o.push(text(83, ry + 13, name, F('Manrope', 700, 14, C.ink)), text(83, ry + 31, sub, F('Manrope', 500, 12, C.slate)));
      const sf = F('Manrope', 700, 11, kind === 'ok' ? C.em7 : C.blueInk), sw = measure(st, sf) + 34, sx = W - 40 - sw;
      o.push(rect(sx, ry + 4, sw, 26, 13, `fill="${kind === 'ok' ? C.mint50 : C.blue}"`));
      o.push(kind === 'ok' ? icon('check', sx + 9, ry + 10.5, 13, C.em7, 2.4) : icon('clock', sx + 9, ry + 10.5, 13, C.blueInk, 2.2));
      o.push(text(sx + 26, ry + 21, st, sf));
    });
    // tab bar
    const tb = H - 84;
    o.push(rect(0, tb, W, 84, 0, `fill="#fff" filter="url(#${id}-tab)"`), `<path d="M0 ${tb}H${W}" stroke="${C.line}"/>`);
    [['home', 'Übersicht'], ['phone', 'Anrufe'], ['calendar', 'Kalender'], ['sliders', 'Agent']].forEach(([ic, lab], i) => {
      const cx = W / 8 * (2 * i + 1), on = i === 0;
      o.push(icon(ic, cx - 12, tb + 12, 24, on ? C.em : C.muted, 2), text(cx, tb + 51, lab, F('Manrope', on ? 800 : 600, 11, on ? C.ink : C.muted), { anchor: 'middle' }));
    });
    o.push(homeBar());
    if (ly + lh > tb - 8) throw new Error(`dashboard overflows: list ends at ${ly + lh}, tab bar at ${tb}`);
    return { id, screen: o.join('\n'), defs };
  }

  window.buildScreens = () => {
    const out = {};
    for (const [name, fn] of [['01-voice-agent', voiceAgent], ['02-website', website], ['03-admin-dashboard', dashboard]]) {
      const { id, screen, defs } = fn();
      out[`${name}.svg`] = device(id, screen, defs);
      out[`screen-only/${name}.svg`] = bare(`${id}s`, screen.replaceAll(`url(#${id}-`, `url(#${id}s-`), defs.replaceAll(`id="${id}-`, `id="${id}s-`));
    }
    return { svgs: out, chars: { Sora: [...used.Sora].join(''), Manrope: [...used.Manrope].join('') } };
  };
})();
