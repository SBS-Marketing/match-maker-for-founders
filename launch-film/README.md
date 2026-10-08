# Co-Pilot launch film

15-second launch film for the matchfoundr Co-Pilot (German, 1920×1080, 60 fps, 130 BPM).
See `BEATMAP.md` for the beat-by-beat plan.

| Path | What |
|---|---|
| `film.html` | The whole film as one page. `seek(t)` computes every style from `t` (no transitions or timers). Open `film.html?play` to preview in a browser, or `?b=12` to jump to a beat. |
| `vendor/mf-mascot-engine.js` | Copy of `public/mf-mascot.js` that also exports `BotEngine`, so the Co-Pilot dot is sampled as a pure function of time. |
| `fonts/` | Geist, Geist Mono and Instrument Serif (local, so renders need no network). |
| `audio/` | `events.json` (sound cue times read from the film), stems and the mastered `film-audio.wav`. |
| `tools/` | Render, sound and QA scripts (below). |
| `stills/` | Style frames. |
| `matchfoundr-copilot-launch.mp4` | The rendered film. |

## Reproduce

```bash
cd launch-film/tools && npm i                                      # playwright-core
node events.mjs .. ../audio/events.json                            # cue times from the film
python synth.py ../audio/events.json ../audio                      # needs numpy + scipy
(cd ../audio && ../tools/master.sh mix.wav film-audio.wav)         # -14 LUFS, -1 dBTP
node render.mjs .. /tmp/render 3 8 0.5                             # 3 workers, 8 subframes, 180° shutter
./assemble.sh /tmp/render/chunks.txt ../audio/film-audio.wav ../matchfoundr-copilot-launch.mp4
python popscan.py ../matchfoundr-copilot-launch.mp4                # single-frame pop scan
```

Rendering uses the Chromium at `/opt/pw-browsers` (edit `tools/serve.mjs` for another path).

The soundtrack and every effect are synthesized in `tools/synth.py` (no samples), so they're free to use.
The match-card portraits are monogram placeholders until real headshots are supplied.
