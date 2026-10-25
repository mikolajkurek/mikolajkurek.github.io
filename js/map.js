// Index: the site as a transit map, drawn exactly like the CV metro (same line
// weight, same ring stops). Four lines leave one grey "you are here" circle on
// the left: up, down and two to the right, then each turns along its own row
// to the page it is named after. Stops run oldest to
// newest from left to right. Each stop is a project,
// school or skill and opens it. Small pixel trains run along every line.
// Hovering a line brings it forward and fades the others.

const SVG = 'http://www.w3.org/2000/svg';
const ROWS = [0.1, 0.36, 0.64, 0.9];  // row of each line, as a share of the map height
const LANE = 12;     // the two lines leaving to the right sit this far apart
const R = 26;        // corner radius
const STOP_R = 6.25; // ring radius: 16 px across with its 3.5 px stroke, as on the CV
const HUB_R = 13;
const BLOCK = 6;     // train block
const TICK = 45;

export function initMap(panel, { reducedMotion = false } = {}) {
  const map = panel.querySelector('.map');
  const svg = map.querySelector('.map__svg');
  const hub = map.querySelector('.map__hub');
  const lines = [...map.querySelectorAll('.mline')];
  let trains = [];
  let timer = 0;
  let built = false;

  const phone = () => matchMedia('(max-width: 820px)').matches;
  const index = panel.querySelector('.index');

  function el(name, attrs, parent = svg) {
    const n = document.createElementNS(SVG, name);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    parent.appendChild(n);
    return n;
  }

  function build() {
    svg.textContent = '';
    trains = [];
    if (phone()) {
      built = false;
      map.querySelectorAll('.stn, .map__hub').forEach((n) => n.removeAttribute('style'));
      return;
    }
    const W = map.clientWidth;
    const H = map.clientHeight;
    if (!W || !H) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const hubY = Math.round(H / 2);
    // The station label sits left of the station, the lines leave to the right
    hub.style.left = '0px';
    hub.style.top = `${hubY}px`;
    const hx = hub.offsetWidth + 30;
    const endW = Math.max(...lines.map((l) => l.querySelector('.stn--end').offsetWidth)) + 40;
    const endX = W - endW;
    const n = lines.length;
    const turnX = hx + 80;

    lines.forEach((line, li) => {
      const y = Math.round(H * ROWS[li]);
      const up = y < hubY;
      const outer = li === 0 || li === n - 1;
      let d;
      if (outer) {
        // Straight up or down out of the circle, then right
        d = up
          ? `M${hx} ${hubY} V${y + R} A${R} ${R} 0 0 1 ${hx + R} ${y} H${endX}`
          : `M${hx} ${hubY} V${y - R} A${R} ${R} 0 0 0 ${hx + R} ${y} H${endX}`;
      } else {
        // Out of the right side of the circle, side by side, then up or down
        const sy = hubY + (up ? -LANE / 2 : LANE / 2);
        d = up
          ? `M${hx} ${sy} H${turnX - R} A${R} ${R} 0 0 0 ${turnX} ${sy - R} V${y + R} A${R} ${R} 0 0 1 ${turnX + R} ${y} H${endX}`
          : `M${hx} ${sy} H${turnX - R} A${R} ${R} 0 0 1 ${turnX} ${sy + R} V${y - R} A${R} ${R} 0 0 0 ${turnX + R} ${y} H${endX}`;
      }
      const g = el('g', { class: 'l', 'data-line': line.dataset.line, style: `--c: ${line.style.getPropertyValue('--c')}; --i: ${li}` });
      el('path', { class: 'l__path', d, pathLength: 1 }, g);
      // A wide invisible stroke over the line, so the whole line can be clicked
      el('path', { class: 'l__hit', d, 'data-goto': line.dataset.line }, g);
      g.addEventListener('pointerover', () => hover(line, true));
      g.addEventListener('pointerout', () => hover(line, false));
      const real = el('path', { d, class: 'l__probe' }, g); // for train positions, in px
      const len = real.getTotalLength();
      const marks = []; // stops with their distance along the line, for the trains
      // The row is the last stretch of the path, so a stop at x sits (endX - x) from the end
      const mark = (x, end, btn) => {
        const ping = el('circle', { class: 'ping', cx: x, cy: y, r: STOP_R }, g);
        const dot = el('circle', { class: end ? 'stop stop--end' : 'stop', cx: x, cy: y, r: STOP_R }, g);
        // A stop does what its label does
        dot.dataset.goto = btn.dataset.goto || line.dataset.line;
        if (btn.dataset.card) dot.dataset.card = btn.dataset.card;
        marks.push({ at: len - (endX - x), dot, ping });
        return dot;
      };

      // Stops spread evenly along the row
      const stops = [...line.querySelectorAll('.stn:not(.stn--end)')];
      const start = turnX + R + 110;
      const span = endX - 70 - start;
      stops.forEach((b, i) => {
        const x = Math.round(start + (stops.length === 1 ? span / 2 : (span * i) / (stops.length - 1)));
        mark(x, false, b).style.setProperty('--d', i);
        b.style.left = `${x}px`;
        b.style.top = `${y}px`;
        b.classList.toggle('is-below', i % 2 === 1);
        b.style.setProperty('--d', i);
      });
      const end = line.querySelector('.stn--end');
      mark(endX, true, end).style.setProperty('--d', stops.length);
      end.style.left = `${endX + 20}px`;
      end.style.top = `${y}px`;
      end.style.setProperty('--d', stops.length);

      // A train of four blocks, waiting at the hub; they leave one after another
      const cars = Array.from({ length: 4 }, () => el('rect', { class: 'car', width: BLOCK - 1, height: BLOCK - 1 }, g));
      trains.push({ g, real, len, cars, marks, pos: 0, wait: li * 28 });
    });
    // The grey circle goes on top, so trains depart from inside it
    el('circle', { class: 'hub', cx: hx, cy: hubY, r: HUB_R });
    built = true;
    trains.forEach(place);
    if (pinned) highlight(pinned);
    document.dispatchEvent(new CustomEvent('map:built'));
  }

  function place(t) {
    t.cars.forEach((c, i) => {
      const p = t.real.getPointAtLength(Math.max(0, Math.min(t.len, t.pos - i * (BLOCK + 2))));
      // Snap to the pixel grid so the train moves in blocks
      c.setAttribute('x', Math.round((p.x - BLOCK / 2) / 2) * 2);
      c.setAttribute('y', Math.round((p.y - BLOCK / 2) / 2) * 2);
    });
  }

  function tick() {
    if (!panel.classList.contains('is-active')) { stop(); return; }
    for (const t of trains) {
      // Lines to pages the visitor has not reached yet stay quiet: their train
      // waits at the hub until the line is lit
      if (t.g.classList.contains('is-new')) { t.pos = 0; place(t); continue; }
      if (t.wait > 0) { t.wait--; continue; }
      const was = t.pos;
      t.pos += BLOCK;
      // A stop the train reaches lights up in its line colour and sends out a ring
      for (const m of t.marks) if (was < m.at && t.pos >= m.at) pulse(m);
      if (t.pos > t.len + 4 * (BLOCK + 2)) { t.pos = 0; t.wait = 20; } // arrived: a pause, then the next one leaves the hub
      place(t);
    }
  }
  function pulse({ dot, ping }) {
    dot.classList.add('is-lit');
    setTimeout(() => dot.classList.remove('is-lit'), 700);
    dot.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'steps(4)' });
    ping.animate([{ transform: 'scale(1)', opacity: 0.9 }, { transform: 'scale(3)', opacity: 0 }], { duration: 900, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  }

  function start() { if (!timer && !reducedMotion) timer = setInterval(tick, TICK); }
  function stop() { clearInterval(timer); timer = 0; }

  // Bring one line forward and fade the others (null shows them all). Hovering
  // a line does this, and so does the guide while it talks about a line.
  let pinned = null; // the guide's line wins over hover
  function highlight(key) {
    map.classList.toggle('is-hot', !!key);
    lines.forEach((l) => l.classList.toggle('is-hot', l.dataset.line === key));
    svg.querySelectorAll('.l').forEach((g) => g.classList.toggle('is-hot', g.dataset.line === key));
  }
  // Hover brings a line forward, but not while the guide talks (it pins a
  // line) and not for a line the visitor has not reached yet
  function hover(line, on) {
    if (pinned || line.classList.contains('is-new')) return;
    highlight(on ? line.dataset.line : null);
  }
  lines.forEach((line) => {
    line.addEventListener('pointerover', () => hover(line, true));
    line.addEventListener('pointerout', () => hover(line, false));
    line.addEventListener('focusin', () => hover(line, true));
    line.addEventListener('focusout', () => hover(line, false));
  });

  // After loading, the map draws as the wipe clears, then "map:ready" lets
  // the guide start talking. Later visits to the page just redraw the map.
  let first = true;
  const DELAY = 500;
  panel.addEventListener('panel:enter', () => {
    build();
    const intro = first && !reducedMotion && !phone();
    first = false;
    index.classList.toggle('is-first', intro);
    map.style.setProperty('--map-delay', intro ? `${DELAY}ms` : '0ms');
    // Restart the draw-in each time the page opens
    map.classList.remove('is-in');
    void map.offsetWidth;
    map.classList.add('is-in');
    setTimeout(start, intro ? DELAY + 1000 : 0);
    setTimeout(() => panel.dispatchEvent(new CustomEvent('map:ready', { detail: { intro } })), intro ? DELAY + 400 : 600);
  });
  let rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (panel.classList.contains('is-active') || built) build(); }, 150);
  });

  return {
    highlight(key) { pinned = key; highlight(key); },
  };
}
