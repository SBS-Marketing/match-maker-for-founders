// Dump the film's sound-event times: node events.mjs <launch-film dir> <out.json>
import fs from 'node:fs';
import { serve, openFilm } from './serve.mjs';

const [root, out] = process.argv.slice(2);
const { server, base } = await serve(root);
const { browser, pg } = await openFilm(base);
fs.writeFileSync(out, JSON.stringify(await pg.evaluate(() => window.EVENTS), null, 1));
await browser.close();
server.close();
