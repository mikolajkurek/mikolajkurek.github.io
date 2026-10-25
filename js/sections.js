// Section behaviour: CV metro map, filters and accordion, Work project grid,
// contact form, fit text.

/* CV ---------------------------------------------------------------------- */
const SVG = 'http://www.w3.org/2000/svg';
const STEP = 150; // ms between stations in the draw-in animation (matches CSS)
const START = 320;

// Draws the metro map behind the CV stops. Education (lane 0) is the trunk and
// runs the full height; every other station forks off it into its own lane, and
// rows marked data-ongoing keep their lane running up to today. When a filter is
// active there is no trunk, so each lane is a plain line through its stations.
function drawMetro(list, rows, filtered) {
  if (!list.offsetParent) return; // page hidden: nothing to measure
  let svg = list.querySelector(':scope > .metro');
  if (!svg) {
    svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'metro');
    svg.setAttribute('aria-hidden', 'true');
    list.prepend(svg);
  }
  const lr = list.getBoundingClientRect();
  // Measure without the old drawing, which would keep the list as tall as it
  // was before a filter hid rows
  svg.style.height = '0px';
  const H = list.scrollHeight;
  svg.style.height = `${H}px`;
  svg.setAttribute('viewBox', `0 0 ${list.clientWidth} ${H}`);

  const pts = rows.filter((r) => !r.hidden).map((r) => {
    const st = r.querySelector('.row__stop');
    // offsetLeft/Top ignore the stop's pop-in scale, unlike getBoundingClientRect
    let x = st.offsetWidth / 2;
    let y = st.offsetHeight / 2;
    for (let n = st; n && n !== list; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
    if (st.offsetParent !== list && !list.contains(st.offsetParent)) {
      const sr = st.getBoundingClientRect();
      x = sr.left - lr.left + sr.width / 2;
      y = sr.top - lr.top + list.scrollTop + sr.height / 2;
    }
    return {
      x, y,
      lane: Number(r.dataset.lane || 0),
      ongoing: r.hasAttribute('data-ongoing'),
      color: getComputedStyle(r).getPropertyValue('--kind').trim(),
      n: Number(r.style.getPropertyValue('--n') || 0),
    };
  });
  if (!pts.length) { svg.replaceChildren(); return; }

  const laneW = parseFloat(getComputedStyle(rows[0]).getPropertyValue('--lane-w')) || 20;
  const trunk = pts.find((p) => p.lane === 0);
  const tx = trunk ? trunk.x : pts[0].x - pts[0].lane * laneW;
  const paths = []; // { d, color, delay, dur, casing }

  if (!filtered) {
    const lastTrunk = pts.filter((p) => p.lane === 0).at(-1);
    if (lastTrunk) paths.push({ d: `M${tx} 0 V${lastTrunk.y}`, color: lastTrunk.color, delay: START, dur: lastTrunk.n * STEP + 120 });
    // Ongoing lanes first, so forks drawn later cross over them with a gap
    const ordered = [...pts.filter((p) => p.lane > 0 && p.ongoing), ...pts.filter((p) => p.lane > 0 && !p.ongoing)];
    for (const p of ordered) {
      // A station on an ongoing line already sits on that line: no extra fork
      if (!p.ongoing && pts.some((q) => q.ongoing && q.lane === p.lane && q.y > p.y)) continue;
      const fy = p.y + 30; // fork leaves the trunk just below the station
      let d = `M${tx} ${fy} C${tx} ${p.y + 12} ${p.x} ${p.y + 22} ${p.x} ${p.y}`;
      if (p.ongoing) d += ` V0`;
      paths.push({ d, color: p.color, delay: START + p.n * STEP, dur: p.ongoing ? 520 : 240, casing: !p.ongoing });
    }
  } else {
    const lanes = new Map();
    pts.forEach((p) => lanes.set(p.lane, [...(lanes.get(p.lane) || []), p]));
    for (const ps of lanes.values()) {
      if (ps.length < 2) continue;
      paths.push({ d: `M${ps[0].x} ${ps[0].y} V${ps.at(-1).y}`, color: ps[0].color, delay: START, dur: ps.at(-1).n * STEP + 120 });
    }
  }

  // Reuse path elements where possible so a redraw (resize, accordion) does
  // not restart the draw-in animation
  const want = [];
  for (const p of paths) {
    if (p.casing) want.push({ ...p, cls: 'casing' });
    want.push({ ...p, cls: 'line' });
  }
  const existing = [...svg.children];
  want.forEach((w, i) => {
    let el = existing[i];
    if (!el || el.getAttribute('class') !== w.cls) {
      el = document.createElementNS(SVG, 'path');
      svg.insertBefore(el, existing[i] || null);
      existing.splice(i, 0, el);
    }
    el.setAttribute('class', w.cls);
    el.setAttribute('d', w.d);
    el.setAttribute('pathLength', '1');
    if (w.cls === 'line') el.style.stroke = w.color;
    el.style.setProperty('--delay', `${w.delay}ms`);
    el.style.setProperty('--dur', `${w.dur}ms`);
  });
  existing.slice(want.length).forEach((el) => el.remove());
}

export function initCv(root) {
  const list = root.querySelector('.cv__list');
  const rows = [...root.querySelectorAll('.row')];
  const chips = [...root.querySelectorAll('[data-filter]')];
  let filtered = false;

  root.querySelectorAll('.cv__intro > *').forEach((el, i) => el.style.setProperty('--i', i));

  // --n orders the draw-in animation along the visible stations
  const number = () => rows.filter((r) => !r.hidden).forEach((r, i) => r.style.setProperty('--n', i));
  number();

  let queued = false;
  const redraw = () => {
    if (queued) return;
    queued = true;
    setTimeout(() => { queued = false; drawMetro(list, rows, filtered); }, 16);
  };

  chips.forEach((chip) => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    filtered = f !== 'all';
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    rows.forEach((r) => { r.hidden = filtered && r.dataset.kind !== f; });
    list.scrollTop = 0;
    number();
    redraw();
  }));

  rows.forEach((row) => {
    const head = row.querySelector('.row__head');
    head.addEventListener('click', () => {
      const open = !row.classList.contains('is-open');
      row.classList.toggle('is-open', open);
      head.setAttribute('aria-expanded', String(open));
    });
  });

  // Rows change height while the accordion animates and when the window resizes
  const ro = new ResizeObserver(redraw);
  rows.forEach((r) => ro.observe(r));
  root.addEventListener('panel:enter', () => drawMetro(list, rows, filtered));
}

/* Work -------------------------------------------------------------------- */
// Counts a number up from zero in coarse steps, like an odometer.
export function countUp(el, reducedMotion) {
  const target = Number(el.dataset.count);
  if (Number.isNaN(target)) return;
  const fmt = (v) => `${v < 0 ? '−' : ''}${Math.abs(v)}${el.dataset.suffix || ''}`;
  if (reducedMotion) { el.textContent = fmt(target); return; }
  clearInterval(el.__count);
  const steps = 14;
  let i = 0;
  el.textContent = fmt(0);
  setTimeout(() => {
    el.__count = setInterval(() => {
      i++;
      const e = 1 - Math.pow(1 - i / steps, 3);
      el.textContent = fmt(Math.round(target * e));
      if (i >= steps) clearInterval(el.__count);
    }, 45);
  }, 300);
}

// Projects: cards grouped by category; each opens its write-up in the project
// window (wired in main.js). Here we only stagger the entrance.
// The Work index: a numbered list of projects. Pointing at one (or focusing
// it) shows it on the right; clicking opens it (js/projects.js).
export function initWork(root, { reducedMotion = false } = {}) {
  const rows = [...root.querySelectorAll('.wrow')];
  rows.forEach((r, i) => r.closest('li').style.setProperty('--i', i));

  // Skill filters: one skill at a time; projects using it stay, the rest
  // are hidden (a group with nothing left is hidden too). Picking it again,
  // or All, shows everything. Leaving rows fade out first, then the rows
  // that stay slide together into place and returning ones fade back in.
  const chips = [...root.querySelectorAll('.skillbar [data-skill]')];
  const groups = [...root.querySelectorAll('.windex__group')];
  const list = root.querySelector('.windex__list');
  const shown = (el) => el.getClientRects().length > 0;
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
  let picked = 'all';
  let run = 0;
  async function applyFilter() {
    const id = ++run;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.skill === picked)));
    const keep = (r) => picked === 'all' || r.dataset.skills.split(' ').includes(picked);
    const commit = () => {
      rows.forEach((r) => {
        r.classList.toggle('is-out', !keep(r));
        r.tabIndex = keep(r) ? 0 : -1;
      });
      groups.forEach((g) => g.classList.toggle('is-dim', !g.querySelector('.wrow:not(.is-out)')));
    };
    const parts = [...list.querySelectorAll('.windex__group, .windex__cat, li, .windex__more')];
    parts.forEach((el) => el.getAnimations().forEach((an) => an.cancel()));
    if (reducedMotion) return commit();

    // 1. Fade out what is leaving: whole groups, or single rows in groups that stay
    const groupStays = (g) => [...g.querySelectorAll('.wrow')].some(keep);
    const leaving = [
      ...groups.filter((g) => shown(g) && !groupStays(g)),
      ...rows.filter((r) => shown(r) && !keep(r) && groupStays(r.closest('.windex__group'))).map((r) => r.closest('li')),
    ];
    if (leaving.length) {
      const fades = leaving.map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {}));
      // A paused tab may never finish the fade; carry on regardless
      await Promise.race([Promise.all(fades), new Promise((r) => setTimeout(r, 300))]);
      if (id !== run) return;
    }

    // 2. Swap, then slide what stayed from its old place to the new one
    const movers = [...list.querySelectorAll('.windex__cat, li, .windex__more')];
    const before = new Map(movers.filter(shown).map((el) => [el, el.getBoundingClientRect().top]));
    commit();
    leaving.forEach((el) => el.getAnimations().forEach((an) => an.cancel()));
    movers.filter(shown).forEach((el, i) => {
      if (before.has(el)) {
        const dy = before.get(el) - el.getBoundingClientRect().top;
        if (Math.abs(dy) > 0.5) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 420, easing: ease });
      } else {
        el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 160 + Math.min(i, 12) * 25, easing: ease, fill: 'backwards' });
      }
    });
  }
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const k = chip.dataset.skill;
    picked = k === picked ? 'all' : k;
    applyFilter();
  }));

  // Pointing at a project shows a short teaser at the bottom of the left
  // column; it goes when the pointer leaves the list.
  // Touch screens skip this: a tap opens the project straight away.
  const canHover = matchMedia('(hover: hover) and (min-width: 821px)');
  const index = root.querySelector('.windex');
  const side = root.querySelector('.windex__side');
  const box = root.querySelector('[data-prev-open]');
  const no = root.querySelector('[data-prev-no]');
  const kind = root.querySelector('[data-prev-kind]');
  const result = root.querySelector('[data-prev-result]');
  const tags = root.querySelector('[data-prev-tags]');
  let current = null;

  function preview(row) {
    if (row === current || (row && !canHover.matches)) return;
    current = row;
    rows.forEach((r) => r.classList.toggle('is-on', r === row));
    side.classList.toggle('is-peek', !!row);
    if (!row) { box.removeAttribute('data-project-open'); return; }
    const d = row.dataset;
    box.dataset.projectOpen = d.projectOpen;
    no.textContent = row.querySelector('.wrow__title').textContent;
    kind.textContent = `${row.querySelector('.wrow__no').textContent} ${d.kind}, ${row.querySelector('.wrow__year').textContent}`;
    // The headline result from the write-up, as a teaser
    result.textContent = document.querySelector(`#${d.projectOpen} .pw__result strong`)?.textContent || '';
    tags.replaceChildren(...d.tags.split(', ').map((t) => Object.assign(document.createElement('li'), { textContent: t })));
  }
  // Between rows (group headings, gaps) the last project stays up
  list.addEventListener('pointerover', (e) => { const r = e.target.closest('.wrow'); if (r) preview(r); });
  list.addEventListener('pointerleave', () => preview(null));
  list.addEventListener('focusin', (e) => preview(e.target.closest('.wrow')));
  list.addEventListener('focusout', (e) => { if (!index.contains(e.relatedTarget)) preview(null); });
  root.addEventListener('project:close', () => preview(null));
  return { preview: (id) => preview(rows.find((x) => x.dataset.projectOpen === id) || null) };
}

/* Contact ----------------------------------------------------------------- */
// Static hosting has no backend: the form composes an email in the visitor's
// mail app. To collect submissions instead, point the form's `action` at a
// service such as Formspree and remove this handler.
export function initContact(root) {
  const form = root.querySelector('form');
  const status = root.querySelector('[data-form-status]');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const d = new FormData(form);
    const subject = `[${d.get('purpose')}] Hello from ${d.get('name')}`;
    const body = `${d.get('message')}\n\nFrom ${d.get('name')} (${d.get('email')})`;
    window.location.href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent = 'Opening your mail app…';
  });
}

/* Fit text ---------------------------------------------------------------- */
export function fitText(root = document) {
  root.querySelectorAll('[data-fit]').forEach((el) => {
    if (matchMedia('(max-width: 820px)').matches) return;
    const box = el.parentElement.getBoundingClientRect();
    if (!box.width) return;
    el.style.fontSize = '100px';
    const w = el.getBoundingClientRect().width;
    const maxH = (parseFloat(el.dataset.fitMaxVh) || 30) * innerHeight / 100;
    el.style.fontSize = `${Math.min((100 * box.width) / w, maxH / 0.8)}px`;
  });
}
