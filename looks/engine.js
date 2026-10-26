// Shared engine for every look.
// A look is a 1080x1920 HTML page that draws one frame for any time t (seconds).
// render.js calls window.seek(t) for every frame and screenshots the page.
// Open a look in Chrome to preview it: it plays on loop.
const Look = (() => {
  const cl = x => Math.max(0, Math.min(1, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const ease = {
    out: p => 1 - Math.pow(1 - p, 3),
    inout: p => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    back: p => { const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
  };
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  let frames = [], cutout = [];

  async function init() {
    if (!window.FRAMES || !window.FRAMES.length) {
      document.body.insertAdjacentHTML('beforeend', '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#111;color:#fff;font:40px sans-serif;text-align:center;padding:80px;z-index:999">No frames yet.<br><br>Run ./extract.sh your-clip.mov first.</div>');
    }
    frames = await Promise.all((window.FRAMES || []).map(f => load('../work/' + f)));
    cutout = await Promise.all((window.CUTOUT || []).map(f => load('../work/' + f)));
    await Promise.all(['400 40px Geist', '800 40px Geist', '900 40px Geist', '600 40px "Geist Mono"', 'italic 400 40px "Instrument Serif"']
      .map(f => document.fonts.load(f, 'Aa')));
    await document.fonts.ready;
  }
  const at = (arr, t) => (arr.length ? arr[Math.max(0, Math.min(arr.length - 1, Math.floor(t * 30)))] : null);

  // draw the clip (or the cut-out) into a canvas context, optionally from a source rectangle
  function paint(g, img, ...rect) { if (img) g.drawImage(img, ...(rect.length ? rect : [0, 0, 1080, 1920])); }

  return {
    cl, lerp, ease, paint,
    frame: t => at(frames, t),
    cut: t => at(cutout, t),
    frameAt: k => frames[Math.max(0, Math.min(frames.length - 1, k))],
    get count() { return frames.length; },
    hasCutout: () => cutout.length > 0,
    start(draw) {
      window.DURATION = () => frames.length / 30;
      window.seek = t => { draw(t); return true; };
      window.ready = init().then(() => {
        draw(0);
        if (!navigator.webdriver) { // live preview in a normal browser
          const t0 = performance.now();
          const loop = () => { draw(((performance.now() - t0) / 1000) % Math.max(1, frames.length / 30)); requestAnimationFrame(loop); };
          requestAnimationFrame(loop);
        }
        return true;
      });
    },
  };
})();
