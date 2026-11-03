#!/usr/bin/env bash
# Master mix.wav to -14 LUFS integrated, -1 dBTP, keeping dynamics (linear loudnorm after a true-peak-safe limiter).
set -euo pipefail
in=${1:-mix.wav}; out=${2:-film-audio.wav}
I=$(ffmpeg -hide_banner -i "$in" -af loudnorm=I=-14:TP=-1:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p' | python3 -c "import json,sys;print(json.load(sys.stdin)['input_i'])")
# peak ceiling so that after the +gain to -14 LUFS the true peak sits under -1 dBTP; the limiter runs 4x oversampled
# (so inter-sample peaks are caught too) with its latency compensated
ceil=$(python3 -c "print(round(10**((-1.5-(-14-$I))/20),4))")
ffmpeg -v error -y -i "$in" -af "aresample=192000,alimiter=limit=$ceil:attack=5:release=80:level=disabled:latency=1,aresample=48000" -c:a pcm_f32le limited.wav
J=$(ffmpeg -hide_banner -i limited.wav -af loudnorm=I=-14:TP=-1:LRA=20:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
MI=$(echo "$J" | python3 -c "import json,sys;d=json.load(sys.stdin);print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
S=$(ffmpeg -hide_banner -nostats -y -i limited.wav -af "loudnorm=I=-14:TP=-1:LRA=20:$MI:linear=true:print_format=summary,aresample=48000" -c:a pcm_s16le "$out" 2>&1)
rm -f limited.wav
echo "$S" | grep -E "Normalization Type|Output Integrated|Output True Peak|Output LRA" || true
# a dynamic (AGC) loudnorm would ride the gain through the film: refuse it
echo "$S" | grep -qE "Normalization Type:\s+Linear" || { echo "loudnorm fell back to dynamic mode" >&2; exit 1; }
# trim to exactly -14.0 LUFS integrated
M=$(ffmpeg -hide_banner -i "$out" -af ebur128 -f null - 2>&1 | grep -A3 "Integrated loudness" | grep "I:" | awk '{print $2}')
G=$(python3 -c "print(round(-14.0-($M),2))")
ffmpeg -v error -y -i "$out" -af "volume=${G}dB" -c:a pcm_s16le "${out%.wav}.tmp.wav" && mv "${out%.wav}.tmp.wav" "$out"
ffmpeg -hide_banner -i "$out" -af ebur128=peak=true -f null - 2>&1 | grep -A16 "Summary" | grep -E "I:|LRA:|Peak:"
