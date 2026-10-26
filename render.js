// Render a look to an mp4.
//   node render.js looks/glass.html                 -> out/glass.mp4 (with the clip's own sound)
//   node render.js looks/glass.html out/a.mp4 --seconds 3 --mute
// It opens the look in headless Chrome, calls window.seek(t) for every frame,
// screenshots it and pipes the frames into ffmpeg. Set FFMPEG=/path/to/ffmpeg if ffmpeg is not on your PATH.
const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');

const args = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf(name); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const mute = args.includes('--mute'); if (mute) args.splice(args.indexOf('--mute'), 1);
const seconds = parseFloat(flag('--seconds', '0'));
const fps = 30;
const look = args[0];
if (!look) { console.log('usage: node render.js looks/<look>.html [out.mp4] [--seconds N] [--mute]'); process.exit(1); }
const out = args[1] || path.join('out', path.basename(look, '.html') + '.mp4');
fs.mkdirSync(path.dirname(out), { recursive: true });
const FF = process.env.FFMPEG || 'ffmpeg';
const clip = path.join(__dirname, 'work', 'clip.mp4');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR', e.message));
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(look));
  await page.evaluate(() => window.ready);
  const dur = seconds || await page.evaluate(() => window.DURATION());
  if (!dur) { console.log('No frames found. Run ./extract.sh your-clip.mov first.'); await browser.close(); process.exit(1); }
  const n = Math.round(dur * fps);
  const withAudio = !mute && fs.existsSync(clip);
  const ff = spawn(FF, ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    ...(withAudio ? ['-i', clip, '-map', '0:v', '-map', '1:a?', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let k = 0; k < n; k++) {
    await page.evaluate(t => window.seek(t), k / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (k % 15 === 0) process.stdout.write(`\r${path.basename(look)}  ${k + 1}/${n}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log(`\rDone: ${out} (${dur.toFixed(2)}s)          `);
})();
