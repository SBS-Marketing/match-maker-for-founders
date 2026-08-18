/* matchfoundr Maskottchen — Vanilla-JS-Port der bloub-Engine (github.com/jeremy-prt/bloub, MIT)
   Reine Zeitfunktion: sample(t) liefert immer dasselbe Bild. Farben = Warm Signal. */
/* eslint-disable */
// matchfoundr Maskottchen-Engine — unveränderter Vanilla-JS-Port (bloub, MIT).
function createMFMascot() {
'use strict';
const TAU = Math.PI * 2;
const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const r2 = (v) => Math.round(v * 100) / 100;
const easings = {
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutQuint: (t) => 1 - Math.pow(1 - t, 5)
};
function loopNoise(t, period, seed = 0) {
  const p = (t / period) * TAU;
  return 0.55 * Math.sin(p + seed) + 0.3 * Math.sin(2 * p + seed * 1.7 + 1.1) + 0.15 * Math.sin(3 * p + seed * 2.3 + 2.4);
}
function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------------- Formen */
const N = 64;
const ANG = Array.from({ length: N }, (_, i) => (i / N) * TAU);
const COS = ANG.map(Math.cos), SIN = ANG.map(Math.sin);
const PROFILES = {
  egg: [0.8369,0.8424,0.8497,0.8585,0.8674,0.8775,0.8878,0.8983,0.9089,0.9185,0.9288,0.9374,0.9445,0.9504,0.9543,0.9559,0.9555,0.9519,0.9466,0.9389,0.9302,0.9193,0.9085,0.8969,0.8852,0.8734,0.8625,0.8513,0.8411,0.8325,0.8243,0.8179,0.8137,0.8112,0.8102,0.8128,0.8178,0.8262,0.8374,0.8518,0.8702,0.8922,0.9169,0.9446,0.9741,1.0023,1.0267,1.0433,1.0481,1.0393,1.0216,0.9970,0.9697,0.9418,0.9169,0.8949,0.8760,0.8604,0.8490,0.8394,0.8337,0.8314,0.8305,0.8326],
  hexagon: [0.9210,0.9282,0.9441,0.9706,0.9984,1.0059,0.9896,0.9562,0.9290,0.9124,0.9047,0.9058,0.9157,0.9349,0.9642,0.9873,0.9882,0.9665,0.9336,0.9105,0.8968,0.8918,0.8955,0.9080,0.9293,0.9611,0.9820,0.9812,0.9590,0.9282,0.9089,0.8978,0.8964,0.9026,0.9189,0.9439,0.9778,0.9990,0.9964,0.9713,0.9439,0.9274,0.9196,0.9206,0.9308,0.9502,0.9799,1.0121,1.0226,1.0071,0.9752,0.9510,0.9366,0.9316,0.9351,0.9485,0.9711,1.0026,1.0213,1.0155,0.9863,0.9547,0.9347,0.9232],
  triangle: [0.7819,0.8211,0.8747,0.9440,1.0223,1.0960,1.1401,1.1340,1.0808,1.0047,0.9265,0.8603,0.8104,0.7730,0.7450,0.7273,0.7151,0.7118,0.7148,0.7245,0.7427,0.7680,0.8037,0.8518,0.9148,0.9876,1.0583,1.1073,1.1109,1.0667,0.9940,0.9164,0.8482,0.7948,0.7555,0.7261,0.7056,0.6925,0.6859,0.6869,0.6938,0.7084,0.7305,0.7615,0.8040,0.8595,0.9311,1.0092,1.0791,1.1171,1.1054,1.0501,0.9779,0.9050,0.8450,0.7990,0.7656,0.7413,0.7258,0.7160,0.7146,0.7204,0.7330,0.7528]
};
const silhouette = (name, pose) => Object.assign({ radii: PROFILES[name].slice(), rot: 0, cx: 0, cy: 0, sx: 1, sy: 1 }, pose || {});
const circle = (radius, pose) => Object.assign({ radii: new Array(N).fill(radius), rot: 0, cx: 0, cy: 0, sx: 1, sy: 1 }, pose || {});
function blend(a, b, t) {
  const radii = new Array(N);
  for (let i = 0; i < N; i++) radii[i] = lerp(a.radii[i], b.radii[i], t);
  let d = b.rot - a.rot;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return { radii, rot: a.rot + d * t, cx: lerp(a.cx, b.cx, t), cy: lerp(a.cy, b.cy, t), sx: lerp(a.sx, b.sx, t), sy: lerp(a.sy, b.sy, t) };
}
function toPoints(s, scale, out) {
  out = out || [];
  const cr = Math.cos(s.rot), sr = Math.sin(s.rot);
  for (let i = 0; i < N; i++) {
    const r = s.radii[i], x = r * COS[i], y = r * SIN[i];
    const rx = x * cr - y * sr, ry = x * sr + y * cr;
    const p = out[i] || (out[i] = { x: 0, y: 0 });
    p.x = (rx * s.sx + s.cx) * scale;
    p.y = (ry * s.sy + s.cy) * scale;
  }
  out.length = N;
  return out;
}
function closedPath(pts, tension) {
  tension = tension === undefined ? 1 / 6 : tension;
  const n = pts.length;
  if (n < 3) return '';
  let d = 'M' + r2(pts[0].x) + ' ' + r2(pts[0].y);
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += 'C' + r2(p1.x + (p2.x - p0.x) * tension) + ' ' + r2(p1.y + (p2.y - p0.y) * tension) + ' ' +
         r2(p2.x - (p3.x - p1.x) * tension) + ' ' + r2(p2.y - (p3.y - p1.y) * tension) + ' ' + r2(p2.x) + ' ' + r2(p2.y);
  }
  return d + 'Z';
}
function profileFromPolygon(poly, cx, cy) {
  const radii = new Array(N).fill(0), n = poly.length;
  for (let k = 0; k < N; k++) {
    const dx = COS[k], dy = SIN[k];
    let best = 0;
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      const ex = b.x - a.x, ey = b.y - a.y;
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const px = a.x - cx, py = a.y - cy;
      const t = (px * ey - py * ex) / den, u = (px * dy - py * dx) / den;
      if (t > best && u >= 0 && u <= 1) best = t;
    }
    radii[k] = best;
  }
  return radii;
}
function hullOfCircles(x1, y1, r1, x2, y2, r2v, steps) {
  steps = steps || 96;
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.hypot(dx, dy) || 1e-6;
  const base = Math.atan2(dy, dx);
  const spread = Math.acos(Math.max(-1, Math.min(1, (r1 - r2v) / dist)));
  const pts = [];
  for (let i = 0; i <= steps / 2; i++) {
    const a = base + spread + ((TAU - 2 * spread) * i) / (steps / 2);
    pts.push({ x: x1 + Math.cos(a) * r1, y: y1 + Math.sin(a) * r1 });
  }
  for (let i = 0; i <= steps / 2; i++) {
    const a = base - spread + (2 * spread * i) / (steps / 2);
    pts.push({ x: x2 + Math.cos(a) * r2v, y: y2 + Math.sin(a) * r2v });
  }
  return pts;
}
function radiusAtAngle(radii, angle) {
  const n = radii.length;
  const t = ((((angle / TAU) % 1) + 1) % 1) * n;
  const i = Math.floor(t);
  return lerp(radii[i % n], radii[(i + 1) % n], t - i);
}
function polyPath(pts, scale) {
  scale = scale || 1;
  if (pts.length < 3) return '';
  let d = '';
  for (let i = 0; i < pts.length; i++) d += (i === 0 ? 'M' : 'L') + r2(pts[i].x * scale) + ' ' + r2(pts[i].y * scale);
  return d + 'Z';
}
function capsulePath(w, h) {
  const hw = Math.max(w, 0.01) / 2, hh = Math.max(h, 0.01) / 2, r = Math.min(hw, hh);
  return 'M' + r2(-hw) + ' ' + r2(-hh + r) +
    'A' + r2(r) + ' ' + r2(r) + ' 0 0 1 ' + r2(-hw + r) + ' ' + r2(-hh) +
    'L' + r2(hw - r) + ' ' + r2(-hh) +
    'A' + r2(r) + ' ' + r2(r) + ' 0 0 1 ' + r2(hw) + ' ' + r2(-hh + r) +
    'L' + r2(hw) + ' ' + r2(hh - r) +
    'A' + r2(r) + ' ' + r2(r) + ' 0 0 1 ' + r2(hw - r) + ' ' + r2(hh) +
    'L' + r2(-hw + r) + ' ' + r2(hh) +
    'A' + r2(r) + ' ' + r2(r) + ' 0 0 1 ' + r2(-hw) + ' ' + r2(hh - r) + 'Z';
}

/* ----------------------------------------------------------------- Gesicht */
const EYE_SPLIT = 15.46, EYE_W = 0.186, EYE_H = 0.412;
const REST_GAZE = { yaw: 28.49, pitch: 28.62, roll: -13 };
const deg = (d) => (d * Math.PI) / 180;
function spin(u, v, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [[u[0] * c + v[0] * s, u[1] * c + v[1] * s, u[2] * c + v[2] * s],
          [v[0] * c - u[0] * s, v[1] * c - u[1] * s, v[2] * c - u[2] * s]];
}
function eyePoses(gaze, scale, split) {
  split = split === undefined ? EYE_SPLIT : split;
  let f = [0, 0, 1], right = [1, 0, 0], down = [0, 1, 0], t;
  t = spin(f, right, deg(gaze.yaw)); f = t[0]; right = t[1];
  t = spin(down, f, deg(gaze.pitch)); down = t[0]; f = t[1];
  t = spin(right, down, deg(gaze.roll)); right = t[0]; down = t[1];
  const build = (side) => {
    const p = spin(f, right, deg(split * side)), ef = p[0], er = p[1];
    return { x: ef[0] * scale, y: ef[1] * scale, a: er[0], b: er[1], c: down[0], d: down[1], depth: ef[2] };
  };
  return [build(-1), build(1)];
}
const BLINK_RNG = createRng(0x5eed);
const BLINKS = (() => {
  const out = []; let t = 1.4;
  while (t < 900) {
    out.push(t);
    t += 1.9 + BLINK_RNG() * 2.7;
    if (BLINK_RNG() < 0.18) { out.push(t); t += 0.24; }
  }
  return out;
})();
const BLINK_DUR = 0.18;
function blinkLid(t) {
  for (let i = 0; i < BLINKS.length; i++) {
    const start = BLINKS[i];
    if (t < start) break;
    const k = (t - start) / BLINK_DUR;
    if (k >= 0 && k <= 1) return k < 0.45 ? 1 - k / 0.45 : (k - 0.45) / 0.55;
  }
  return 1;
}
function liveliness(t, opt) {
  const wander = opt.wander === undefined ? 1 : opt.wander;
  const blink = opt.blink === undefined ? true : opt.blink;
  return {
    dYaw: (loopNoise(t, 11.3, 0.4) * 5.5 + loopNoise(t, 3.7, 2.1) * 1.6) * wander,
    dPitch: (loopNoise(t, 9.1, 1.3) * 4.2 + loopNoise(t, 4.3, 0.7) * 1.3) * wander,
    dRoll: loopNoise(t, 13.7, 3.2) * 2.2 * wander,
    lid: blink ? blinkLid(t) : 1,
    driftX: loopNoise(t, 7.9, 1.9) * 0.006,
    driftY: loopNoise(t, 5.3, 0.3) * 0.007,
    breath: 1 + Math.sin((t / 3.4) * Math.PI * 2) * 0.005
  };
}
const blinkScale = (lid) => 0.06 + 0.94 * clamp(lid);

/* ------------------------------------------------------------------ Dekor */
/* Statt der Farbrad-Funktion des Repos: die 8 farbcodierten Service-Welten
   als Rad. Der Farbverlauf entlang jeder Spur bleibt, die Farben sind unsere. */
const WHEEL = ['#E03A2E', '#E2511C', '#D79014', '#2E9E50', '#13957A', '#3A6FD6', '#8A55D2', '#DB4B93'];
const RGB = WHEEL.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
const hex2 = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
function wheel(hue) {
  const h = ((hue % 360) + 360) % 360;
  const k = (h / 360) * RGB.length;
  const i = Math.floor(k) % RGB.length, j = (i + 1) % RGB.length, f = k - Math.floor(k);
  const a = RGB[i], b = RGB[j];
  return '#' + hex2(lerp(a[0], b[0], f)) + hex2(lerp(a[1], b[1], f)) + hex2(lerp(a[2], b[2], f));
}
function mixHex(a, b, t) {
  const p = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const x = p(a), y = p(b);
  return '#' + hex2(lerp(x[0], y[0], t)) + hex2(lerp(x[1], y[1], t)) + hex2(lerp(x[2], y[2], t));
}
function arcRender(seed, t, scale, id, opacity) {
  opacity = opacity === undefined ? 1 : opacity;
  const sp = seed.phase + t * seed.speed * TAU;
  const cu = Math.cos(seed.tilt), su = Math.sin(seed.tilt);
  const kz = Math.sqrt(Math.max(0, 1 - seed.k * seed.k));
  const M = 64, span = seed.sweep * TAU;
  let front = '', back = '', prev = null;
  for (let i = 0; i <= M; i++) {
    const th = sp + (i / M) * span, ct = Math.cos(th), st = Math.sin(th);
    const x = seed.a * (ct * cu + st * -su * seed.k) + seed.cx;
    const y = seed.a * (ct * su + st * cu * seed.k) + seed.cy;
    const z = seed.a * st * kz;
    const behind = z < 0;
    const cmd = behind !== prev ? 'M' : 'L';
    if (behind) back += cmd + r2(x * scale) + ' ' + r2(y * scale);
    else front += cmd + r2(x * scale) + ' ' + r2(y * scale);
    prev = behind;
  }
  const gx = cu * seed.a * scale, gy = su * seed.a * scale;
  return {
    id, front, back, width: seed.width * scale, opacity,
    grad: { x1: r2(seed.cx * scale - gx), y1: r2(seed.cy * scale - gy), x2: r2(seed.cx * scale + gx), y2: r2(seed.cy * scale + gy),
      stops: [wheel(seed.hue), wheel(seed.hue + seed.hueSpan * 0.5), wheel(seed.hue + seed.hueSpan)] }
  };
}
const RING_RNG = createRng(0xa11ce);
const RINGS = Array.from({ length: 6 }, (_, i) => ({
  a: 1.3 + RING_RNG() * 0.1, k: 0.05 + RING_RNG() * 0.4, tilt: (i / 6) * Math.PI + RING_RNG() * 0.5,
  speed: 3 + RING_RNG() * 0.7, phase: RING_RNG() * TAU, sweep: 0.6 + RING_RNG() * 0.25,
  hue: (i * 360) / 6 + RING_RNG() * 30, hueSpan: 60 + RING_RNG() * 60, width: 0.05 + RING_RNG() * 0.012, cx: 0, cy: 0.1
}));
const SWOOSH = Array.from({ length: 4 }, (_, i) => ({
  a: 0.78 + i * 0.2, k: 0.05 + i * 0.02, tilt: -0.62 + i * 0.05, speed: 0.3, phase: 0.06 * i,
  sweep: 0.4, hue: 95 + i * 62, hueSpan: 100, width: 0.05, cx: 0, cy: -0.12
}));
const DOT_X = [-0.557, -0.013, 0.532], DOT_R = 0.165, DOT_PEAK = 1.25;
const P_RNG = createRng(0xbeef);
const PARTICLES = Array.from({ length: 5 }, (_, i) => ({ birth: i * 0.2, angle: P_RNG() * TAU, rho: 0.58 + P_RNG() * 0.18 }));
function particles(t, scale) {
  const out = [];
  for (const p of PARTICLES) {
    const u = t - p.birth;
    if (u < 0 || u > 0.62) continue;
    const rho = p.rho * Math.pow(0.75, u * 10);
    const a = p.angle + (u * 100 * Math.PI) / 180;
    out.push({ x: Math.cos(a) * rho * scale, y: Math.sin(a) * rho * scale, r: (0.04 + 0.028 * clamp(u / 0.55)) * scale,
      depth: clamp(1 - rho / 0.8), opacity: clamp(u / 0.06) * clamp((0.62 - u) / 0.08) });
  }
  return out;
}
const COMET_RNG = createRng(0xc0e7);
const COMET_RIBBONS = Array.from({ length: 4 }, (_, i) => {
  const d = i - 1.5;
  return { a: 0.85 * (1 + d * 0.03), k: (0.15 / 0.85) * (1 + d * 0.16), tilt: (34 * Math.PI) / 180 + d * 0.035,
    speed: 210 / 360, phase: -i * 0.045 + COMET_RNG() * 0.012, sweep: 0.34, hue: i * 85 + COMET_RNG() * 20,
    hueSpan: 80, width: 0.095, cx: 0, cy: 0 };
});
const COMET_DOT = 0.129;
const NOTIF_ANGLE = -42, NOTIF_DIST = 1.003, NOTIF_R = 0.15, NOTIF_POP = 1.14, NOTIF_MARGIN = 0.054;

/* ---------------------------------------------------------------- Zustände */
const pair = (w, h) => [{ w, h, open: 1 }, { w, h, open: 1 }];
function base(over) {
  return Object.assign({
    sil: circle(1), offX: 0, offY: 0, gaze: Object.assign({}, REST_GAZE), split: EYE_SPLIT,
    eyes: pair(EYE_W, EYE_H), eyeAlpha: 1, bodyAlpha: 1, dots: [], arcs: [], notif: null, dotsBehind: false
  }, over || {});
}
const BAR_UPRIGHT_CY = -0.1875;
const BAR_UPRIGHT = profileFromPolygon(hullOfCircles(0, -0.505, 0.132, 0, 0.13, 0.075), 0, BAR_UPRIGHT_CY);
const BAR_ITALIC = profileFromPolygon(hullOfCircles(0, -0.2535, 0.1345, 0, 0.2535, 0.1345), 0, 0);
const barUpright = (pose) => Object.assign({ radii: BAR_UPRIGHT.slice(), rot: 0, cx: 0, cy: BAR_UPRIGHT_CY, sx: 1, sy: 1 }, pose || {});
const barItalic = (pose) => Object.assign({ radii: BAR_ITALIC.slice(), rot: 0, cx: 0, cy: 0, sx: 1, sy: 1 }, pose || {});
const TEAR = polyPath(hullOfCircles(0, 0, 0.118, 0, 0.172, 0.012));
const TRI_ORBIT = 0.213;
const spinningTriangle = (rot) => silhouette('triangle', { rot, cx: -TRI_ORBIT * Math.sin(rot), cy: TRI_ORBIT * Math.cos(rot) });
function dotPulse(t, index) {
  const p = ((((t - index * 0.5) / 1.5) % 1) + 1) % 1;
  const k = p < 0.5 ? 0.5 - 0.5 * Math.cos(p * TAU) : 0;
  return clamp(k * 2);
}
const STATES = [
  { id: 'idle', duration: 2.4, morph: 0.45, blinkIn: false, baseFace: true, baseBody: true, pose: () => base() },
  { id: 'thinking', duration: 2.6, morph: 0.4, baseFace: false, baseBody: false, blinkIn: true, pose: (t) => {
      const mid = dotPulse(t, 1);
      const emerge = 0.3 + 0.7 * easings.easeOutCubic(clamp(t / 0.3));
      return base({
        sil: circle(DOT_R * (1 + (DOT_PEAK - 1) * mid), { cx: DOT_X[1] }),
        eyeAlpha: 0,
        dots: [0, 2].map((i) => { const k = dotPulse(t, i); return { x: DOT_X[i] * emerge, y: 0, r: DOT_R * (1 + (DOT_PEAK - 1) * k), opacity: 0.55 + 0.45 * k }; })
      });
    } },
  { id: 'wink', duration: 1.6, morph: 0.3, blinkIn: true, baseFace: false, baseBody: true, pose: () => base({
      gaze: { yaw: -5.37, pitch: 4.55, roll: 6.7 }, split: 16.25,
      eyes: [{ w: 0.236, h: 0.464, open: 1 }, { w: 0.447, h: 0.089, open: 1 }] }) },
  { id: 'wide', duration: 1.8, morph: 0.55, blinkIn: true, baseFace: false, baseBody: true, pose: () => base({
      gaze: { yaw: 6.92, pitch: -21.96, roll: 11.6 }, split: 18.43, eyes: pair(0.356, 0.875) }) },
  { id: 'alert', duration: 2.4, minDuration: 2, morph: 0.45, baseFace: false, baseBody: false, blinkIn: false, pose: (t) => {
      const p = clamp(t / 1.5);
      const travel = easings.easeInOutCubic(p) * 0.82 - 0.087;
      const back = t > 1.6 ? clamp((t - 1.6) / 0.4) : 0;
      const x = travel * (1 - back) + 0.1 * back;
      const buzz = Math.sin(t * 2.5 * TAU) * 0.005;
      const tilt = (17.7 * Math.PI) / 180;
      return base({
        sil: barItalic({ rot: tilt, cx: x, cy: -0.325 - buzz }), eyeAlpha: 0,
        dots: [{ x: x - Math.sin(tilt) * 0.58, y: -0.325 + Math.cos(tilt) * 0.58 + buzz * 2.8, r: 0.118, d: TEAR, rot: (tilt * 180) / Math.PI, opacity: 1 }]
      });
    } },
  { id: 'notify', duration: 2.2, morph: 0.5, blinkIn: true, baseFace: false, baseBody: true, pose: (t) => {
      const p = clamp(t / 0.45);
      const pop = 1 + (NOTIF_POP - 1) * Math.sin(p * Math.PI) * (1 - p * 0.35);
      const r = NOTIF_R * (p < 1 ? pop : 1);
      const a = (NOTIF_ANGLE * Math.PI) / 180;
      return base({ gaze: { yaw: -21.94, pitch: -5.82, roll: -12.2 }, split: 18.89, eyes: pair(0.505, 0.498),
        notif: { x: Math.cos(a) * NOTIF_DIST, y: Math.sin(a) * NOTIF_DIST, r, notch: r + NOTIF_MARGIN } });
    } },
  { id: 'exclaim', duration: 2, morph: 0.45, baseFace: false, baseBody: false, blinkIn: false, pose: () => base({
      sil: barUpright(), eyeAlpha: 0, dots: [{ x: -0.012, y: 0.526, r: 0.113, opacity: 1 }] }) },
  { id: 'sleep', duration: 2.4, morph: 0.5, baseFace: false, baseBody: false, blinkIn: false, pose: (t) => base({
      sil: circle(0.1585, { cy: 0.11 + Math.sin(t * (TAU / 0.6)) * 0.19 }), eyeAlpha: 0 }) },
  { id: 'egg', duration: 1.8, morph: 0.4, baseFace: false, baseBody: false, blinkIn: true, pose: () => base({
      sil: silhouette('egg'), gaze: { yaw: 19.97, pitch: 26.01, roll: -17.1 }, split: 11.07, eyes: pair(0.164, 0.385) }) },
  { id: 'hexagon', duration: 1.6, morph: 0.4, baseFace: false, baseBody: false, blinkIn: true, pose: () => base({
      sil: silhouette('hexagon'), gaze: { yaw: 23.11, pitch: 24.42, roll: -13.3 }, split: 13.37, eyes: pair(0.177, 0.411) }) },
  { id: 'play', duration: 2, morph: 0.5, baseFace: false, baseBody: false, blinkIn: true, pose: (t) => {
      const fade = clamp(t / 0.35) * clamp((2.2 - t) / 0.5);
      return base({ sil: spinningTriangle(0), gaze: { yaw: 12, pitch: -8, roll: -6 }, split: 15, eyes: pair(0.18, 0.34),
        arcs: SWOOSH.map((s, i) => ({ id: 'sw' + i, seed: Object.assign({}, s, { cx: 0.45 - t * 0.42 }), t, opacity: fade })) });
    } },
  { id: 'orbit', duration: 3.4, minDuration: 2.5, morph: 0.6, baseFace: false, baseBody: false, blinkIn: false, pose: (t) => {
      const ramp = easings.easeInOutCubic(clamp(t / 0.35));
      const rot = -TAU * 1.25 * t * ramp;
      const back = easings.easeInOutCubic(clamp((t - 1.6) / 0.9));
      const tri = spinningTriangle(rot), ball = circle(1, { rot });
      const sil = { radii: tri.radii.map((r, i) => r + (ball.radii[i] - r) * back), rot, cx: tri.cx * (1 - back), cy: tri.cy * (1 - back), sx: 1, sy: 1 };
      const fade = clamp(t / 0.8) * clamp((3.6 - t) / 0.9);
      return base({ sil,
        gaze: { yaw: REST_GAZE.yaw + Math.sin(t * 6.5) * 65 * (1 - back), pitch: -4 + back * 32, roll: -13 },
        eyes: pair(0.18, 0.34 + back * 0.07),
        arcs: RINGS.map((s, i) => ({ id: 'rg' + i, seed: s, t, opacity: fade * clamp((t - i * 0.13) / 0.3) })) });
    } },
  { id: 'swirl', duration: 1.3, minDuration: 1.3, morph: 0.3, baseFace: true, baseBody: true, blinkIn: true, pose: (t) => base({
      arcs: RINGS.slice(0, 3).map((s, i) => ({ id: 'sw' + i, seed: s, t, opacity: clamp((t - i * 0.06) / 0.14) * clamp((1.22 - t) / 0.34) })) }) },
  { id: 'burst', duration: 2.6, minDuration: 2.4, morph: 0.4, baseFace: false, baseBody: false, blinkIn: false, pose: (t) => {
      const collapse = 1 - 0.834 * easings.easeOutQuint(clamp(t / 0.7));
      const regrow = easings.easeOutQuint(clamp((t - 1.7) / 0.7));
      return base({ sil: circle(collapse + (1 - collapse) * regrow), eyeAlpha: clamp((t - 1.85) / 0.4), dots: particles(t, 1), dotsBehind: true });
    } },
  { id: 'comet', duration: 2.4, minDuration: 2.4, morph: 0.45, baseFace: false, baseBody: false, blinkIn: false, pose: (t) => {
      const collapse = 1 - (1 - COMET_DOT) * easings.easeOutQuint(clamp(t / 0.55));
      const regrow = easings.easeOutQuint(clamp((t - 1.85) / 0.6));
      const fade = clamp((t - 0.15) / 0.25) * clamp((1.95 - t) / 0.3);
      return base({ sil: circle(collapse + (1 - collapse) * regrow, { cy: Math.sin(clamp(t / 1.7) * Math.PI) * 0.035 }),
        eyeAlpha: clamp((t - 2) / 0.35),
        arcs: COMET_RIBBONS.map((s, i) => ({ id: 'cm' + i, seed: s, t, opacity: fade })) });
    } }
];
const STATE_BY_ID = {};
STATES.forEach((s) => { STATE_BY_ID[s.id] = s; });
const SEQUENCE = ['idle', 'thinking', 'wink', 'wide', 'alert', 'notify', 'exclaim', 'sleep', 'egg', 'hexagon', 'play', 'orbit', 'burst', 'comet'];
const POSES = { idle: 1, thinking: 1.1, wink: 0.8, wide: 0.8, alert: 0.75, notify: 0.9, exclaim: 0.8, sleep: 0.45, egg: 0.8, hexagon: 0.8, play: 0.9, orbit: 1.2, swirl: 0.5, burst: 0.45, comet: 1.15 };

/* ------------------------------------------------------------------ Motor */
const lerpEye = (a, b, t) => ({ w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t), open: lerp(a.open, b.open, t), tilt: lerp(a.tilt || 0, b.tilt || 0, t) });
function blendPose(a, b, t) {
  const out = 1 - t;
  return {
    sil: blend(a.sil, b.sil, t), offX: lerp(a.offX, b.offX, t), offY: lerp(a.offY, b.offY, t),
    gaze: { yaw: lerp(a.gaze.yaw, b.gaze.yaw, t), pitch: lerp(a.gaze.pitch, b.gaze.pitch, t), roll: lerp(a.gaze.roll, b.gaze.roll, t) },
    split: lerp(a.split, b.split, t),
    eyes: [lerpEye(a.eyes[0], b.eyes[0], t), lerpEye(a.eyes[1], b.eyes[1], t)],
    eyeAlpha: lerp(a.eyeAlpha, b.eyeAlpha, t), bodyAlpha: lerp(a.bodyAlpha, b.bodyAlpha, t),
    dots: a.dots.map((d) => Object.assign({}, d, { opacity: d.opacity * out })).concat(b.dots.map((d) => Object.assign({}, d, { opacity: d.opacity * t }))),
    arcs: a.arcs.map((r) => Object.assign({}, r, { id: 'a' + r.id, opacity: r.opacity * out })).concat(b.arcs.map((r) => Object.assign({}, r, { id: 'b' + r.id, opacity: r.opacity * t }))),
    notif: t < 0.5 ? a.notif : b.notif, dotsBehind: t < 0.5 ? a.dotsBehind : b.dotsBehind
  };
}
const NO_LOOK = { yaw: 0, pitch: 0, mix: 0, spin: 0, wander: 1 };
const lerpLook = (a, b, t) => ({ yaw: lerp(a.yaw, b.yaw, t), pitch: lerp(a.pitch, b.pitch, t), mix: lerp(a.mix, b.mix, t), spin: lerp(a.spin, b.spin, t), wander: lerp(a.wander, b.wander, t) });
const LOOK_MORPH = 0.24;
class BotEngine {
  constructor(scale, initial) {
    this.scale = scale || 100;
    this.cur = initial || 'idle';
    this.prev = null; this.departFige = null; this.tCur = 0; this.tPrev = 0; this.blinkAt = -10;
    this.pts = []; this.look = NO_LOOK; this.lookPrev = NO_LOOK; this.lookAt = -10; this.lookMorph = LOOK_MORPH;
  }
  get state() { return this.cur; }
  setLook(look, now, morph) {
    if (look && !Number.isFinite(look.yaw + look.pitch + look.mix + look.spin + look.wander)) return;
    this.lookPrev = this.lookAtTime(now);
    this.look = look || NO_LOOK;
    this.lookAt = now;
    this.lookMorph = morph === undefined ? LOOK_MORPH : morph;
  }
  lookAtTime(now) {
    const k = (now - this.lookAt) / this.lookMorph;
    if (k >= 1) return this.look;
    return lerpLook(this.lookPrev, this.look, easings.easeOutQuint(clamp(k)));
  }
  reset(id, now) { this.cur = id; this.prev = null; this.departFige = null; this.tCur = now; this.tPrev = now; this.blinkAt = -10; }
  origine(now) {
    if (this.departFige) return this.departFige;
    if (!this.prev) return null;
    return STATE_BY_ID[this.prev].pose(Math.max(0, now - this.tPrev));
  }
  poseComposee(now) {
    const def = STATE_BY_ID[this.cur];
    const pose = def.pose(Math.max(0, now - this.tCur));
    const since = now - this.tCur;
    if (since >= def.morph) return pose;
    const o = this.origine(now);
    if (!o) return pose;
    return blendPose(o, pose, easings.easeOutQuint(clamp(since / def.morph)));
  }
  setState(id, now) {
    if (id === this.cur) return;
    const morph = STATE_BY_ID[this.cur].morph;
    const enPleinFondu = this.prev !== null && now - this.tCur < morph;
    this.departFige = enPleinFondu ? this.poseComposee(now) : null;
    this.prev = this.cur; this.tPrev = this.tCur; this.cur = id; this.tCur = now;
    if (STATE_BY_ID[id].blinkIn) this.blinkAt = now;
  }
  sample(now) {
    const R = this.scale, def = STATE_BY_ID[this.cur];
    let pose = def.pose(Math.max(0, now - this.tCur));
    const since = now - this.tCur;
    const o = since < def.morph ? this.origine(now) : null;
    if (o) pose = blendPose(o, pose, easings.easeOutQuint(clamp(since / def.morph)));

    const alive = pose.eyeAlpha > 0.01;
    const look = this.lookAtTime(now);
    const life = liveliness(now, { wander: alive ? look.wander : 0, blink: alive });
    const gaze = {
      yaw: lerp(pose.gaze.yaw, look.yaw, look.mix) + life.dYaw - look.spin,
      pitch: lerp(pose.gaze.pitch, look.pitch, look.mix) + life.dPitch,
      roll: pose.gaze.roll + life.dRoll
    };
    const forced = clamp((now - this.blinkAt) / 0.2);
    const forcedLid = forced < 1 ? Math.abs(forced * 2 - 1) : 1;
    const lid = Math.min(life.lid, forcedLid);
    const offX = pose.offX + life.driftX, offY = pose.offY + life.driftY;

    const sil = Object.assign({}, pose.sil, { cx: pose.sil.cx + offX, cy: pose.sil.cy + offY, sy: pose.sil.sy * life.breath });
    const bodyPath = closedPath(toPoints(sil, R, this.pts));
    const bodyRadius = (x, y) => radiusAtAngle(pose.sil.radii, Math.atan2(y, x) - pose.sil.rot);

    const eyes = [];
    if (pose.eyeAlpha > 0.01) {
      const poses = eyePoses(gaze, R, pose.split);
      for (let i = 0; i < 2; i++) {
        const e = poses[i];
        if (e.depth <= 0.02) continue;
        const cfg = pose.eyes[i];
        const fit = bodyRadius(e.x, e.y);
        const phi = ((cfg.tilt || 0) * Math.PI) / 180, cp = Math.cos(phi), sp = Math.sin(phi);
        const ax = e.a * cp + e.c * sp, ay = e.b * cp + e.d * sp;
        const cx2 = -e.a * sp + e.c * cp, cy2 = -e.b * sp + e.d * cp;
        const k = blinkScale(Math.min(lid, cfg.open));
        eyes.push({
          d: capsulePath(cfg.w * R, cfg.h * R),
          matrix: 'matrix(' + r2(ax) + ',' + r2(ay * k) + ',' + r2(cx2) + ',' + r2(cy2 * k) + ',' + r2(e.x * fit + offX * R) + ',' + r2(e.y * fit + offY * R) + ')',
          alpha: pose.eyeAlpha * clamp(e.depth / 0.12)
        });
      }
    }
    const dots = pose.dots.filter((p) => p.opacity > 0.01 && p.r > 0.0005)
      .map((p) => Object.assign({}, p, { x: (p.x + offX) * R, y: (p.y + offY) * R, r: p.r * R }));
    const nFit = pose.notif ? bodyRadius(pose.notif.x, pose.notif.y) : 1;
    const nx = pose.notif ? (pose.notif.x * nFit + offX) * R : 0;
    const ny = pose.notif ? (pose.notif.y * nFit + offY) * R : 0;
    return {
      bodyPath, bodyAlpha: pose.bodyAlpha, eyes, dots, dotsBehind: pose.dotsBehind,
      arcs: pose.arcs.filter((a) => a.opacity > 0.01).map((a) => arcRender(a.seed, a.t, R, a.id, a.opacity)),
      notif: pose.notif ? { x: nx, y: ny, r: pose.notif.r * R } : null,
      notch: pose.notif ? { x: nx, y: ny, r: pose.notif.notch * R } : null
    };
  }
}

/* --------------------------------------------------------------- Rendering */
const RAYON = 100, VB = 158;
let SEQ = 0;
function svgMarkup(frame, uid, ink, paper, notifColor) {
  const grads = frame.arcs.map((a) =>
    '<linearGradient id="' + uid + '-' + a.id + '" gradientUnits="userSpaceOnUse" x1="' + a.grad.x1 + '" y1="' + a.grad.y1 + '" x2="' + a.grad.x2 + '" y2="' + a.grad.y2 + '">' +
    a.grad.stops.map((c, i) => '<stop offset="' + i / (a.grad.stops.length - 1) + '" stop-color="' + c + '"></stop>').join('') +
    '</linearGradient>').join('');
  const eyeHoles = frame.eyes.map((e) => '<path d="' + e.d + '" transform="' + e.matrix + '" opacity="' + r2(e.alpha) + '" fill="#000"></path>').join('');
  const notch = frame.notch ? '<circle cx="' + frame.notch.x + '" cy="' + frame.notch.y + '" r="' + frame.notch.r + '" fill="#000"></circle>' : '';
  const dot = (d) => {
    const fill = d.color || (d.depth === undefined ? ink : mixHex(paper, ink, d.depth));
    return d.d
      ? '<path d="' + d.d + '" fill="' + fill + '" opacity="' + r2(d.opacity) + '" transform="translate(' + r2(d.x) + ' ' + r2(d.y) + ') rotate(' + (d.rot || 0) + ') scale(' + RAYON + ')"></path>'
      : '<circle cx="' + r2(d.x) + '" cy="' + r2(d.y) + '" r="' + r2(d.r) + '" fill="' + fill + '" opacity="' + r2(d.opacity) + '"></circle>';
  };
  const dots = frame.dots.map(dot).join('');
  const arcPaths = (which) => frame.arcs.map((a) => a[which] ? '<path d="' + a[which] + '" stroke="url(#' + uid + '-' + a.id + ')" stroke-width="' + r2(a.width) + '" opacity="' + r2(a.opacity) + '"></path>' : '').join('');
  return '<defs><mask id="' + uid + '-m" maskUnits="userSpaceOnUse" x="' + -VB + '" y="' + -VB + '" width="' + VB * 2 + '" height="' + VB * 2 + '">' +
    '<path d="' + frame.bodyPath + '" fill="#fff"></path>' + eyeHoles + notch + '</mask>' + grads + '</defs>' +
    '<g fill="none" stroke-linecap="round">' + arcPaths('back') + '</g>' +
    (frame.dotsBehind ? '<g>' + dots + '</g>' : '') +
    '<g opacity="' + r2(frame.bodyAlpha) + '"><path d="' + frame.bodyPath + '" fill="' + paper + '"></path>' +
    '<g mask="url(#' + uid + '-m)"><rect x="' + -VB + '" y="' + -VB + '" width="' + VB * 2 + '" height="' + VB * 2 + '" fill="' + ink + '"></rect></g></g>' +
    (frame.dotsBehind ? '' : '<g>' + dots + '</g>') +
    (frame.notif ? '<circle cx="' + frame.notif.x + '" cy="' + frame.notif.y + '" r="' + frame.notif.r + '" fill="' + notifColor + '"></circle>' : '') +
    '<g fill="none" stroke-linecap="round">' + arcPaths('front') + '</g>';
}

const live = [];
let raf = 0, last = 0;
function loop(ms) {
  raf = requestAnimationFrame(loop);
  const dt = last ? Math.min((ms - last) / 1000, 0.064) : 0;
  last = ms;
  for (const m of live) m.tick(dt);
}

/* Blickziel: Pupillen folgen dem Zeiger. Winkel wie im Repo (YAW 16, PITCH 13). */
const YAW_MAX = 16, PITCH_MAX = 13, PITCH = 10, SPIN = 360, TURN_TIME = 1.1, TOUR_TIME = 1.5;
const tourLook = (t) => ({ yaw: 0, pitch: 0, mix: 0, spin: SPIN * (1 - easings.easeInOutCubic(clamp(t / TOUR_TIME))), wander: 1 });

class Mascot {
  constructor(host, opts) {
    opts = opts || {};
    this.host = host;
    this.ink = opts.ink || '#E2511C';
    this.paper = opts.paper || '#FAF8F3';
    this.notifColor = opts.notif || '#3756C4';
    this.uid = 'mf' + (++SEQ);
    this.cycle = (opts.cycle || SEQUENCE).map((id) => ({ state: id, duration: STATE_BY_ID[id].duration }));
    this.mode = opts.mode || 'sequence';
    this.follow = !!opts.follow;
    this.intro = !!opts.intro;
    this.onState = opts.onState || null;
    this.engine = new BotEngine(RAYON, opts.state || this.cycle[0].state);
    this.clock = 0; this.cycleT = 0; this.lastBlock = -1;
    this.aiming = false; this.followSince = 0; this.introDone = !this.intro;
    this.pointer = null;
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('viewBox', -VB + ' ' + -VB + ' ' + VB * 2 + ' ' + VB * 2);
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute('aria-label', 'matchfoundr Maskottchen');
    this.svg.style.overflow = 'visible';
    this.svg.style.display = 'block';
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';
    host.appendChild(this.svg);
    if (opts.frozenAt !== undefined) { this.draw(this.engine.sample(opts.frozenAt)); return; }
    if (this.intro) this.engine.setLook(tourLook(0), -1 / 60, 1 / 60);
    if (this.follow) {
      this._move = (e) => { if (e.pointerType !== 'touch') this.pointer = { x: e.clientX, y: e.clientY }; };
      this._leave = () => { this.pointer = null; };
      window.addEventListener('pointermove', this._move);
      document.addEventListener('pointerleave', this._leave);
    }
    this.visible = true;
    if (typeof IntersectionObserver === 'function') {
      this.io = new IntersectionObserver((es) => { this.visible = es[es.length - 1].isIntersecting; }, { rootMargin: '160px' });
      this.io.observe(this.svg);
    }
    live.push(this);
    if (!raf) raf = requestAnimationFrame(loop);
    this.tick(0);
  }
  destroy() {
    const i = live.indexOf(this);
    if (i >= 0) live.splice(i, 1);
    if (this.io) this.io.disconnect();
    if (this._move) window.removeEventListener('pointermove', this._move);
    if (this._leave) document.removeEventListener('pointerleave', this._leave);
    if (this.svg.parentNode) this.svg.parentNode.removeChild(this.svg);
  }
  setState(id) { this.mode = 'state'; this.engine.setState(id, this.clock); this.emit(id); }
  playSequence() { this.mode = 'sequence'; this.cycleT = 0; this.lastBlock = -1; this.engine.reset(this.cycle[0].state, this.clock); }
  emit(id) { if (this.onState) this.onState(id); }
  aim() {
    if (!STATE_BY_ID[this.engine.state].baseFace) {
      if (this.aiming) { this.engine.setLook(null, this.clock, TURN_TIME); this.aiming = false; }
      return;
    }
    const box = this.svg.getBoundingClientRect();
    if (!box.width || !box.height) return;
    if (!this.aiming) { this.followSince = this.clock; this.aiming = true; }
    const hw = Math.max(1, window.innerWidth / 2), hh = Math.max(1, window.innerHeight / 2);
    const p = this.pointer;
    const nx = p ? clamp((p.x - (box.left + box.width / 2)) / hw, -1, 1) : 0;
    const ny = p ? clamp((p.y - (box.top + box.height / 2)) / hh, -1, 1) : 0;
    const tour = easings.easeOutQuint(clamp((this.clock - this.followSince) / TURN_TIME));
    this.engine.setLook({ yaw: nx * YAW_MAX, pitch: PITCH - ny * PITCH_MAX, mix: tour, spin: 0, wander: p ? 0 : 1 }, this.clock);
  }
  tick(dt) {
    if (!this.visible) return;
    this.clock += dt;
    if (this.mode === 'sequence') {
      this.cycleT += dt;
      const total = this.cycle.reduce((s, b) => s + b.duration, 0);
      let t = this.cycleT % total, acc = 0, index = 0;
      for (let i = 0; i < this.cycle.length; i++) {
        const end = acc + this.cycle[i].duration;
        if (t < end) { index = i; break; }
        acc = end;
        index = i;
      }
      if (index !== this.lastBlock) {
        const b = this.cycle[index];
        if (index < this.lastBlock) this.engine.reset(b.state, this.clock);
        else this.engine.setState(b.state, this.clock);
        this.lastBlock = index;
        this.emit(b.state);
      }
    }
    if (!this.introDone) {
      const u = this.clock;
      this.engine.setLook(tourLook(u), this.clock, 1 / 60);
      if (u >= TOUR_TIME) { this.introDone = true; this.engine.setLook(null, this.clock, 1 / 60); this.followSince = this.clock; this.aiming = this.follow; }
    } else if (this.follow) this.aim();
    this.draw(this.engine.sample(this.clock));
  }
  draw(frame) { this.svg.innerHTML = svgMarkup(frame, this.uid, this.ink, this.paper, this.notifColor); }
}

return { Mascot, SEQUENCE, STATES, POSES, VB, RAYON, wheel };
}

export const MFMascot = createMFMascot();
export default MFMascot;

