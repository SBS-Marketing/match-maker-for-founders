// Record one loop of the section as an MP4: node tools/record.mjs <out.mp4> <viewport width> [fps=30] [scale=1.5]
// Frames come from the section's own seek(t), so the video is exact and independent of machine speed.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const require = createRequire(path.resolve(root, '../launch-film/tools/package.json'));
const { chromium } = require('playwright-core');
const [out, width, fps = '30', scale = '1.5'] = process.argv.slice(2);
const fonts = path.resolve(root, '../sbs-voice-film/fonts');
const css = ['Sora', 'Manrope'].map((f) => `@font-face{font-family:'${f}';font-weight:300 800;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(fonts, f + '-latin.woff2')).toString('base64')}) format('woff2')}`).join('');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sbsa-rec-'));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: +width, height: 1000 }, deviceScaleFactor: +scale });
await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: css }));
await page.goto('file://' + path.join(root, 'automatisierung.html'));
await page.evaluate(() => document.fonts.ready);
const loop = await page.evaluate(() => document.getElementById('automatisierung').__sbsa.T.LOOP);
const glass = page.locator('.sbsa-glass');
const n = Math.round(loop * +fps);
for (let i = 0; i < n; i++) {
  await page.evaluate((x) => document.getElementById('automatisierung').__sbsa.seek(x), i / +fps);
  await glass.screenshot({ path: path.join(tmp, `f${String(i).padStart(4, '0')}.png`) });
}
await browser.close();
execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', fps, '-i', path.join(tmp, 'f%04d.png'), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', out]);
fs.rmSync(tmp, { recursive: true });
console.log('wrote', out, n, 'frames');
