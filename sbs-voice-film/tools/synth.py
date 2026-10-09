"""Soundtrack, sound effects and voice mix for the SBS Voice-Agent film.

Music and effects are synthesized here (no samples). The two voices are the ElevenLabs lines prepared by voice.py.
- Voices: rumble cut and a light presence lift for the agent; the caller gets a de-esser instead of the lift. Each line
  goes through a gentle compressor and a look-ahead peak limiter and is matched to the same loudness. Dry, no room.
- Music: 100 BPM, E major, bar grid anchored on the pickup (T_ACCEPT). Calm bed: a slowly drifting pad, a real sub
  below the voices, rim and shaker later on, the ringtone motif on marimba after the claim. Ducked 12 dB under all
  speech (reverb included), with the gaps between lines bridged so the bed doesn't breathe.
- SFX: ringtone, pickup chime, orb whoosh, bubble ticks, card and check sounds, booking shimmer, hang-up, SMS run, page
  flood, logo hit. Each cue is set by loudness (its loudest 100 ms, K-weighted) relative to the voices, waits for a
  speech pause where the film allows it, and the whole bus dips 6 dB under words.

usage: python synth.py <events.json> <clean voice dir> <out dir>
Writes music.wav, sfx.wav, voice.wav and mix.wav (48 kHz stereo, pre-loudnorm).
"""
import json
import sys
import wave
import warnings

import numpy as np
from scipy import ndimage, signal
from scipy.io import wavfile

warnings.simplefilter('ignore', wavfile.WavFileWarning)
SR = 48000
rng = np.random.default_rng(100)
VO_LUFS = -23.5          # every dialogue line is matched to this loudness (the claim sits 0.5 LU above)


# ── helpers ──────────────────────────────────────────────────────────────────
def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def taper(x, ms=20):
    """Half-cosine fade over the last `ms`, so a clip ends at exactly zero."""
    k = int(ms / 1000 * SR)
    w = 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, k))
    x = x.copy()
    x[-k:] *= w if x.ndim == 1 else w[:, None]
    return x


def env_adsr(n, a, d, s, r, gate):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    rel = t > gate
    e[rel] = e[rel] * np.exp(-(t[rel] - gate) / max(r, 1e-6))
    return taper(e)


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


def bp0(x, lo, hi):
    """Zero-phase band-pass, so x - k*bp0(x) turns the band down cleanly."""
    sos = signal.butter(2, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos')
    return signal.sosfiltfilt(sos, x, axis=0)


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


def follow(x, att, rel):
    """Envelope follower on a 1 ms control grid (block maximum), separate attack / release, linearly interpolated back."""
    pad = (-len(x)) % 48
    xd = np.pad(x, (0, pad), mode='edge').reshape(-1, 48).max(axis=1)
    a, r = np.exp(-1 / (att * 1000)), np.exp(-1 / (rel * 1000))
    y = np.empty_like(xd)
    s = xd[0]
    for i, v in enumerate(xd):
        c = a if v > s else r
        s = c * s + (1 - c) * v
        y[i] = s
    return np.interp(np.arange(len(x)), np.arange(len(y)) * 48 + 24, y)


# ── loudness (ITU-R BS.1770) ─────────────────────────────────────────────────
def kweight(x):
    y = signal.lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585], x, axis=0)
    return signal.lfilter([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621], y, axis=0)


def _power(x):
    y = kweight(x if x.ndim == 2 else x[:, None])
    return (y ** 2).sum(axis=1)


def loudness(x):
    """Integrated loudness in LUFS (400 ms blocks, absolute and relative gate)."""
    p = _power(x)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    c = np.concatenate([[0], np.cumsum(p)])
    st = np.arange(0, max(len(p) - blk, 0) + 1, hop)
    ms = (c[np.minimum(st + blk, len(p))] - c[st]) / blk
    lv = -0.691 + 10 * np.log10(ms + 1e-20)
    g = lv > -70
    g &= lv > -0.691 + 10 * np.log10(ms[g].mean()) - 10
    return -0.691 + 10 * np.log10(ms[g].mean())


def loudness_max(x, win=0.1):
    """The loudest `win` window in LUFS: how loud a short cue reads."""
    p = _power(x)
    w = min(int(win * SR), len(p))
    c = np.concatenate([[0], np.cumsum(p)])
    return -0.691 + 10 * np.log10(((c[w:] - c[:-w]) / w).max() + 1e-20)


# ── reverb: octave bands with their own decay (bright parts die first), no lows ──
def reverb_ir(seconds=2.2, predelay=0.025):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    for fc, rt in ((125, 1.5), (250, 1.5), (500, 1.4), (1000, 1.15), (2000, 0.85), (4000, 0.6), (8000, 0.4)):
        b = bp(np.stack([noise(n), noise(n)], axis=1), fc / np.sqrt(2), fc * np.sqrt(2))
        ir += b * np.exp(-6.91 * t / rt)[:, None] * (fc / 500) ** -0.5
    ir = hp(ir, 220)
    p, f = int(predelay * SR), int(0.01 * SR)
    ir[:p] = 0
    ir[p:p + f] *= np.linspace(0, 1, f)[:, None]
    return ir / np.sqrt((ir ** 2).sum() / 2)


IR = reverb_ir()


def reverb(st):
    return np.stack([signal.fftconvolve(st[:, c], IR[:, c])[: len(st)] for c in range(2)], axis=1)


def bell(freq, m, decay, parts=((1, 1), (2.01, 0.45), (3.02, 0.22), (4.17, 0.12))):
    t = np.arange(m) / SR
    return sum(a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t / (decay / r ** 0.6)) for r, a in parts) * np.clip(t / 0.002, 0, 1)


def bell_len(decay, extra=0.0):
    """Clip length that lets a bell ring down to about -43 dB."""
    return int((5 * decay + extra) * SR)


def marimba(freq, m=None, decay=0.32):
    m = m or int(0.9 * SR)
    t = np.arange(m) / SR
    body = np.sin(2 * np.pi * freq * t) * np.exp(-t / decay)
    ov = np.sin(2 * np.pi * freq * 3.93 * t) * np.exp(-t / (decay * 0.18)) * 0.35
    knock = lp(noise(m), 1800) * np.exp(-t / 0.004) * 0.08
    return (body + ov + knock) * np.clip(t / 0.0015, 0, 1)


def pad_voice(f0, m, env, air_fc=2800):
    """One pad tone: a sine with a slow ±3 cent drift (no detuned stack, so no beating) and a little filtered saw."""
    tt = np.arange(m) / SR
    drift = 2 ** (3 * np.sin(2 * np.pi * (0.09 + 0.05 * rng.random()) * tt + rng.random() * 6.28) / 1200)
    ph = np.cumsum(f0 * drift) / SR + rng.random()
    body = np.sin(2 * np.pi * ph) + 0.12 * np.sin(4 * np.pi * ph)
    air = saw(f0 * drift, m, rng.random())
    return (body * 0.8 + lp(air, air_fc) * 0.22) * env


# ── music ────────────────────────────────────────────────────────────────────
RING = [76, 80, 83, 88]       # E5 G#5 B5 E6 — the ringtone motif (also the SMS run and the end)
V = {  # (bass midi, pad voicing)
    'Eadd9': (40, [56, 59, 64, 66]), 'C#m7': (37, [56, 59, 61, 64]), 'Amaj7': (33, [57, 61, 64, 68]),
    'Bsus4': (35, [54, 59, 64, 66]), 'B': (35, [54, 59, 63, 66]), 'E': (40, [56, 59, 64, 68]),
}
# bar (1-based, bar 1 = the pickup) → [(beat offset, chord)], E major, 100 BPM
PLAN = {
    1: [(0, 'Eadd9')], 2: [(0, 'Eadd9')], 3: [(0, 'C#m7')], 4: [(0, 'C#m7')], 5: [(0, 'Amaj7')], 6: [(0, 'Amaj7')],
    7: [(0, 'Bsus4')], 8: [(0, 'Bsus4'), (2, 'B')], 9: [(0, 'C#m7')], 10: [(0, 'Amaj7')], 11: [(0, 'E')],
    12: [(0, 'E')],                       # from the flood on, the chords follow ev['outro'] / ev['logo'] (see music())
}


def speech_gate(spans, n, pre=0.15, post=0.05, bridge=0.6, att=0.06, rel=0.5):
    """1 under speech: the line spans opened `pre` early and closed `post` late, gaps under `bridge` bridged, smoothed."""
    spans = sorted(spans)
    merged = [list(spans[0])]
    for s, e in spans[1:]:
        if s - merged[-1][1] < bridge:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    g = np.zeros(n)
    for s, e in merged:
        g[max(0, int((s - pre) * SR)):int((e + post) * SR)] = 1
    return np.clip(follow(g, att, rel), 0, 1)


def music(ev, gate):
    total, beat = ev['dur'], ev['beat']
    n = int(round(total * SR))
    t0, t_logo, t_out = ev['accept'], ev['logo'], ev['outro']
    t_ring = ev.get('claimEnd', t_logo + 0.45) + 0.05             # the marimba motif answers the claim's last word
    bar = 4 * beat
    at = lambda b, k=0: t0 + (b - 1) * bar + k * beat          # bar b, beat offset k

    pads = np.zeros((n, 2))
    sub = np.zeros(n)
    keys = np.zeros((n, 2))
    drums = np.zeros((n, 2))
    send = np.zeros((n, 2))

    # chord events (a repeated chord is held, not re-attacked) with their end times
    evs = [(at(b, k), ch) for b in sorted(PLAN) for k, ch in PLAN[b] if at(b, k) < t_out - 1e-3]
    evs.append((t_out, 'Bsus4'))                                # the flood opens on a sus chord
    nb = t0 + bar * np.ceil((t_out - t0) / bar + 1e-6)         # next bar after the flood
    if nb + 2 * beat < t_logo - 1e-3:
        evs += [(nb, 'Amaj7'), (nb + 2 * beat, 'Bsus4')]        # under the claim, resolving on the logo
    elif nb + beat < t_logo - 1e-3:
        evs += [(nb, 'Amaj7')]
    evs = [e for i, e in enumerate(evs) if i == 0 or e[1] != evs[i - 1][1]]
    evs.append((t_logo, None))
    for (ts, ch), (te, _) in zip(evs[:-1], evs[1:]):
        bass, tones = V[ch]
        dur = te - ts
        m = int((dur + 5 * 0.4) * SR)
        e = env_adsr(m, 0.3, 0.8, 0.8, 0.4, dur)
        for j, note in enumerate(tones):
            add(pads, pan(hp(pad_voice(midi_hz(note), m, e), 160) * 0.06, (j - 1.5) * 0.4), ts)
        # the sub sits an octave under the chord root (55–82 Hz), below the voices; its 2nd harmonic carries it on
        # small speakers
        m2 = int((dur + 5 * 0.25) * SR)
        tt = np.arange(m2) / SR
        f = midi_hz(bass)
        sv = lp(np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(4 * np.pi * f * tt), 140)
        add(sub, sv * env_adsr(m2, 0.02, 0.6, 0.75, 0.25, dur - 0.05) * 0.075, ts)

    def kick():
        m = int(0.45 * SR)
        t = np.arange(m) / SR
        f = 48 + 90 * np.exp(-t / 0.03)
        return taper(np.tanh(1.2 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)) * 0.4, 30)

    def rim():
        m = int(0.12 * SR)
        t = np.arange(m) / SR
        return taper((bp(noise(m), 1500, 4000) * np.exp(-t / 0.012) + np.sin(2 * np.pi * 820 * t) * np.exp(-t / 0.02) * 0.4) * 0.14)

    def shaker():
        m = int(0.12 * SR)
        t = np.arange(m) / SR
        return bp(noise(m), 5000, 12000) * np.sin(np.pi * np.clip(t / 0.07, 0, 1)) ** 2 * 0.12

    K = kick()
    for b in range(1, 13):
        if b == 9:
            continue                                            # bar 9 thins to pad and sub
        add(drums, to_stereo(K * (0.6 if b == 1 else 1.0)), at(b))   # the pickup downbeat stays under the chime
        if b >= 4 and at(b, 2) < t_out - 1e-3:
            r = rim()
            add(drums, pan(r, -0.1), at(b, 2))
            add(send, pan(r * 0.5, 0), at(b, 2))
        if b >= 10:
            for k in range(8):
                ts = at(b, k / 2)
                if ts < t_out - 1e-3:
                    add(drums, pan(shaker() * (0.8 if k % 2 else 1.0), 0.35), ts)

    # final chord on the logo (E add9 spread) rings out before the end; the ring motif follows the claim; sub
    m = int((total - t_logo + 0.3) * SR)
    e = env_adsr(m, 0.012, 0.7, 0.35, 0.35, (total - t_logo) - 0.7)
    for j, note in enumerate([40, 52, 59, 64, 66, 68, 71]):
        v = pad_voice(midi_hz(note), m, e, 3200)
        add(pads, pan((hp(v, 160) if note > 45 else v) * 0.065, (j - 3) * 0.25), t_logo)
    for j, note in enumerate(RING):
        add(keys, pan(taper(marimba(midi_hz(note), int(1.6 * SR), 0.3)) * 0.08, -0.4 + j * 0.27), t_ring + j * 0.075)
    tt = np.arange(m) / SR
    add(sub, taper(np.sin(2 * np.pi * midi_hz(40) * tt) * np.exp(-tt / 0.6) * 0.26), t_logo)

    # duck everything (reverb return too) 12 dB under speech
    duck = 1 - 0.749 * gate
    bed = pads + keys
    wet = reverb(hp(bed * 0.5, 250) + send) * duck[:, None]
    out = (drums + bed) * duck[:, None] + to_stereo(sub * duck) + wet * 0.32
    out[: int(t0 * SR)] = 0                                     # bar 0 is the ringtone only
    k = int(1.2 * SR)
    out[-k:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, k)))[:, None]   # the logo chord fades with the picture
    return out


# ── sound effects ────────────────────────────────────────────────────────────
def sfx_ring():
    """Generic marimba ringtone motif (four 16ths) + phone buzz. Not a system ringtone."""
    m = int(1.4 * SR)
    out = np.zeros((m, 2))
    for i, note in enumerate(RING):
        add(out, pan(marimba(midi_hz(note), int(1.1 * SR), 0.22) * (0.9 if i < 3 else 1.0), -0.15 + 0.1 * i), i * 0.075)
    t = np.arange(int(0.3 * SR)) / SR
    buzz = (np.sin(2 * np.pi * 150 * t) + 0.3 * np.sin(2 * np.pi * 300 * t)) * (0.5 + 0.5 * np.sin(2 * np.pi * 30 * t)) * (1 - t / 0.3) ** 2
    add(out, to_stereo(lp(buzz, 400) * 0.1), 0)
    return out


def sfx_pickup():
    m = bell_len(0.4, 0.1)
    t = np.arange(m) / SR
    click = lp(hp(noise(m), 3000), 8000) * np.exp(-t / 0.003) * np.clip(t / 0.001, 0, 1) * 0.12
    a = bell(midi_hz(71), m, 0.4)
    b = np.zeros(m)
    off = int(0.1 * SR)
    b[off:] = bell(midi_hz(76), m - off, 0.4)                   # short enough not to ring under 'Elektro'
    return pan(click, 0) + pan(a * 0.35, -0.15) + pan(b * 0.4, 0.15)


def sfx_whoosh(length=0.5, f0=400, f1=2600, p0=0.6, p1=-0.4):
    m = int(length * SR)
    t = np.arange(m) / SR
    w = sweep(noise(m), 'bp', f0, f1, q=1.4) * np.sin(np.pi * t / length) ** 3
    return pan(w, np.linspace(p0, p1, m))


def thud(m, f0, f1, tau, knock=0.5):
    """Low hit that also reads on small speakers: a pitch-dropping sine with its 2nd harmonic and a 150–400 Hz knock."""
    t = np.arange(m) / SR
    ph = 2 * np.pi * np.cumsum(f0 + f1 * np.exp(-t / tau)) / SR
    return (np.sin(ph) + 0.35 * np.sin(2 * ph)) * 0.5, bp(noise(m), 150, 400) * np.exp(-t / 0.02) * np.clip(t / 0.0015, 0, 1) * knock


def sfx_thump():
    m = int(0.6 * SR)
    t = np.arange(m) / SR
    body, knock = thud(m, 70, 60, 0.03)
    return to_stereo(hp(body * np.exp(-t / 0.12) + knock + lp(noise(m), 900) * np.exp(-t / 0.02) * 0.2, 35))


def sfx_tick(freq=1319, p=0.0):
    m = int(0.09 * SR)
    t = np.arange(m) / SR
    v = np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.010) + lp(hp(noise(m), 3000), 7000) * np.exp(-t / 0.002) * 0.08
    return pan(v * np.clip(t / 0.0015, 0, 1), p)


def sfx_tock(note=64):
    m = int(0.45 * SR)
    t = np.arange(m) / SR
    wood = marimba(midi_hz(note), m, 0.09)
    sw = sweep(noise(m), 'bp', 1200, 3000, q=1.2) * np.exp(-t / 0.05) * 0.15
    return pan(wood + sw, 0.2)


def sfx_check(k=0):
    notes = [76, 80, 83, 88, 92]
    return pan(bell(midi_hz(notes[k % 5]), bell_len(0.3), 0.3) * 0.5, -0.2 + 0.1 * k)


def sfx_shimmer():
    m = bell_len(0.4, 0.15)
    out = np.zeros((m, 2))
    for i, note in enumerate([83, 88, 92, 95]):
        off = int(i * 0.05 * SR)
        out[off:] += pan(bell(midi_hz(note), m - off, 0.4) * (0.32 - i * 0.04), -0.4 + 0.27 * i)
    return hp(out + to_stereo(hp(noise(m), 9000) * np.exp(-np.arange(m) / SR / 0.2) * 0.04), 1000)


def sfx_hangup():
    m = bell_len(0.35, 0.12)
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
    return pan(hp(w * 0.8 + swell, 35), 0)


def sfx_logo():
    """Low hit only (no bell on top of the claim's last word); the 2nd harmonic keeps it on small speakers."""
    m = int(2.5 * SR)
    t = np.arange(m) / SR
    ph = 2 * np.pi * np.cumsum(48 + 40 * np.exp(-t / 0.06)) / SR
    boom = (np.sin(ph) + 0.35 * np.sin(2 * ph)) * np.exp(-t / 0.55) * np.clip(t / 0.004, 0, 1)
    return to_stereo(hp(boom, 35))


def sfx_bloop():
    m = int(0.16 * SR)
    t = np.arange(m) / SR
    f = 520 * (780 / 520) ** np.clip(t / 0.12, 0, 1)
    v = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * np.clip(t / 0.14, 0, 1)) ** 1.5
    return pan(v, 0)


def sfx_glass():
    m = bell_len(0.4, 0.07)
    a = bell(midi_hz(83), m, 0.3)
    b = np.zeros(m)
    off = int(0.07 * SR)
    b[off:] = bell(midi_hz(88), m - off, 0.4)
    return pan(a * 0.4 + b * 0.45, 0.1)


def sfx_panel():
    m = int(0.8 * SR)
    t = np.arange(m) / SR
    body, knock = thud(m, 60, 50, 0.04, 0.4)
    sw = sweep(noise(m), 'bp', 2500, 6000, q=1.3) * np.sin(np.pi * np.clip(t / 0.35, 0, 1)) ** 2 * 0.15   # above the voice formants
    return pan(hp(body * np.exp(-t / 0.14) + knock, 35) * 0.8, 0.2) + pan(sw, np.linspace(0.0, 0.5, m))


def sfx_pop():
    m = int(0.8 * SR)
    t = np.arange(m) / SR
    f = 380 + 600 * (1 - np.exp(-t / 0.03))
    v = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.06) * np.clip(t / 0.003, 0, 1)
    return pan(v + bell(midi_hz(95), m, 0.15) * 0.25, 0.5)


def sfx_mar(note=76):
    return pan(marimba(midi_hz(note), int(1.2 * SR), 0.22), 0.3 * np.sin(note))


def sfx_dark():
    m = int(1.0 * SR)
    t = np.arange(m) / SR
    shape = np.sin(np.pi * np.clip(t / 0.9, 0, 1)) ** 2
    return pan(hp(sweep(noise(m), 'bp', 700, 160, q=1.0) * shape + np.sin(2 * np.pi * 48 * t) * shape * 0.2, 35), 0)


# cue → (synth, loudness of its loudest 100 ms relative to the voices, in LU). Cues in speech pauses sit about 8 LU
# under the voices, cues that have to share a word 14 LU or more; with no speech around, 3 to 6 LU.
LIB = {
    'ring': (sfx_ring, -3), 'glass': (sfx_glass, -7), 'bloop': (sfx_bloop, -8), 'pickup': (sfx_pickup, -4),
    'whoosh': (sfx_whoosh, -9), 'thump': (sfx_thump, -9), 'tick': (sfx_tick, -20), 'panel': (sfx_panel, -10),
    'check': (sfx_check, -8), 'tock': (sfx_tock, -14), 'shimmer': (sfx_shimmer, -10), 'pop': (sfx_pop, -14),
    'hangup': (sfx_hangup, -6), 'mar': (sfx_mar, -9), 'flood': (sfx_flood, -4), 'dark': (sfx_dark, -10),
    'logo': (sfx_logo, -4),
}
ON_START = {'shimmer'}   # cues that hit with their first note (the rest line up their loudest moment with the event)


def peak_time(clip):
    mono = clip.mean(axis=1) if clip.ndim == 2 else clip
    w = int(0.005 * SR)
    rms = np.sqrt(np.convolve(mono ** 2, np.ones(w) / w, mode='same'))
    return int(np.argmax(rms)) / SR


def place(buf, clip, t_event, lufs, on_start=False):
    """Put a cue so its loudest 100 ms reads `lufs`, with its RMS peak (or its start) on t_event. 1 ms / 15 ms edges."""
    fi, fo = int(0.001 * SR), int(0.015 * SR)
    clip = clip.copy()
    clip[:fi] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, fi)))[:, None]
    clip[-fo:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, fo)))[:, None]
    clip *= 10 ** ((lufs - loudness_max(clip)) / 20)
    add(buf, clip, t_event - (0 if on_start else peak_time(clip)))


def word_gate(vo, n):
    """Fast speech gate for the effects: voiced 10 ms frames (within 40 dB of the loudest), pauses under 120 ms
    bridged, opened 20 ms early and smoothed over 50 ms. A cue in a pause plays at full level."""
    hop = int(0.005 * SR)
    p = np.convolve(vo.mean(axis=1) ** 2, np.ones(2 * hop) / (2 * hop), mode='same')[::hop]
    db = 10 * np.log10(p + 1e-12)
    m = ndimage.binary_closing(db > db.max() - 40, np.ones(24, bool))
    m = m | np.concatenate([m[4:], np.zeros(4, bool)])
    g = np.interp(np.arange(n), np.arange(len(m)) * hop, m.astype(float))
    h = np.hanning(int(0.05 * SR))
    return np.clip(signal.fftconvolve(g, h / h.sum(), mode='same'), 0, 1)


def sfx(ev, total, vref, gate):
    n = int(round(total * SR))
    buf = np.zeros((n, 2))
    for e in ev['sfx']:
        fn, rel = LIB[e['k']]
        place(buf, fn(*e.get('a', [])), e['t'], vref + rel + 20 * np.log10(e.get('g', 1.0)), e['k'] in ON_START)
    buf *= 10 ** (-6 * gate / 20)[:, None]                      # 6 dB down under words
    return buf + reverb(buf) * 0.14


def carve(x, t0, t1, lo=300, hi=4000, depth=-8.0):
    """Turn lo–hi Hz down by `depth` dB between t0 and t1 (50 ms ramps): room for the claim's last word."""
    w = np.zeros(len(x))
    w[int(t0 * SR):int(t1 * SR)] = 1
    k = int(0.05 * SR)
    w = np.convolve(w, np.ones(k) / k, mode='same')
    return x - bp0(x, lo, hi) * (1 - 10 ** (depth / 20)) * w[:, None]


# ── voices ───────────────────────────────────────────────────────────────────
def load(path):
    sr, x = wavfile.read(path)
    x = x.astype(np.float64) / 32768
    assert sr == SR, path
    return x


def voice_eq(x, presence=1.5):
    """Clean speech EQ: rumble cut, a touch of presence, nothing that colours the voice."""
    y = hp(x, 80)
    y = peaking(y, 250, -1.5, 0.9)          # a little less boom
    return peaking(y, 3500, presence, 0.8) if presence else y


def voiced_rms_db(y):
    """RMS in dB over the voiced 20 ms frames (within 30 dB of the loudest), so pauses don't count."""
    w = int(0.02 * SR)
    e = 10 * np.log10(np.convolve(y ** 2, np.ones(w) / w, mode='same') + 1e-12)
    return 10 * np.log10(np.mean(y[e > e.max() - 30] ** 2))


def deess(y, thr=-6.0, ratio=4.0):
    """Split-band de-esser: 5–11 kHz comes down where it rises above the 300–3000 Hz voice band minus 6 dB."""
    band = bp0(y, 5000, 11000)
    ms = lambda v, s: np.convolve(v ** 2, np.ones(int(s * SR)) / int(s * SR), mode='same')
    over = np.maximum(0, 10 * np.log10(ms(band, 0.005) + 1e-12) - 10 * np.log10(ms(bp0(y, 300, 3000), 0.03) + 1e-12) - thr)
    return y - band * follow(1 - 10 ** (-over * (1 - 1 / ratio) / 20), 0.002, 0.04)


def compress(y, thr_db, ratio=3.0, knee=6.0, att=0.005, rel=0.08):
    """Soft-knee compressor: peak detector (1 ms attack, 30 ms release), gain smoothed 5 ms / 80 ms."""
    o = 20 * np.log10(follow(np.abs(y), 0.001, 0.03) + 1e-9) - thr_db
    s = 1 - 1 / ratio
    gr = np.where(o <= -knee / 2, 0, np.where(o >= knee / 2, o * s, s * (o + knee / 2) ** 2 / (2 * knee)))
    return y * 10 ** (-follow(gr, att, rel) / 20)


def limit(y, ceil, look=0.002, rel=0.05):
    """Look-ahead peak limiter: the gain is already down `look` before each peak, and never lets one past the ceiling."""
    need = np.minimum(1.0, ceil / np.maximum(np.abs(y), 1e-9))
    need = ndimage.minimum_filter1d(need, 2 * int(look * SR) + 1)
    return y * np.minimum(1 - follow(1 - need, 0.0005, rel), need)


def voices(ev, vdir, total):
    n = int(round(total * SR))
    out = np.zeros((n, 2))
    spans = []
    items = [(l['id'], l['s']) for l in ev['lines']]
    if ev.get('outroVO') is not None:
        items.append(('08_outro', ev['outroVO']))
    for vid, t in items:
        x = load(f'{vdir}/{vid}.wav')
        caller = vid.endswith('_anruferin')
        y = deess(voice_eq(x, 0.0 if caller else 1.5))          # the caller's voice is very sibilant: no lift for her
        y = y * 10 ** ((-20 - voiced_rms_db(y)) / 20)
        y = compress(y, -24.0)                                  # about 4 dB on the vowels
        y = limit(y, 10 ** ((voiced_rms_db(y) + 11) / 20))      # peaks at most 11 dB over the voiced level
        st = pan(y, 0 if vid == '08_outro' else (0.06 if caller else -0.06))
        st *= 10 ** ((VO_LUFS + (0.5 if vid == '08_outro' else 0) - loudness(st)) / 20)
        add(out, st, t)
        spans.append((t, t + len(y) / SR))
    return out, spans                                           # dry voices: no added room


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
    n = int(round(total * SR))
    vo, spans = voices(ev, vdir, total)
    vref = loudness(vo)                                         # every cue is set against the voices' loudness
    mus = music(ev, speech_gate(spans, n)) * 0.8
    fx = sfx(ev, total, vref, word_gate(vo, n))
    if ev.get('claimEnd'):
        mus, fx = (carve(x, ev['logo'] - 0.05, ev['claimEnd'] + 0.05) for x in (mus, fx))
    tail = int(0.15 * SR)
    for x in (fx, vo):
        x[-tail:] *= np.linspace(1, 0, tail)[:, None]
    mix = mus + fx + vo
    peak = max(np.abs(mix).max(), 1e-9)
    for name, x in (('music', mus), ('sfx', fx), ('voice', vo), ('mix', mix)):
        write(f'{out}/{name}.wav', x / peak * 0.6)
    print('peak', round(float(peak), 3), 'seconds', round(total, 3), 'voice', round(vref, 2), 'LUFS',
          'music', round(loudness(mus), 2), 'sfx', round(loudness(fx), 2), 'mix', round(loudness(mix), 2))
