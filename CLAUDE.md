# reel-edit-starter: notes for Claude

This repo renders 1080x1920, 30 fps vertical videos from HTML "looks".

- `./extract.sh <clip> [start] [seconds] [--cutout]` writes `work/clip.mp4`, `work/frames/*.jpg`, `work/cutout/*.png` (RGBA) and `work/frames.js`. Each run wipes `work/`.
- `node render.js looks/<look>.html [out.mp4] [--seconds N] [--mute]` renders a look. It uses the audio of `work/clip.mp4` unless `--mute`.
- `./stitch.sh out/reel.mp4 a.mp4 b.mp4 ...` joins renders in order.
- ffmpeg comes from `$FFMPEG` if set, else `ffmpeg` on the PATH.

## Writing or changing a look

- A look calls `Look.start(t => { ... })` from `looks/engine.js`. The callback must draw everything for time `t` from scratch: no timers, no CSS transitions or animations, because render.js screenshots arbitrary times.
- Helpers: `Look.frame(t)` / `Look.cut(t)` give the clip frame and cut-out frame as images, `Look.paint(ctx, img, ...rect)` draws one, `Look.frameAt(k)`, `Look.count`, `Look.hasCutout()`, plus `Look.cl`, `Look.lerp`, `Look.ease.out/inout/back`.
- Put user-facing words and colours in the `CONFIG` block at the top.
- Text behind the person: background canvas, then the text, then the cut-out canvas on top.
- Keep text and cards off the face and eyes. Chest level is the safe spot. Keep the bottom 300 px and top 120 px clear for Instagram's own UI.
- No emojis on screen.

## Checking your work

Before a full render, grab stills: render with `--seconds` small, or open the look in Chrome. Then make a contact sheet with ffmpeg and look at it. Fix anything covering the face before rendering again.
