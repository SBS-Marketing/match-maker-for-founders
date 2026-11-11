// Render single frames at given beats: node preview.mjs <root> <outdir> <beat> [beat ...]
import path from 'node:path';
import { serve, openFilm } from './serve.mjs';

const [root, outDir, ...beats] = process.argv.slice(2);
const { server, base } = await serve(root);
const { browser, pg } = await openFilm(base);
const beat = await pg.evaluate(() => window.BEAT);
for (const b of beats) {
  await pg.evaluate((t) => window.seek(t), parseFloat(b) * beat);
  await pg.locator('#stage').screenshot({ path: path.join(outDir, `b${b}.png`) });
}
console.log('rendered', beats.length);
await browser.close();
server.close();
