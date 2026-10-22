"""Scan a rendered film for single-frame pops.

A pop is a frame that differs from both neighbours while the neighbours agree with each other:
    score(f) = min(d(f, f-1), d(f, f+1)) - d(f-1, f+1)
Frames are compared at 240x135 in linear grey (mean absolute difference, 0-255).

usage: python popscan.py <video> [top=12]
"""
import subprocess
import sys

import numpy as np

W, H = 240, 135
video = sys.argv[1]
top = int(sys.argv[2]) if len(sys.argv) > 2 else 12
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', video, '-vf', f'scale={W}:{H}:flags=area,format=gray', '-f', 'rawvideo', '-'],
                     capture_output=True, check=True).stdout
F = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
n = len(F)
d = lambda a, b: float(np.abs(F[a] - F[b]).mean())
step = np.array([d(i, i - 1) for i in range(1, n)])
scores = []
for f in range(1, n - 1):
    s = min(step[f - 1], step[f]) - d(f - 1, f + 1)
    scores.append((s, f))
scores.sort(reverse=True)
fps = 60
print(f'frames {n}  median step {np.median(step):.2f}  max step {step.max():.2f} at frame {int(step.argmax()) + 1}')
print('top single-frame pop scores (score > 1.0 is worth a look):')
for s, f in scores[:top]:
    print(f'  frame {f:4d}  t={f / fps:6.3f}s  beat {f / fps / (60 / 130):5.2f}  score {s:6.2f}  steps {step[f - 1]:.2f}/{step[f]:.2f}')
print('largest frame-to-frame changes:')
for f in np.argsort(step)[::-1][:top]:
    print(f'  frame {f + 1:4d}  t={(f + 1) / fps:6.3f}s  beat {(f + 1) / fps / (60 / 130):5.2f}  step {step[f]:.2f}')
