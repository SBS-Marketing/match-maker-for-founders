// Screenshot the section at given times: node tools/frames.mjs <out dir> <width> <t1> <t2> …
// Google Fonts is answered with the local Sora/Manrope files, so renders work offline.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const require = createRequire(path.resolve(root, '../launch-film/tools/package.json'));
const { chromium } = require('playwright-core');
const [out, width, ...times] = process.argv.slice(2);
const fonts = path.resolve(root, '../sbs-voice-film/fonts');
const b64 = (f) => fs.readFileSync(path.join(fonts, f)).toString('base64');
const css = ['Sora', 'Manrope'].map((fam) => `@font-face{font-family:'${fam}';font-weight:300 800;src:url(data:font/woff2;base64,${b64(fam + '-latin.woff2')}) format('woff2')}`).join('\n');

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: +width, height: 1000 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => { console.log('[pageerror]', e.message); process.exitCode = 1; });
page.on('console', (m) => { if (m.type() === 'error') console.log('[console]', m.text()); });
await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: css }));
await page.goto('file://' + path.join(root, 'automatisierung.html'));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
const glass = page.locator('.sbsa-glass');
for (const t of times) {
  await page.evaluate((x) => document.getElementById('automatisierung').__sbsa.seek(x), +t);
  await glass.screenshot({ path: path.join(out, `t${(+t).toFixed(2).padStart(5, '0')}.png`) });
}
await page.screenshot({ path: path.join(out, 'page.png'), fullPage: true });
await browser.close();
