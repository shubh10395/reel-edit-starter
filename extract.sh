#!/usr/bin/env bash
# Turn a raw clip into the frames every look reads.
#   ./extract.sh clip.mov                  first 3 seconds
#   ./extract.sh clip.mov 4.5 2.6          2.6 seconds starting at 4.5s
#   ./extract.sh clip.mov 4.5 2.6 --cutout also cut you out of the background (for behind, documentary, orbit, spotlight)
# Writes work/clip.mp4, work/frames/, work/cutout/ and work/frames.js. Each run replaces the last one.
set -euo pipefail
cd "$(dirname "$0")"
FF="${FFMPEG:-ffmpeg}"
CUT=0; POS=()
for a in "$@"; do if [ "$a" = "--cutout" ]; then CUT=1; else POS+=("$a"); fi; done
SRC="${POS[0]:?usage: ./extract.sh clip.mov [start] [seconds] [--cutout]}"
START="${POS[1]:-0}"; SECS="${POS[2]:-3}"

rm -rf work && mkdir -p work/frames
# 1080x1920, 30 fps, centre-cropped to 9:16
"$FF" -v error -y -ss "$START" -t "$SECS" -i "$SRC" \
  -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,format=yuv420p" \
  -c:v libx264 -crf 12 -preset fast -c:a aac -b:a 192k work/clip.mp4
"$FF" -v error -i work/clip.mp4 -q:v 2 work/frames/%04d.jpg

if [ "$CUT" = 1 ]; then
  echo "Cutting you out (first run downloads a small model)..."
  mkdir -p work/cutout
  python3 tools/matte.py work/clip.mp4 work/alpha.mp4
  "$FF" -v error -i work/clip.mp4 -i work/alpha.mp4 -filter_complex "[1:v]format=gray[a];[0:v][a]alphamerge" work/cutout/%04d.png
fi

python3 - <<'PY'
import os, json
fr = sorted(f for f in os.listdir("work/frames") if f.endswith(".jpg"))
cu = sorted(f for f in os.listdir("work/cutout") if f.endswith(".png")) if os.path.isdir("work/cutout") else []
open("work/frames.js", "w").write("window.FRAMES=%s;\nwindow.CUTOUT=%s;\n" % (json.dumps(["frames/" + f for f in fr]), json.dumps(["cutout/" + f for f in cu])))
print(f"Ready: {len(fr)} frames ({len(fr)/30:.2f}s)" + (f", {len(cu)} cut-out frames" if cu else ""))
PY
