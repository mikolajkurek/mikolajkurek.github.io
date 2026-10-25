// Pixel wave: fills (cover) or clears (reveal) a canvas cell by cell. Cells are
// ordered by distance from an origin, broken up with a 4x4 Bayer dither so the
// wave edge reads as pixels rather than a circle. Each cell flashes the accent
// colour for a moment before settling, which gives the wave a bright leading edge.
// Works full-screen or scoped to a host element (the project swap in Work).

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16);
const easeInOut = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const LAG = 0.2; // share of the run a cell spends in the accent colour

// rAF with a timer fallback, so a wipe never stalls in a throttled/background tab
export const nextFrame = () => new Promise((r) => {
  const id = setTimeout(() => r(performance.now()), 50);
  requestAnimationFrame((t) => { clearTimeout(id); r(t); });
});

export class PixelGrid {
  constructor(canvas, { host = null, density = 44 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.host = host;
    this.density = density;
    this.resize();
  }

  // Works in device pixels so cells tile exactly, with no hairline seams.
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.host ? this.host.getBoundingClientRect() : { width: innerWidth, height: innerHeight };
    this.W = Math.max(1, Math.ceil(rect.width * this.dpr));
    this.H = Math.max(1, Math.ceil(rect.height * this.dpr));
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    const css = Math.min(40, Math.max(14, rect.width / this.density));
    this.cell = Math.max(1, Math.round(css * this.dpr));
    this.cols = Math.ceil(this.W / this.cell);
    this.rows = Math.ceil(this.H / this.cell);
  }

  order(origin) {
    const { cols, rows, cell, dpr } = this;
    const n = cols * rows;
    const ox = origin ? (origin.x * dpr) / cell : cols / 2;
    const oy = origin ? (origin.y * dpr) / cell : rows / 2;
    // Farthest corner from the origin, to normalise distances to 0..1
    const maxD = Math.max(
      Math.hypot(ox, oy), Math.hypot(cols - ox, oy),
      Math.hypot(ox, rows - oy), Math.hypot(cols - ox, rows - oy),
    );
    const keys = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const c = i % cols;
      const r = (i / cols) | 0;
      const d = Math.hypot(c - ox, r - oy) / maxD;
      keys[i] = d * 0.7 + BAYER[(r % 4) * 4 + (c % 4)] * 0.24 + Math.random() * 0.06;
    }
    const idx = new Uint32Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    return idx.sort((a, b) => keys[a] - keys[b]);
  }

  paint(i, color) {
    const { ctx, cell, cols } = this;
    const x = (i % cols) * cell;
    const y = ((i / cols) | 0) * cell;
    if (color) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, cell, cell);
    } else {
      ctx.clearRect(x, y, cell, cell);
    }
  }

  fill(color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.W, this.H);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.W, this.H);
  }

  // mode: 'cover' ends with every cell in `color`; 'reveal' ends with every cell cleared.
  async run(mode, color, { origin = null, duration = 450, accent = null } = {}) {
    const order = this.order(origin);
    const n = order.length;
    const final = mode === 'cover' ? color : null;
    const span = accent ? 1 - LAG : 1;
    let lit = 0;
    let settled = 0;
    const t0 = performance.now();
    for (;;) {
      const now = await nextFrame();
      const p = Math.min(1, (now - t0) / duration);
      const e = easeInOut(p);
      const litTo = p >= 1 ? n : Math.min(n, Math.floor((e / span) * n));
      const settleTo = p >= 1 ? n : accent ? Math.max(0, Math.floor(((e - LAG) / span) * n)) : litTo;
      if (accent) for (; lit < litTo; lit++) this.paint(order[lit], accent);
      for (; settled < settleTo; settled++) this.paint(order[settled], final);
      if (p >= 1) break;
    }
    if (final) this.fill(final); else this.clear();
  }
}
