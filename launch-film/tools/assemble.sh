#!/usr/bin/env bash
# Join the rendered chunks with the mastered audio: assemble.sh <chunks.txt> <film-audio.wav> <out.mp4>
set -euo pipefail
ffmpeg -v error -y -f concat -safe 0 -i "$1" -i "$2" -map 0:v -map 1:a \
  -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" \
  -c:v libx264 -preset slow -crf 15 -profile:v high -r 60 \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest "$3"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of compact "$3"
