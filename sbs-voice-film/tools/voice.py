"""Prepare the TTS lines and time every word.

python voice.py <voice dir> <out dir> [tempo=1.0]

For each line in LINES:
  1. trim leading/trailing silence, shorten inner pauses to at most MAX_PAUSE,
  2. optionally time-stretch (rubberband, pitch kept) by `tempo`,
  3. estimate word onsets: the line is split into phrases at pauses >= PHRASE_GAP, words are assigned to
     phrases by a small DP (syllable weight vs. phrase length, preferring punctuation at phrase ends),
     and inside a phrase the voiced time is shared out by syllable weight.
Writes <out>/NN.wav (48 kHz mono) and <out>/voice.json; the film reads the timings through ../timing.js.
"""
import json
import warnings
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfiltfilt, resample_poly

LINES = [
    ('01_ki', 'ki', 'Elektro Wagner, guten Tag! Wie kann ich Ihnen helfen?', None),
    ('02_anruferin', 'anruferin', 'Hallo! Bei uns im Büro fliegt ständig die Sicherung raus.', None),
    ('03_ki', 'ki', 'Das klingt dringend. Wie ist Ihr Name und Ihre Adresse?', None),
    ('04_anruferin', 'anruferin', 'Sabine Krüger, Hafenstraße 12 in Bremen.', 'Sabine Krüger, Hafenstraße zwölf in Bremen.'),
    ('05_ki', 'ki', 'Danke, Frau Krüger. Morgen um 8 Uhr ist ein Techniker frei. Passt das?', 'Danke, Frau Krüger. Morgen um acht Uhr ist ein Techniker frei. Passt das?'),
    ('06_anruferin', 'anruferin', 'Ja, das passt perfekt!', None),
    ('07_ki', 'ki', 'Ist gebucht! Die Bestätigung kommt gleich per SMS.', 'Ist gebucht! Die Bestätigung kommt gleich per Es Em Es.'),
    ('08_outro', 'ki', 'Ihr Telefon ist ab heute nie mehr besetzt.', None),
]
SR = 48000
HOP = 0.005
MAX_PAUSE = 0.36
PHRASE_GAP = 0.11
EDGE_PAD = 0.02


def syllables(word):
    w = word.lower()
    return max(1, len(re.findall(r'[aeiouäöüy]+', w)))


def envelope_db(x, sr):
    n = int(sr * 0.02)
    h = int(sr * HOP)
    pad = np.pad(x, (n // 2, n // 2))
    frames = np.lib.stride_tricks.sliding_window_view(pad, n)[::h]
    rms = np.sqrt(np.mean(frames ** 2, axis=1) + 1e-12)
    return 20 * np.log10(rms + 1e-9)


def voiced_mask(x, sr):
    db = envelope_db(x, sr)
    thr = max(db.max() - 38, -50)
    return db > thr


def runs(mask):
    """[(start_idx, end_idx_exclusive, value)] of consecutive equal values."""
    out, i = [], 0
    while i < len(mask):
        j = i
        while j < len(mask) and mask[j] == mask[i]:
            j += 1
        out.append((i, j, bool(mask[i])))
        i = j
    return out


def splice(x, m, sr, xf):
    """Rebuild x with every inner pause longer than MAX_PAUSE shortened to MAX_PAUSE (crossfaded)."""
    cuts = []
    for i, j, v in runs(m):
        dur = (j - i) * HOP
        if v or i == 0 or j == len(m) or dur <= MAX_PAUSE:
            continue
        mid = (i + j) / 2 * HOP
        remove = dur - MAX_PAUSE
        cuts.append((int((mid - remove / 2) * sr), int((mid + remove / 2) * sr)))
    out, pos = np.zeros(0, dtype=np.float64), 0
    fade_in, fade_out = np.linspace(0, 1, xf), np.linspace(1, 0, xf)
    for c0, c1 in cuts:
        seg = x[pos:c0 + xf].astype(np.float64)
        if len(out):
            seg[:xf] = seg[:xf] * fade_in + out[-xf:] * fade_out
            out = out[:-xf]
        out = np.concatenate([out, seg])
        pos = c1
    seg = x[pos:].astype(np.float64)
    if len(out):
        seg[:xf] = seg[:xf] * fade_in + out[-xf:] * fade_out
        out = out[:-xf]
    return np.concatenate([out, seg])


def stretch(x, sr, tempo):
    if abs(tempo - 1) < 1e-4:
        return x
    with tempfile.TemporaryDirectory() as d:
        a, b = Path(d) / 'a.wav', Path(d) / 'b.wav'
        wavfile.write(a, sr, (np.clip(x, -1, 1) * 32767).astype(np.int16))
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(a), '-af', f'rubberband=tempo={tempo}:pitchq=quality:formant=preserved', str(b)], check=True)
        _, y = wavfile.read(b)
    return y.astype(np.float64) / 32768


def phrases(x, sr):
    """Voiced phrases [(t0, t1, voiced_seconds)] split at pauses >= PHRASE_GAP."""
    m = voiced_mask(x, sr)
    rs = runs(m)
    out, cur = [], None
    for i, j, v in rs:
        t0, t1 = i * HOP, j * HOP
        if v:
            if cur is None:
                cur = [t0, t1, t1 - t0]
            else:
                cur[1], cur[2] = t1, cur[2] + (t1 - t0)
        elif cur is not None and (t1 - t0) >= PHRASE_GAP:
            out.append(tuple(cur))
            cur = None
    if cur is not None:
        out.append(tuple(cur))
    return out, m


def assign(words, spoken, ph):
    """DP: contiguous word groups -> phrases. Returns list of (first_word, last_word) per phrase."""
    wts = [syllables(s) + 0.6 for s in spoken]
    W, P = len(words), len(ph)
    tot_w, tot_d = sum(wts), sum(p[2] for p in ph)
    rate = tot_w / tot_d
    pre = np.concatenate([[0], np.cumsum(wts)])
    INF = 1e18
    best = np.full((P + 1, W + 1), INF)
    back = np.zeros((P + 1, W + 1), dtype=int)
    best[0][0] = 0
    for k in range(1, P + 1):
        for j in range(1, W + 1):
            for i in range(k - 1, j):
                if best[k - 1][i] >= INF:
                    continue
                g = pre[j] - pre[i]
                c = ((g - ph[k - 1][2] * rate) / max(g, 1)) ** 2
                if k < P and not re.search(r'[,.!?]$', words[j - 1]):
                    c += 0.12
                c += 0.3 * sum(1 for w in words[i:j - 1] if re.search(r'[.!?]$', w))  # sentence ends close phrases
                if best[k - 1][i] + c < best[k][j]:
                    best[k][j], back[k][j] = best[k - 1][i] + c, i
    groups, j = [], W
    for k in range(P, 0, -1):
        i = back[k][j]
        groups.append((i, j))
        j = i
    return groups[::-1], wts


def word_times(words, spoken, x, sr):
    ph, m = phrases(x, sr)
    groups, wts = assign(words, spoken, ph)
    out = []
    for (i, j), (t0, t1, vd) in zip(groups, ph):
        # voiced timeline of this phrase, so short stop gaps don't shift the words
        a, b = int(t0 / HOP), int(t1 / HOP)
        vm = m[a:b]
        cum = np.concatenate([[0], np.cumsum(vm)]) * HOP
        g = sum(wts[i:j])
        acc = 0.0
        for k in range(i, j):
            s_v = vd * acc / g
            acc += wts[k]
            e_v = vd * acc / g
            s = t0 + np.searchsorted(cum, s_v) * HOP
            e = t0 + max(0, np.searchsorted(cum, e_v) - 1) * HOP
            out.append({'w': words[k], 's': round(float(s), 3), 'e': round(float(min(e, t1)), 3)})
        out[-1]['e'] = round(float(t1), 3)
    return out, [(round(a, 3), round(b, 3)) for a, b, _ in ph]


def main():
    warnings.simplefilter('ignore', wavfile.WavFileWarning)
    vdir, odir = Path(sys.argv[1]), Path(sys.argv[2])
    tempo = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
    odir.mkdir(parents=True, exist_ok=True)
    meta = []
    for name, who, text, spoken_text in LINES:
        f = vdir / f'{name}.wav'
        if not f.exists():
            print('missing', f)
            continue
        sr0, x = wavfile.read(f)
        x = x.astype(np.float64) / 32768
        if x.ndim > 1:
            x = x.mean(axis=1)
        x = resample_poly(x, SR, sr0) if sr0 != SR else x
        raw = len(x) / SR
        x = splice(*trim(x), SR, int(SR * 0.008))
        x = stretch(x, SR, tempo if name != '08_outro' else min(tempo, 1.04))
        words = text.split()
        spoken = (spoken_text or text).split()
        if len(spoken) != len(words):
            spoken = words
        wt, ph = word_times(words, spoken, x, SR)
        wavfile.write(odir / f'{name}.wav', SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
        meta.append({'id': name, 'who': who, 'text': text, 'dur': round(len(x) / SR, 3), 'raw': round(raw, 3), 'phrases': ph, 'words': wt})
        print(f'{name:14s} raw {raw:5.2f}s  -> {len(x) / SR:5.2f}s  phrases {ph}')
        print('   ', ' '.join(f"{w['w']}@{w['s']:.2f}" for w in wt))
    (odir / 'voice.json').write_text(json.dumps({'tempo': tempo, 'lines': meta}, ensure_ascii=False, indent=1))


def trim(x):
    m = voiced_mask(x, SR)
    on = np.flatnonzero(m)
    a = max(0, int((on[0] * HOP - EDGE_PAD) * SR))
    b = min(len(x), int(((on[-1] + 1) * HOP + EDGE_PAD) * SR))
    y = x[a:b]
    return y, voiced_mask(y, SR)


if __name__ == '__main__':
    main()
