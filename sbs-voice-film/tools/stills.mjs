// Render frames at given times (seconds): node stills.mjs <film dir> <out dir> <t> [t ...]
import path from 'node:path';
import { serve, openFilm } from '../../launch-film/tools/serve.mjs';

const [root, outDir, ...times] = process.argv.slice(2);
const { server, base } = await serve(path.resolve(root));
const { browser, pg } = await openFilm(base);
for (const t of times) {
  await pg.evaluate((tt) => window.seek(tt), parseFloat(t));
  await pg.locator('#stage').screenshot({ path: path.join(outDir, `t${t}.png`) });
}
console.log('rendered', times.length, 'dur', await pg.evaluate(() => window.DUR));
await browser.close();
server.close();
