"""Original soundtrack + sound effects for the Co-Pilot launch film.

Everything is synthesized here (no samples), so the audio is free to use anywhere.
- Music: 130 BPM, A minor, 32 beats. The song's drop lands on film beat 12 (it starts 12 beats before it).
- SFX: typing, send pop, 4 tosses, drop impact, card swoosh, click, success tone, page-fill whoosh, mark sparkle.
  Each effect is placed by its measured peak (RMS envelope maximum) on the event time from the film.

usage: python synth.py <events.json> <out_dir>
Writes music.wav, sfx.wav and mix.wav (48 kHz stereo, pre-loudnorm).
"""
import json
import sys
import wave

import numpy as np
from scipy import signal

SR = 48000
rng = np.random.default_rng(130)


# ── helpers ──────────────────────────────────────────────────────────────────
def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_adsr(n, a, d, s, r, gate):
    """ADSR in seconds; gate = note length in seconds."""
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


def sweep(x, kind, f0, f1, block=256, q=1.2):
    """Time-varying filter: cutoff/centre glides exponentially from f0 to f1."""
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
    """p in [-1, 1] (scalar or array), equal-power."""
    a = (np.asarray(p) + 1) * np.pi / 4
    return np.stack([mono * np.cos(a), mono * np.sin(a)], axis=1)


def add(buf, clip, t0):
    i = int(round(t0 * SR))
    if i < 0:
        clip, i = clip[-i:], 0
    j = min(len(buf), i + len(clip))
    if j > i:
        buf[i:j] += clip[: j - i]


def peak_time(clip):
    """Time of the loudest point (5 ms RMS envelope)."""
    mono = clip.mean(axis=1) if clip.ndim == 2 else clip
    w = int(0.005 * SR)
    rms = np.sqrt(np.convolve(mono ** 2, np.ones(w) / w, mode='same'))
    return int(np.argmax(rms)) / SR


def place(buf, clip, t_event, level=1.0):
    clip = clip / max(np.abs(clip).max(), 1e-9) * level
    add(buf, clip, t_event - peak_time(clip))


def reverb_ir(seconds=1.7, predelay=0.018, damp=5200):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.stack([noise(n), noise(n)], axis=1) * np.exp(-t / (seconds / 6.5))[:, None]
    ir = lp(ir, damp)
    ir[: int(predelay * SR)] = 0
    return ir / np.sqrt((ir ** 2).sum() / 2)


IR = reverb_ir()


def reverb(st):
    wet = np.stack([signal.fftconvolve(st[:, c], IR[:, c])[: len(st)] for c in range(2)], axis=1)
    return wet


def to_stereo(m):
    return np.stack([m, m], axis=1)


# ── music ────────────────────────────────────────────────────────────────────
def music(beat, total):
    n = int(total * SR)
    B = lambda b: b * beat
    S16 = beat / 4

    drums = np.zeros((n, 2))
    bass = np.zeros(n)
    pads = np.zeros((n, 2))
    pluck = np.zeros((n, 2))
    lead = np.zeros(n)
    fx = np.zeros((n, 2))
    send = np.zeros((n, 2))

    # chords: (start beat, end beat, bass midi, chord midis)
    AM7, FM7, C, G = (45, [57, 60, 64, 67]), (41, [53, 57, 60, 64]), (48, [55, 60, 64, 71]), (43, [55, 59, 62, 69])
    prog = [(0, 4, *AM7), (4, 8, *FM7), (8, 10, *C), (10, 11.75, *G),
            (12, 16, *AM7), (16, 20, *FM7), (20, 24, *C), (24, 28, *G),
            (28, 29.5, *FM7), (29.5, 34, 45, [57, 60, 64, 71, 76])]

    # pads: detuned saws, filter opens through the build
    for b0, b1, _, notes in prog:
        dur = B(b1 - b0)
        m = int((dur + 0.6) * SR)
        for k, note in enumerate(notes):
            v = sum(saw(midi_hz(note) * 2 ** (c / 1200), m, rng.random()) for c in (-9, 0, 8)) / 3
            fc0 = 500 + 2600 * min(b0 / 12, 1) if b0 < 12 else 2300
            v = lp(v, fc0) * env_adsr(m, 0.25 if b0 < 12 else 0.05, 0.4, 0.8, 0.35, dur)
            gain = 0.2 if b0 < 12 else 0.09
            if b0 >= 29.5:
                gain = 0.12
            add(pads, pan(v * gain, (k - 1.5) * 0.35), B(b0))

    # pluck arp, 16ths, chord tones over two octaves
    pattern = [0, 1, 2, 3, 4, 3, 2, 1]
    for b0, b1, _, notes in prog:
        if b0 >= 29.5:
            continue
        tones = notes + [x + 12 for x in notes]
        steps = int(round((b1 - b0) * 4))
        for s in range(steps):
            t0 = B(b0) + s * S16
            note = tones[pattern[s % len(pattern)] + (s // 8) % 2 * 2] + 12
            m = int(0.28 * SR)
            v = saw(midi_hz(note), m) * np.exp(-np.arange(m) / SR / 0.07)
            open_ = 900 + 3800 * min(b0 / 12, 1) if b0 < 12 else 3600
            v = lp(v, open_)
            g = 0.12 if b0 < 12 else 0.075
            add(pluck, pan(v * g, 0.45 * np.sin(s * 0.9)), t0)

    # drums
    def kick():
        m = int(0.5 * SR)
        t = np.arange(m) / SR
        f = 46 + 130 * np.exp(-t / 0.028)
        body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.17)
        click = hp(noise(m), 2500) * np.exp(-t / 0.004) * 0.35
        return np.tanh(1.6 * (body + click)) * 0.5

    def clap():
        m = int(0.4 * SR)
        t = np.arange(m) / SR
        e = sum(np.exp(-np.clip(t - d, 0, None) / (0.008 if d < 0.02 else 0.11)) * (t >= d) for d in (0, 0.011, 0.022))
        return bp(noise(m), 900, 2600) * e * 0.5

    def hat(decay=0.035):
        m = int(0.25 * SR)
        t = np.arange(m) / SR
        return hp(noise(m), 7500) * np.exp(-t / decay) * 0.5

    def snare(pitch=1.0):
        m = int(0.3 * SR)
        t = np.arange(m) / SR
        tone = np.sin(2 * np.pi * 190 * pitch * t) * np.exp(-t / 0.05)
        return (bp(noise(m), 1400 * pitch, 6000) * np.exp(-t / 0.09) + tone * 0.6) * 0.45

    def crash(length=1.8):
        m = int(length * SR)
        t = np.arange(m) / SR
        return hp(noise(m), 3800) * np.exp(-t / (length / 4)) * 0.25

    K = kick()
    kicks = [B(b) for b in range(12, 28)] + [B(29.5)]
    for tk in kicks:
        add(drums, to_stereo(K), tk)
    for b in range(13, 28, 2):
        c = clap()
        add(drums, pan(c, 0.05), B(b))
        add(send, pan(c * 0.6, 0), B(b))
    for b in np.arange(4.5, 8, 1.0):
        add(drums, pan(hat() * 0.6, 0.3), B(b))
    for s in range(int((11.75 - 8) * 4)):
        add(drums, pan(hat(0.02) * (0.3 + 0.4 * s / 15), 0.3), B(8) + s * S16)
    for b in np.arange(12.5, 28, 1.0):
        add(drums, pan(hat(0.09) * 0.8, 0.25), B(b))
    for s in range(16 * 4):
        if s % 2:
            add(drums, pan(hat(0.025) * 0.35, -0.3), B(12) + s * S16)
    # snare build: quarters, eighths, sixteenths, rising pitch, then a hole before the drop
    roll = [8, 9, 10, 10.5, 11] + list(np.arange(11.25, 11.75, 0.125))
    for i, b in enumerate(roll):
        sn = snare(1 + i * 0.05) * (0.45 + 0.55 * i / len(roll))
        add(drums, pan(sn, 0), B(b))
        add(send, pan(sn * 0.5, 0), B(b))
    add(drums, to_stereo(crash()), B(12))
    add(send, to_stereo(crash() * 0.5), B(12))
    add(drums, to_stereo(crash(1.2) * 0.6), B(20))
    add(drums, to_stereo(crash(2.6) * 1.1), B(29.5))
    add(send, to_stereo(crash(2.6) * 0.6), B(29.5))

    # bass: off-beat house bass + sub on the drop
    for b0, b1, root, _ in prog:
        if b0 < 12 or b0 >= 28:
            continue
        for b in np.arange(b0 + 0.5, b1, 1.0):
            m = int(0.3 * SR)
            f = midi_hz(root + 12)
            v = saw(f, m) * 0.6 + np.sin(2 * np.pi * f / 2 * np.arange(m) / SR)
            v = lp(v, 700) * env_adsr(m, 0.004, 0.09, 0.5, 0.05, 0.19)
            add(bass, v * 0.3, B(b))
    m = int(B(4.5) * SR)
    v = np.sin(2 * np.pi * midi_hz(33) * np.arange(m) / SR) * env_adsr(m, 0.01, 0.6, 0.6, 0.8, B(2.5))
    add(bass, v * 0.4, B(29.5))

    # lead hook on the drop (A minor pentatonic), dotted-eighth echo
    A4, B4, C5, D5, E5, G4, G5 = 69, 71, 72, 74, 76, 67, 79
    bars = [
        [(0, E5, 2), (3, E5, 2), (6, D5, 1), (8, C5, 2), (11, A4, 2), (14, C5, 2)],
        [(0, D5, 2), (3, C5, 2), (6, A4, 2), (10, G4, 2), (12, A4, 4)],
        [(0, E5, 2), (3, E5, 2), (6, G5, 2), (8, E5, 2), (11, D5, 2), (14, C5, 2)],
        [(0, D5, 3), (4, B4, 2), (7, D5, 2), (10, E5, 6)],
    ]
    for bi, bar in enumerate(bars):
        for st, note, ln in bar:
            t0 = B(12 + bi * 4) + st * S16
            dur = ln * S16 * 0.92
            m = int((dur + 0.25) * SR)
            t = np.arange(m) / SR
            f = midi_hz(note) * (1 + 0.003 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.12) / 0.2, 0, 1))
            v = (saw(f * 2 ** (6 / 1200), m) + saw(f * 2 ** (-6 / 1200), m, 0.4)) / 2
            e = env_adsr(m, 0.006, 0.12, 0.65, 0.08, dur)
            v = sweep(v * e, 'low', 4200, 1500)
            add(lead, v * 0.15, t0)
    lead_st = pan(lead, 0)
    d = int(0.75 * beat * SR)
    for k, (g, p) in enumerate([(0.32, -0.6), (0.18, 0.6), (0.1, -0.6)]):
        echo = np.zeros_like(lead)
        echo[d * (k + 1):] = lead[: -d * (k + 1)]
        lead_st += pan(lp(echo, 3000) * g, p)

    # riser into the drop and into the mark
    for a, b, lvl in ((B(6), B(11.75), 0.22), (B(27.6), B(29.45), 0.16)):
        m = int((b - a) * SR)
        r = sweep(noise(m), 'bp', 300, 7000, q=2.0) * np.linspace(0, 1, m) ** 2 * lvl
        add(fx, pan(r, 0), a)
        t = np.arange(m) / SR
        tone = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (2.5 * t / t[-1])) / SR) * np.linspace(0, 1, m) ** 3 * lvl * 0.25
        add(fx, pan(tone, 0), a)

    # sidechain duck from the kicks
    duck = np.ones(n)
    for tk in kicks:
        i = int(tk * SR)
        m = min(int(0.4 * SR), n - i)
        if m <= 0:
            continue
        tt = np.arange(m) / SR
        dk = 1 - 0.7 * np.exp(-tt / 0.12) * np.clip(tt / 0.004, 0, 1)
        duck[i:i + m] = np.minimum(duck[i:i + m], dk)

    # silence the hole right before the drop (except the kick-in)
    hole = np.ones(n)
    i0, i1 = int(B(11.75) * SR), int(B(12) * SR)
    hole[i0:i1] = np.linspace(1, 0, i1 - i0) ** 3

    bed = (pads + pluck) * duck[:, None]
    wet = reverb(bed * 0.6 + lead_st * 0.35 + send)
    mixm = drums + to_stereo(bass * duck) + bed + lead_st * duck[:, None] + fx + wet * 0.32
    mixm *= hole[:, None]
    return mixm


# ── sound effects ────────────────────────────────────────────────────────────
def sfx_typing(k):
    m = int(0.07 * SR)
    t = np.arange(m) / SR
    tick = bp(noise(m), 2200 + 600 * (k % 3), 7000) * np.exp(-t / 0.006)
    thock = np.sin(2 * np.pi * (180 + 25 * (k % 4)) * t) * np.exp(-t / 0.018)
    return pan((tick * 0.5 + thock * 0.35) * (0.8 + 0.4 * rng.random()), -0.15 + 0.3 * rng.random())


def sfx_send_pop():
    m = int(0.25 * SR)
    t = np.arange(m) / SR
    f = 320 + 700 * (1 - np.exp(-t / 0.035))
    v = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.07) * np.clip(t / 0.003, 0, 1)
    click = hp(noise(m), 3000) * np.exp(-t / 0.003) * 0.3
    return pan(v * 0.9 + click, 0.2)


def sfx_toss(k):
    m = int(0.32 * SR)
    t = np.arange(m) / SR
    w = sweep(noise(m), 'bp', 500 * 1.12 ** k, 3600 * 1.12 ** k, q=1.6) * np.sin(np.pi * np.clip(t / 0.26, 0, 1)) ** 2
    plip = np.sin(2 * np.pi * midi_hz(81 + [0, 2, 4, 7][k]) * t) * np.exp(-np.clip(t - 0.02, 0, None) / 0.05) * (t > 0.02)
    return pan(w * 0.5 + plip * 0.22, -0.2 + 0.13 * k)


def sfx_drop_impact():
    m = int(1.4 * SR)
    t = np.arange(m) / SR
    sub = np.sin(2 * np.pi * np.cumsum(34 + 60 * np.exp(-t / 0.05)) / SR) * np.exp(-t / 0.5)
    crack = lp(noise(m), 2500) * np.exp(-t / 0.05)
    return to_stereo(np.tanh(1.3 * (sub + crack * 0.6)) * 0.95)


def sfx_swoosh(length=0.55):
    m = int(length * SR)
    t = np.arange(m) / SR
    w = sweep(noise(m), 'bp', 450, 2600, q=1.4) * np.sin(np.pi * t / length) ** 3
    return pan(w * 0.75, np.linspace(0.7, -0.7, m))


def sfx_click():
    m = int(0.06 * SR)
    t = np.arange(m) / SR
    v = hp(noise(m), 3500) * np.exp(-t / 0.0025) + np.sin(2 * np.pi * 2900 * t) * np.exp(-t / 0.006) * 0.4
    return pan(v * 0.8, -0.1)


def bell(freq, m, decay):
    t = np.arange(m) / SR
    parts = [(1, 1), (2.01, 0.45), (3.02, 0.22), (4.17, 0.12)]
    return sum(a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t / (decay / r ** 0.6)) for r, a in parts) * np.clip(t / 0.002, 0, 1)


def sfx_success():
    m = int(0.9 * SR)
    a = bell(midi_hz(88), m, 0.35)
    b = np.zeros(m)
    off = int(0.09 * SR)
    b[off:] = bell(midi_hz(93), m - off, 0.5)
    return pan(a * 0.32, -0.15) + pan(b * 0.36, 0.15)


def sfx_page_whoosh(length=1.0):
    m = int(length * SR)
    t = np.arange(m) / SR
    shape = (t / length) ** 2.2 * np.exp(-np.clip(t - 0.8 * length, 0, None) / 0.05)
    w = sweep(noise(m), 'bp', 180, 2200, q=1.1) * shape
    swell = np.sin(2 * np.pi * np.cumsum(60 + 80 * t / length) / SR) * shape * 0.4
    return pan(w * 0.9 + swell, 0)


def sfx_sparkle():
    m = int(1.6 * SR)
    out = np.zeros((m, 2))
    for i, note in enumerate([93, 97, 100, 105, 109]):
        off = int(i * 0.045 * SR)
        v = bell(midi_hz(note), m - off, 0.6) * (0.3 - i * 0.03)
        out[off:] += pan(v, -0.5 + 0.25 * i)
    shimmer = hp(noise(m), 9000) * np.exp(-np.arange(m) / SR / 0.25) * 0.05
    return out + to_stereo(shimmer)


def sfx(ev, total):
    n = int(total * SR)
    buf = np.zeros((n, 2))
    # typing: soft and quick, one per keystroke
    for k, t in enumerate(ev['typing']):
        place(buf, sfx_typing(k), t, 0.16 + 0.05 * rng.random())
    place(buf, sfx_send_pop(), ev['send'], 0.5)
    for k, t in enumerate(ev['tosses']):
        place(buf, sfx_toss(k), t + 0.06, 0.34)
    place(buf, sfx_drop_impact(), ev['drop'], 0.7)
    place(buf, sfx_swoosh(), ev['swoosh'], 0.42)
    place(buf, sfx_click(), ev['click'], 0.42)
    place(buf, sfx_success(), ev['success'], 0.42)
    place(buf, sfx_page_whoosh(), ev['page'], 0.48)
    place(buf, sfx_sparkle(), ev['sparkle'], 0.46)
    return buf + reverb(buf) * 0.12


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
    out = sys.argv[2]
    total = ev['dur']
    mus = music(ev['beat'], total)
    fx = sfx(ev, total)
    # gentle tail so the last frame doesn't click
    tail = int(0.12 * SR)
    for x in (mus, fx):
        x[-tail:] *= np.linspace(1, 0, tail)[:, None]
    peak = max(np.abs(mus + fx).max(), 1e-9)
    write(f'{out}/music.wav', mus / peak * 0.5)
    write(f'{out}/sfx.wav', fx / peak * 0.5)
    write(f'{out}/mix.wav', (mus + fx) / peak * 0.5)
    print('peak', round(float(peak), 3), 'seconds', round(total, 3))
