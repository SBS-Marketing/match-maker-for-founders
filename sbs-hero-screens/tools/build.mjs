// Build the SBS phone screens: lay them out in Chromium with the real fonts, embed subset fonts, write the SVGs
// and render PNG previews.
//   node tools/build.mjs            (from sbs-hero-screens/)
// Needs Python with fonttools + brotli for the font subsets (PYTHON=/path/to/python to pick one).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const fontDir = path.resolve(root, '../sbs-voice-film/fonts');
const require = createRequire(path.resolve(root, '../launch-film/tools/package.json'));
const { chromium } = require('playwright-core');
const PY = process.env.PYTHON || 'python3';
const FONTS = { Sora: 'Sora-latin.woff2', Manrope: 'Manrope-latin.woff2' };

const b64 = (p) => fs.readFileSync(p).toString('base64');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });

// 1. layout with the full fonts loaded
const page = await browser.newPage();
page.on('pageerror', (e) => { console.error('[pageerror]', e.message); process.exitCode = 1; });
const faces = Object.entries(FONTS).map(([fam, f]) => `@font-face{font-family:'${fam}';font-weight:300 800;src:url(data:font/woff2;base64,${b64(path.join(fontDir, f))}) format('woff2')}`).join('\n');
await page.setContent(`<!doctype html><style>${faces}</style><body></body>`);
await page.evaluate(async () => {
  for (const f of ['500 16px Sora', '600 16px Sora', '500 16px Manrope', '600 16px Manrope', '700 16px Manrope', '800 16px Manrope']) await document.fonts.load(f, 'ÄÖÜäöüß09');
  await document.fonts.ready;
});
await page.addScriptTag({ path: path.join(here, 'sbs-logo-paths.js') });
await page.addScriptTag({ path: path.join(here, 'screens.js') });
const { svgs, chars } = await page.evaluate(() => window.buildScreens());

// 2. subset fonts to the glyphs the screens use (variable weight axis kept)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sbs-fonts-'));
const embedded = Object.entries(FONTS).map(([fam, f]) => {
  const out = path.join(tmp, `${fam}.woff2`);
  execFileSync(PY, ['-m', 'fontTools.subset', path.join(fontDir, f), `--text=${chars[fam]} `, '--flavor=woff2', '--layout-features=*', `--output-file=${out}`]);
  return `@font-face{font-family:'${fam}';font-weight:300 800;src:url(data:font/woff2;base64,${b64(out)}) format('woff2')}`;
}).join('');
fs.rmSync(tmp, { recursive: true });

// 3. write the SVGs
for (const [name, svg] of Object.entries(svgs)) {
  const file = path.join(root, 'svg', name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, svg.replace('<!--FONTS-->', `<style>${embedded}</style>`));
  console.log('wrote', path.relative(root, file), (fs.statSync(file).size / 1024).toFixed(1), 'KB');
}

// 4. previews: each phone loaded as a plain <img> in a page without fonts, so the embedded ones must carry it
const view = await browser.newPage({ deviceScaleFactor: 2 });
const phones = Object.keys(svgs).filter((k) => !k.includes('/'));
for (const name of phones) {
  const uri = `data:image/svg+xml;base64,${Buffer.from(fs.readFileSync(path.join(root, 'svg', name))).toString('base64')}`;
  await view.setViewportSize({ width: 423, height: 874 });
  await view.setContent(`<!doctype html><body style="margin:0;background:transparent"><img src="${uri}" style="display:block"></body>`);
  await view.waitForFunction(() => document.images[0].complete);
  await view.waitForTimeout(150);
  await view.screenshot({ path: path.join(root, 'preview', name.replace('.svg', '.png')), omitBackground: true });
}
for (const name of Object.keys(svgs).filter((k) => k.includes('/'))) {
  const uri = `data:image/svg+xml;base64,${Buffer.from(fs.readFileSync(path.join(root, 'svg', name))).toString('base64')}`;
  await view.setViewportSize({ width: 393, height: 852 });
  await view.setContent(`<!doctype html><body style="margin:0;background:transparent"><img src="${uri}" style="display:block"></body>`);
  await view.waitForFunction(() => document.images[0].complete);
  await view.waitForTimeout(150);
  const out = path.join(root, 'preview', name.replace('.svg', '.png'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await view.screenshot({ path: out, omitBackground: true });
}
const imgs = phones.map((p) => `<img src="data:image/svg+xml;base64,${Buffer.from(fs.readFileSync(path.join(root, 'svg', p))).toString('base64')}" style="display:block;filter:drop-shadow(0 30px 40px rgba(11,18,32,.18))">`).join('');
await view.setViewportSize({ width: 1500, height: 1000 });
await view.setContent(`<!doctype html><body style="margin:0;background:#eef1f6;display:flex;gap:56px;justify-content:center;align-items:center;height:1000px">${imgs}</body>`);
await view.waitForTimeout(300);
await view.screenshot({ path: path.join(root, 'preview', 'overview.png') });
console.log('previews in preview/');
await browser.close();
