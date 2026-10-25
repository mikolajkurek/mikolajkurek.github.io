// Progressive pixel resolve for images: 8 → 16 → 32 → 64 → 128 px wide → full.
// The real <img> stays in the DOM (alt text, SEO); a canvas covers it meanwhile.

const STEPS = [8, 16, 32, 64, 128];

export function pixelate(img, { interval = 105 } = {}) {
  const wrap = img.closest('.pixel-img');
  if (!wrap || wrap.__running) return;
  let canvas = wrap.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    wrap.appendChild(canvas);
  }
  const ready = img.complete && img.naturalWidth ? Promise.resolve() : img.decode().catch(() => {});
  wrap.__running = true;
  wrap.classList.add('is-pixelating');

  ready.then(async () => {
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    const off = document.createElement('canvas');
    const octx = off.getContext('2d');

    // Match the image's object-fit: cover crop so the blocks line up with the photo
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(canvas.width / iw, canvas.height / ih);
    const cw = canvas.width / scale;
    const ch = canvas.height / scale;
    const [px, py] = (getComputedStyle(img).objectPosition || '50% 50%').split(' ').map((v) => parseFloat(v) / 100);
    const sx = (iw - cw) * (Number.isNaN(px) ? 0.5 : px);
    const sy = (ih - ch) * (Number.isNaN(py) ? 0.5 : py);
    const ratio = canvas.height / canvas.width;

    for (const sw of STEPS) {
      const sh = Math.max(1, Math.round(sw * ratio));
      off.width = sw;
      off.height = sh;
      octx.drawImage(img, sx, sy, cw, ch, 0, 0, sw, sh);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(off, 0, 0, sw, sh, 0, 0, canvas.width, canvas.height);
      await new Promise((r) => setTimeout(r, interval));
    }
    wrap.classList.remove('is-pixelating');
    wrap.__running = false;
  });
}

export function initPixelImages(root, { reducedMotion = false } = {}) {
  if (reducedMotion) return;
  root.querySelectorAll('img[data-pixel]').forEach((img) => {
    // Re-pixelate briefly on hover, like a glitch
    let cool = 0;
    img.closest('.pixel-img')?.addEventListener('pointerenter', () => {
      const now = performance.now();
      if (now - cool < 1800) return;
      cool = now;
      pixelate(img, { interval: 55 });
    });
  });
}
