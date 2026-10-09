"""Soundtrack, sound effects and voice mix for the SBS Voice-Agent film.

Music and effects are synthesized here (no samples). The two voices are the OpenAI TTS lines prepared by voice.py.
- Music: 100 BPM, E major, bar grid anchored on the pickup (T_ACCEPT). Calm bed: warm pad, round sub, a soft marimba
  arpeggio that keeps playing the ringtone motif, brushed hats later on; ducked under speech.
- SFX: ringtone motif + buzz, pickup chime, orb whoosh, bubble ticks, token whooshes, card blooms, check dings,
  booking shimmer, SMS send, hang-up blip, page flood, logo hit. Each one is placed by its measured peak.
- Voices: the caller gets a light telephone EQ, the agent a clean presence EQ; the outro claim sits dry-ish on top.

usage: python synth.py <events.json> <clean voice dir> <out dir>
Writes music.wav, sfx.wav, voice.wav and mix.wav (48 kHz stereo, pre-loudnorm).
"""
import json
import sys
import wave
import warnings

import numpy as np
from scipy import signal
from scipy.io import wavfile

warnings.simplefilter('ignore', wavfile.WavFileWarning)
SR = 48000
rng = np.random.default_rng(100)


# ── helpers ──────────────────────────────────────────────────────────────────
def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_adsr(n, a, d, s, r, gate):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    rel = t > gate
    e[rel] = e[rel] * np.exp(-(t[rel] - gate) / max(r, 1e-6))
    return e


def saw(freq, n, phase0=0.0):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,))
    inc = f / SR
    ph = (phase0 + np.cumsum(inc)) % 1.0
    y = 2 * ph - 1
    m = ph < inc
    x = ph[m] / inc[m]
    y[m] -= x + x - x * x - 1
    m = ph > 1 - inc
    x = (ph[m] - 1) / inc[m]
    y[m] -= x * x + x + x + 1
    return y


def lp(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=0)


def hp(x, fc, order=2):
    sos = signal.butter(order, fc, 'high', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=0)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=0)


def peaking(x, f0, gain_db, q=1.0):
    a = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / SR
    al = np.sin(w0) / (2 * q)
    b = [1 + al * a, -2 * np.cos(w0), 1 - al * a]
    aa = [1 + al / a, -2 * np.cos(w0), 1 - al / a]
    return signal.lfilter(np.array(b) / aa[0], np.array(aa) / aa[0], x, axis=0)


def sweep(x, kind, f0, f1, block=256, q=1.2):
    out = np.zeros_like(x)
    n = len(x)
    zi = None
    for i in range(0, n, block):
        u = i / max(n - 1, 1)
        fc = f0 * (f1 / f0) ** u
        if kind == 'bp':
            lo, hi = fc / (1 + 0.5 / q), fc * (1 + 0.5 / q)
            sos = signal.butter(2, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos')
        else:
            sos = signal.butter(2, min(fc, SR * 0.45), kind, fs=SR, output='sos')
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[i:i + block], zi = signal.sosfilt(sos, x[i:i + block], zi=zi)
    return out


def noise(n):
    return rng.standard_normal(n)


def pan(mono, p):
    a = (np.asarray(p) + 1) * np.pi / 4
    return np.stack([mono * np.cos(a), mono * np.sin(a)], axis=1)


def to_stereo(m):
    return np.stack([m, m], axis=1)


def add(buf, clip, t0):
    i = int(round(t0 * SR))
    if i < 0:
        clip, i = clip[-i:], 0
    j = min(len(buf), i + len(clip))
    if j > i:
        buf[i:j] += clip[: j - i]


def peak_time(clip):
    mono = clip.mean(axis=1) if clip.ndim == 2 else clip
    w = int(0.005 * SR)
    rms = np.sqrt(np.convolve(mono ** 2, np.ones(w) / w, mode='same'))
    return int(np.argmax(rms)) / SR


def place(buf, clip, t_event, level=1.0):
    clip = clip / max(np.abs(clip).max(), 1e-9) * level
    add(buf, clip, t_event - peak_time(clip))


def reverb_ir(seconds=2.2, predelay=0.022, damp=4800):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.stack([noise(n), noise(n)], axis=1) * np.exp(-t / (seconds / 6.5))[:, None]
    ir = lp(ir, damp)
    ir[: int(predelay * SR)] = 0
    return ir / np.sqrt((ir ** 2).sum() / 2)


IR = reverb_ir()


def reverb(st):
    return np.stack([signal.fftconvolve(st[:, c], IR[:, c])[: len(st)] for c in range(2)], axis=1)


def bell(freq, m, decay, parts=((1, 1), (2.01, 0.45), (3.02, 0.22), (4.17, 0.12))):
    t = np.arange(m) / SR
    return sum(a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t / (decay / r ** 0.6)) for r, a in parts) * np.clip(t / 0.002, 0, 1)


def marimba(freq, m=None, decay=0.32):
    m = m or int(0.9 * SR)
    t = np.arange(m) / SR
    body = np.sin(2 * np.pi * freq * t) * np.exp(-t / decay)
    ov = np.sin(2 * np.pi * freq * 3.93 * t) * np.exp(-t / (decay * 0.18)) * 0.35
    knock = lp(noise(m), 1800) * np.exp(-t / 0.004) * 0.08
    return (body + ov + knock) * np.clip(t / 0.0015, 0, 1)


# ── music ────────────────────────────────────────────────────────────────────
E3, E4 = 52, 64
CHORDS = [  # (bass midi, chord tones) per bar, E major: I – vi7 – IVmaj7 – V6sus
    (40, [56, 59, 63, 66]),   # E: G#3 B3 D#4 F#4 (Emaj9-ish)
    (37, [56, 59, 61, 64]),   # C#m7
    (45, [57, 61, 64, 68]),   # Amaj7
    (47, [54, 59, 61, 66]),   # B6sus
]
RING = [76, 80, 83, 88]       # E5 G#5 B5 E6 — the ringtone motif, also the arp hook


def music(ev, voice_env):
    total, beat = ev['dur'], ev['beat']
    n = int(total * SR)
    t0 = ev['accept']                       # bar 1, beat 1
    t_end_chord = ev['logo']
    bar = 4 * beat
    nbar = int(np.ceil((t_end_chord - t0) / bar))

    pads = np.zeros((n, 2))
    sub = np.zeros(n)
    arp = np.zeros((n, 2))
    drums = np.zeros((n, 2))
    send = np.zeros((n, 2))

    def at(b):
        return t0 + b * beat

    # bars of the bed (stop at the logo hit, which carries the final chord)
    for k in range(nbar):
        bs = at(4 * k)
        if bs >= t_end_chord - 0.05:
            break
        be = min(at(4 * k + 4), t_end_chord)
        bass, tones = CHORDS[k % 4]
        dur = be - bs
        m = int((dur + 1.2) * SR)
        for j, note in enumerate(tones):
            v = sum(saw(midi_hz(note) * 2 ** (c / 1200), m, rng.random()) for c in (-7, 0, 6)) / 3
            v = lp(v, 1300 + 500 * min(k / 6, 1)) * env_adsr(m, 0.35, 0.6, 0.85, 0.9, dur)
            add(pads, pan(v * 0.07, (j - 1.5) * 0.4), bs)
        m2 = int((dur + 0.4) * SR)
        tt = np.arange(m2) / SR
        sv = np.sin(2 * np.pi * midi_hz(bass) * tt) * env_adsr(m2, 0.02, 0.5, 0.7, 0.25, dur - 0.05)
        add(sub, sv * 0.22, bs)
        # marimba arp: 8ths, ringtone-shaped contour over the chord
        for s in range(8):
            ts = bs + s * beat / 2
            if ts >= be - 1e-3:
                break
            pool = sorted(tones + [x + 12 for x in tones])
            idx = [0, 2, 4, 6, 5, 3, 4, 2][s]
            note = pool[min(idx, len(pool) - 1)] + 12
            g = 0.085 if s % 2 == 0 else 0.06
            add(arp, pan(marimba(midi_hz(note), int(0.7 * SR), 0.25) * g, 0.5 * np.sin(s * 1.3 + k)), ts)

    # drums: soft kick on 1 and 3 from bar 1; brushed hats from bar 3; rim on 2 and 4 from bar 7
    def kick():
        m = int(0.45 * SR)
        t = np.arange(m) / SR
        f = 48 + 90 * np.exp(-t / 0.03)
        return np.tanh(1.2 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)) * 0.42

    def hat(decay=0.05):
        m = int(0.25 * SR)
        t = np.arange(m) / SR
        return bp(noise(m), 6000, 14000) * np.exp(-t / decay) * 0.22

    def rim():
        m = int(0.12 * SR)
        t = np.arange(m) / SR
        return (bp(noise(m), 1500, 4000) * np.exp(-t / 0.012) + np.sin(2 * np.pi * 820 * t) * np.exp(-t / 0.02) * 0.4) * 0.22

    K = kick()
    kicks = []
    nbeats = int((t_end_chord - t0) / beat)
    for b in range(nbeats):
        tb = at(b)
        if tb >= t_end_chord - 0.05:
            break
        if b % 2 == 0:
            add(drums, to_stereo(K), tb)
            kicks.append(tb)
        if b >= 8:
            add(drums, pan(hat(0.035) * 0.6, 0.3), tb + beat / 2)
        if b >= 24 and b % 4 in (1, 3):
            r = rim()
            add(drums, pan(r, -0.1), tb)
            add(send, pan(r * 0.5, 0), tb)

    # final chord on the logo hit (Eadd9 spread), long tail
    m = int((total - t_end_chord + 0.2) * SR)
    for j, note in enumerate([40, 52, 59, 64, 66, 68, 71]):
        v = sum(saw(midi_hz(note) * 2 ** (c / 1200), m, rng.random()) for c in (-6, 0, 7)) / 3
        v = lp(v, 2200) * env_adsr(m, 0.01, 1.2, 0.55, 0.6, m / SR - 0.4)
        add(pads, pan(v * 0.08, (j - 3) * 0.25), t_end_chord)
    for j, note in enumerate([76, 80, 83, 88]):
        add(arp, pan(marimba(midi_hz(note), int(1.6 * SR), 0.6) * 0.09, -0.4 + j * 0.27), t_end_chord + j * 0.075)
    tt = np.arange(m) / SR
    add(sub, np.sin(2 * np.pi * midi_hz(28) * tt) * np.exp(-tt / 1.4) * 0.3, t_end_chord)

    # duck the bed under speech (voice envelope), plus a light kick pump
    duck = 1 - 0.55 * voice_env
    for tk in kicks:
        i = int(tk * SR)
        mm = min(int(0.35 * SR), n - i)
        if mm <= 0:
            continue
        tt = np.arange(mm) / SR
        duck[i:i + mm] *= 1 - 0.25 * np.exp(-tt / 0.1) * np.clip(tt / 0.004, 0, 1)

    bed = pads + arp
    wet = reverb(bed * 0.5 + send)
    out = drums * duck[:, None] + to_stereo(sub * duck) + bed * duck[:, None] + wet * 0.3
    # nothing before the pickup except the final reverb tail
    gate = np.ones(n)
    gate[: int(t0 * SR)] = 0
    return out * gate[:, None]


# ── sound effects ────────────────────────────────────────────────────────────
def sfx_ring():
    """Generic marimba ringtone motif (four 16ths) + phone buzz. Not a system ringtone."""
    m = int(1.0 * SR)
    out = np.zeros((m, 2))
    for i, note in enumerate(RING):
        add(out, pan(marimba(midi_hz(note), int(0.8 * SR), 0.22) * (0.9 if i < 3 else 1.0), -0.15 + 0.1 * i), i * 0.075)
    t = np.arange(int(0.3 * SR)) / SR
    buzz = np.sign(np.sin(2 * np.pi * 150 * t)) * (0.5 + 0.5 * np.sin(2 * np.pi * 30 * t)) * (1 - t / 0.3)
    add(out, to_stereo(lp(buzz, 600) * 0.12), 0)
    return out


def sfx_pickup():
    m = int(1.1 * SR)
    t = np.arange(m) / SR
    click = hp(noise(m), 3000) * np.exp(-t / 0.003) * 0.4
    a = bell(midi_hz(71), m, 0.4)
    b = np.zeros(m)
    off = int(0.1 * SR)
    b[off:] = bell(midi_hz(76), m - off, 0.6)
    return pan(click, 0) + pan(a * 0.35, -0.15) + pan(b * 0.4, 0.15)


def sfx_whoosh(length=0.5, f0=400, f1=2600, p0=0.6, p1=-0.4):
    m = int(length * SR)
    t = np.arange(m) / SR
    w = sweep(noise(m), 'bp', f0, f1, q=1.4) * np.sin(np.pi * t / length) ** 3
    return pan(w, np.linspace(p0, p1, m))


def sfx_thump():
    m = int(0.5 * SR)
    t = np.arange(m) / SR
    v = np.sin(2 * np.pi * np.cumsum(70 + 60 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.12)
    return to_stereo(v * 0.8 + lp(noise(m), 900) * np.exp(-t / 0.02) * 0.2)


def sfx_tick(freq=2100, p=0.0):
    m = int(0.08 * SR)
    t = np.arange(m) / SR
    v = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.012) + hp(noise(m), 4000) * np.exp(-t / 0.002) * 0.3
    return pan(v, p)


def sfx_zip():
    m = int(0.3 * SR)
    t = np.arange(m) / SR
    return pan(sweep(noise(m), 'bp', 800, 6000, q=2) * np.sin(np.pi * t / 0.3) ** 2, 0)


def sfx_tock(note=64):
    m = int(0.45 * SR)
    t = np.arange(m) / SR
    wood = marimba(midi_hz(note), m, 0.09)
    sw = sweep(noise(m), 'bp', 1200, 3000, q=1.2) * np.exp(-t / 0.05) * 0.15
    return pan(wood + sw, 0.2)


def sfx_check(k=0):
    notes = [76, 80, 83, 88, 92]
    m = int(0.9 * SR)
    return pan(bell(midi_hz(notes[k % 5]), m, 0.3) * 0.5, -0.2 + 0.1 * k)


def sfx_shimmer():
    m = int(1.4 * SR)
    out = np.zeros((m, 2))
    for i, note in enumerate([83, 88, 92, 95]):
        off = int(i * 0.05 * SR)
        out[off:] += pan(bell(midi_hz(note), m - off, 0.55) * (0.32 - i * 0.04), -0.4 + 0.27 * i)
    return out + to_stereo(hp(noise(m), 9000) * np.exp(-np.arange(m) / SR / 0.2) * 0.04)


def sfx_hangup():
    m = int(0.7 * SR)
    a = bell(midi_hz(71), m, 0.25)
    b = np.zeros(m)
    off = int(0.12 * SR)
    b[off:] = bell(midi_hz(64), m - off, 0.35)
    return pan(a * 0.3 + b * 0.32, 0)


def sfx_flood(length=1.0):
    m = int(length * SR)
    t = np.arange(m) / SR
    shape = (t / length) ** 2 * np.exp(-np.clip(t - 0.85 * length, 0, None) / 0.06)
    w = sweep(noise(m), 'bp', 160, 1800, q=1.0) * shape
    swell = np.sin(2 * np.pi * np.cumsum(55 + 40 * t / length) / SR) * shape * 0.5
    return pan(w * 0.8 + swell, 0)


def sfx_logo():
    m = int(2.5 * SR)
    t = np.arange(m) / SR
    boom = np.sin(2 * np.pi * np.cumsum(36 + 40 * np.exp(-t / 0.06)) / SR) * np.exp(-t / 0.7)
    ping = bell(midi_hz(100), m, 0.9) * 0.18
    return to_stereo(np.tanh(boom * 1.1) * 0.8) + pan(ping, 0.1)


def sfx_sparkle():
    m = int(1.4 * SR)
    out = np.zeros((m, 2))
    for i, note in enumerate([95, 100, 104, 107]):
        off = int(i * 0.045 * SR)
        out[off:] += pan(bell(midi_hz(note), m - off, 0.5) * (0.25 - i * 0.03), -0.4 + 0.25 * i)
    return out


LIB = {
    'ring': (sfx_ring, 0.5), 'pickup': (sfx_pickup, 0.5), 'whoosh': (sfx_whoosh, 0.3), 'thump': (sfx_thump, 0.4),
    'tick': (sfx_tick, 0.16), 'zip': (sfx_zip, 0.16), 'tock': (sfx_tock, 0.32), 'check': (sfx_check, 0.3),
    'shimmer': (sfx_shimmer, 0.36), 'hangup': (sfx_hangup, 0.34), 'flood': (sfx_flood, 0.42), 'logo': (sfx_logo, 0.72),
    'sparkle': (sfx_sparkle, 0.3),
}


def sfx(ev, total):
    n = int(total * SR)
    buf = np.zeros((n, 2))
    for e in ev['sfx']:
        fn, lvl = LIB[e['k']]
        args = e.get('a', [])
        place(buf, fn(*args), e['t'], lvl * e.get('g', 1.0))
    return buf + reverb(buf) * 0.14


# ── voices ───────────────────────────────────────────────────────────────────
def load(path):
    sr, x = wavfile.read(path)
    x = x.astype(np.float64) / 32768
    assert sr == SR, path
    return x


def phone_eq(x):
    y = bp(x, 280, 3800, order=2)
    y = peaking(y, 1700, 3.0, 0.9)
    return np.tanh(y * 1.6) / 1.4


def agent_eq(x):
    y = hp(x, 90)
    y = peaking(y, 3200, 2.0, 0.8)
    return y


def voices(ev, vdir, total):
    n = int(total * SR)
    out = np.zeros((n, 2))
    env = np.zeros(n)
    for l in ev['lines']:
        x = load(f"{vdir}/{l['id']}.wav")
        ki = l['id'].endswith('_ki')
        y = agent_eq(x) if ki else phone_eq(x)
        y = y / np.sqrt(np.mean(y ** 2) + 1e-12) * 0.11          # equal loudness per line
        add(out, pan(y, -0.06 if ki else 0.06), l['s'])
        add(env, np.ones(len(y)), l['s'])
    if ev.get('outroVO') is not None:
        x = load(f"{vdir}/08_outro.wav")
        y = agent_eq(x)
        y = y / np.sqrt(np.mean(y ** 2) + 1e-12) * 0.105
        add(out, pan(y, 0), ev['outroVO'])
        add(env, np.ones(len(y)) * 0.8, ev['outroVO'])
    # smooth the speech gate for the music duck (80 ms attack, 300 ms release)
    a, r = np.exp(-1 / (0.08 * SR)), np.exp(-1 / (0.3 * SR))
    sm = np.zeros(n)
    s = 0.0
    for i in range(0, n, 48):
        v = env[i]
        s = (a if v > s else r) ** 48 * s + (1 - (a if v > s else r) ** 48) * v
        sm[i:i + 48] = s
    return out + reverb(out) * 0.05, np.clip(sm, 0, 1)


def write(path, x):
    x = np.clip(x, -1, 1)
    pcm = (x * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    ev = json.load(open(sys.argv[1]))
    vdir, out = sys.argv[2], sys.argv[3]
    total = ev['dur']
    vo, venv = voices(ev, vdir, total)
    mus = music(ev, venv)
    fx = sfx(ev, total)
    tail = int(0.15 * SR)
    for x in (mus, fx, vo):
        x[-tail:] *= np.linspace(1, 0, tail)[:, None]
    mix = mus * 0.9 + fx + vo
    peak = max(np.abs(mix).max(), 1e-9)
    for name, x in (('music', mus * 0.9), ('sfx', fx), ('voice', vo), ('mix', mix)):
        write(f'{out}/{name}.wav', x / peak * 0.6)
    print('peak', round(float(peak), 3), 'seconds', round(total, 3))
