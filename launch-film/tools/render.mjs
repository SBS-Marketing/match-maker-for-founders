// Render the film: node render.mjs <launch-film dir> <out dir> [workers=3] [subframes=8] [shutter=0.5] [from] [to]
// Each frame is the average of `subframes` captures spread over `shutter` of a frame interval (0.5 = 180°),
// centred on the frame time. Workers render contiguous frame ranges into lossless FFV1 chunks via ffmpeg tmix.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { serve, openFilm } from './serve.mjs';

const [root, outDir, W = '3', SUB = '8', SHUT = '0.5', FROM, TO] = process.argv.slice(2);
const workers = +W, sub = +SUB, shutter = +SHUT;
fs.mkdirSync(outDir, { recursive: true });
const { server, base } = await serve(root);

const probe = await openFilm(base);
const { dur, fps } = await probe.pg.evaluate(() => ({ dur: window.DUR, fps: window.FPS }));
await probe.browser.close();
const total = Math.round(dur * fps);
const f0 = FROM ? +FROM : 0, f1 = TO ? +TO : total;
const per = Math.ceil((f1 - f0) / workers);
const t0 = Date.now();

async function worker(k) {
  const a = f0 + k * per, b = Math.min(f1, a + per);
  if (a >= b) return null;
  const file = path.join(outDir, `chunk_${String(k).padStart(2, '0')}.mkv`);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps * sub), '-c:v', 'mjpeg', '-i', '-',
    '-vf', `format=gbrp,tmix=frames=${sub},select='eq(mod(n\\,${sub})\\,${sub - 1})',setpts=N/(${fps}*TB)`,
    '-r', String(fps), '-c:v', 'ffv1', '-level', '3', '-g', '1', '-slices', '4', '-pix_fmt', 'gbrp', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((r, j) => ff.on('close', (c) => (c === 0 ? r() : j(new Error('ffmpeg ' + c)))));
  const { browser, pg } = await openFilm(base);
  for (let f = a; f < b; f++) {
    for (let i = 0; i < sub; i++) {
      const t = Math.min(dur - 1e-4, Math.max(0, (f + ((i + 0.5) / sub - 0.5) * shutter) / fps));
      await pg.evaluate((tt) => window.seek(tt), t);
      const buf = await pg.screenshot({ type: 'jpeg', quality: 94, animations: 'disabled', caret: 'hide' });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    if (k === 0 && (f - a) % 30 === 0) {
      const el = (Date.now() - t0) / 1000, prog = (f - a + 1) / (b - a);
      console.log(`worker0 frame ${f - a + 1}/${b - a}  ${el.toFixed(0)}s  eta ${(el / prog - el).toFixed(0)}s`);
    }
  }
  ff.stdin.end();
  await done;
  await browser.close();
  return file;
}

const files = (await Promise.all(Array.from({ length: workers }, (_, k) => worker(k)))).filter(Boolean);
fs.writeFileSync(path.join(outDir, 'chunks.txt'), files.map((f) => `file '${path.resolve(f)}'`).join('\n') + '\n');
console.log(`rendered frames ${f0}-${f1} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
server.close();
