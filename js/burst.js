// Click burst: a pixel-snapped ring that expands, fragments into arcs and
// throws a few square particles outward.

const P = 6; // pixel size
const LIFE = 620; // ms
const SEGMENTS = 22;

const hash = (n) => {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};
const snap = (v) => Math.round(v / P) * P;

export function initBurst(canvas, getColor) {
  const ctx = canvas.getContext('2d');
  const bursts = [];
  let raf = 0;
  let w = 0;
  let h = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = innerWidth;
    h = innerHeight;
    canvas.width = Math.ceil(w * dpr);
    canvas.height = Math.ceil(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener('resize', resize);

  addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('input, textarea, select, .sticker')) return;
    const seed = Math.random() * 1000;
    const parts = Array.from({ length: 10 }, (_, i) => ({
      a: (i / 10) * Math.PI * 2 + hash(seed + i) * 0.5,
      v: 26 + hash(seed + i * 7) * 46,
      die: 0.7 + hash(seed + i * 3) * 0.3,
    }));
    bursts.push({ x: e.clientX, y: e.clientY, t0: performance.now(), color: getColor(), seed, parts });
    if (!raf) raf = requestAnimationFrame(tick);
  });

  function tick(now) {
    ctx.clearRect(0, 0, w, h);
    for (let i = bursts.length - 1; i >= 0; i--) {
      const t = (now - bursts[i].t0) / LIFE;
      if (t >= 1) bursts.splice(i, 1);
      else draw(bursts[i], t);
    }
    raf = bursts.length ? requestAnimationFrame(tick) : 0;
  }

  function dot(x, y) {
    ctx.fillRect(x - P / 2, y - P / 2, P, P);
  }

  function draw(b, t) {
    ctx.fillStyle = b.color;
    const e = 1 - Math.pow(1 - t, 3);
    const r = 6 + e * 52;
    const cx = snap(b.x);
    const cy = snap(b.y);

    // Centre flash: a pixel plus
    if (t < 0.16) {
      dot(cx, cy);
      dot(cx + P, cy); dot(cx - P, cy); dot(cx, cy + P); dot(cx, cy - P);
    }

    // Ring: whole arcs drop out as time passes
    const n = Math.max(12, Math.ceil((2 * Math.PI * r) / P));
    const seen = new Set();
    for (let k = 0; k < n; k++) {
      const seg = Math.floor((k / n) * SEGMENTS);
      if (hash(b.seed + seg) < t * 1.35 - 0.2) continue;
      const a = (k / n) * Math.PI * 2;
      const x = snap(b.x + Math.cos(a) * r);
      const y = snap(b.y + Math.sin(a) * r);
      const key = x * 10000 + y;
      if (seen.has(key)) continue;
      seen.add(key);
      dot(x, y);
    }

    // Debris
    if (t > 0.22) {
      for (const p of b.parts) {
        if (t > p.die) continue;
        const d = r + (t - 0.22) * p.v * 1.6;
        dot(snap(b.x + Math.cos(p.a) * d), snap(b.y + Math.sin(p.a) * d));
      }
    }
  }
}
