#!/usr/bin/env bash
# Join rendered looks into one reel, in order.
#   ./stitch.sh out/reel.mp4 out/glass.mp4 out/behind.mp4 out/gaming.mp4
set -euo pipefail
FF="${FFMPEG:-ffmpeg}"
OUT="${1:?usage: ./stitch.sh out/reel.mp4 a.mp4 b.mp4 ...}"; shift
IN=(); F=""; PAIRS=""; i=0
for f in "$@"; do
  IN+=(-i "$f")
  if "${FF%ffmpeg}ffprobe" -v error -select_streams a -show_entries stream=index -of csv=p=0 "$f" 2>/dev/null | grep -q .; then A="[$i:a]"
  else A="[a$i]"; F+="anullsrc=r=48000:cl=stereo,atrim=0:$("${FF%ffmpeg}ffprobe" -v error -show_entries format=duration -of csv=p=0 "$f")[a$i];"; fi
  F+="[$i:v]setsar=1[v$i];"; PAIRS+="[v$i]$A"; i=$((i+1))
done
"$FF" -v error -y "${IN[@]}" -filter_complex "${F}${PAIRS}concat=n=$i:v=1:a=1[v][a]" -map "[v]" -map "[a]" \
  -c:v libx264 -crf 16 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$OUT"
echo "Done: $OUT"
