// Router + boot. Panels swap in place behind a pixel wave; the URL hash keeps
// deep links and the back button working.

import { PixelGrid, nextFrame } from './pixel-transition.js';
import { initBurst } from './burst.js';
import { initSnakes, resetSnakes } from './snake.js';
import { initPixelImages, pixelate } from './pixel-image.js';
import { initStickers } from './stickers.js';
import { initCv, initWork, initContact, fitText } from './sections.js';
import { initProjects } from './projects.js';
import { initMap } from './map.js';
import { initGuide } from './guide.js';
import { initViewer } from './viewer.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const panels = [...document.querySelectorAll('.panel')];
const ids = panels.map((p) => p.id);
const fx = new PixelGrid(document.querySelector('.fx--transition'));
const baseTitle = document.title;
let current = null;
let busy = false;

function colours(scheme) {
  const probe = document.createElement('div');
  probe.className = `s-${scheme}`;
  probe.hidden = true;
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const bg = cs.getPropertyValue('--bg').trim();
  // The wipe covers in the page's own colour, then reveals the white page
  const out = { bg, cover: cs.getPropertyValue('--tone').trim() || bg, accent: cs.getPropertyValue('--accent').trim() };
  probe.remove();
  return out;
}

/* Suggested order ---------------------------------------------------------
   Pages are meant to be seen About, Work, Skills, Contact. Pages not visited
   yet are dimmed in the menu and on the Index map; the next one in order is
   lit and marked, so visitors are drawn along rather than straight to Work.
   It resets on every load and is off when the intro is skipped. */
const ORDER = ['about', 'work', 'skills', 'contact'];
// Starts fresh on every load, so every visit gets the same guided start
const visited = new Set();
let intro = true;
function markVisited(id) {
  visited.add(id);
  if (!intro) ORDER.forEach((p) => visited.add(p)); // intro skipped: nothing is dimmed
  const nextUp = ORDER.find((p) => !visited.has(p));
  document.querySelectorAll('.nav [data-goto], .foot__nav [data-goto], .mline, .map__svg .l').forEach((el) => {
    const key = el.dataset.goto || el.dataset.line;
    if (!ORDER.includes(key)) return;
    el.classList.toggle('is-new', !visited.has(key) && key !== nextUp);
    el.classList.toggle('is-next', key === nextUp);
  });
}
// The map redraws its lines on resize, so it asks for the marks again
document.addEventListener('map:built', () => markVisited(current?.id || 'index'));

function swap(next) {
  if (current) resetSnakes(current);
  if (current?.id === 'work' && next.id !== 'work') projects?.close({ hash: false });
  document.getElementById('more-menu').hidden = true;
  document.querySelector('[data-more]')?.setAttribute('aria-expanded', 'false');
  panels.forEach((p) => {
    const on = p === next;
    p.classList.toggle('is-active', on);
    p.inert = !on;
    p.setAttribute('aria-hidden', String(!on));
  });
  document.body.classList.remove(...[...document.body.classList].filter((c) => c.startsWith('s-')));
  document.body.classList.add(`s-${next.dataset.scheme}`);
  document.querySelectorAll('.nav [data-goto], .foot__nav [data-goto]').forEach((a) => {
    if (a.dataset.goto === next.id) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const i = ids.indexOf(next.id);
  document.querySelector('[data-pager]').textContent = `${i + 1}/${ids.length}`;
  document.title = i === 0 ? baseTitle : `${next.dataset.title}, Mikolaj Kurek`;
  current = next;
  markVisited(next.id);
  fitText(next);
  next.dispatchEvent(new CustomEvent('panel:enter'));
  if (!reducedMotion) {
    setTimeout(() => next.querySelectorAll('img[data-pixel]').forEach((img) => pixelate(img)), 280);
  }
}

async function go(id, { origin = null, push = true, then = null } = {}) {
  if (busy || !ids.includes(id)) return;
  if (current?.id === id) { then?.(); return; }
  busy = true;
  const next = document.getElementById(id);
  const { cover, accent } = colours(next.dataset.scheme);
  if (!reducedMotion) await fx.run('cover', cover, { origin, duration: 420, accent });
  swap(next);
  then?.();
  if (push) history.pushState(null, '', `#${id}`);
  next.querySelector('[data-focus]')?.focus({ preventScroll: true });
  if (!reducedMotion) {
    await wait(40);
    await fx.run('reveal', null, { origin, duration: 520, accent });
  }
  busy = false;
}

// Only the chosen card blinks, once; the class comes off afterwards (left on,
// it would replay whenever the page is shown again). Hover is paused meanwhile
// so it cannot cover the blink.
let flashT;
let work;
function flashCard(id) {
  const el = document.querySelector(`.wrow[data-project-open="${id}"]`);
  if (!el) return;
  work?.preview(id);
  const cats = el.closest('.windex__list');
  clearTimeout(flashT);
  document.querySelectorAll('.wrow.is-flash').forEach((c) => c.classList.remove('is-flash'));
  void el.offsetWidth;
  el.classList.add('is-flash');
  cats.classList.add('is-flashing');
  flashT = setTimeout(() => { el.classList.remove('is-flash'); cats.classList.remove('is-flashing'); }, 2600);
}

// Decoding text (after 2xA): every letter flickers through random glyphs
// behind a blue block, a grey cell or an outline, then settles at its own
// moment. Line breaks stay where they are.
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&*+=<>/';
const CELLS = ['is-blk', 'is-fill', 'is-line', '', ''];
function decodeText(el, { duration = 1400 } = {}) {
  const chars = [];
  [...el.childNodes].forEach((node) => {
    if (node.nodeType !== Node.TEXT_NODE) return;
    const frag = document.createDocumentFragment();
    for (const c of node.textContent) {
      const s = document.createElement('span');
      s.className = 'dc';
      s.textContent = c;
      frag.appendChild(s);
      if (c.trim()) chars.push({ s, c, at: duration * (0.2 + Math.random() * 0.8) });
    }
    node.replaceWith(frag);
  });
  const t0 = performance.now();
  const tick = () => {
    const t = performance.now() - t0;
    let left = 0;
    for (const ch of chars) {
      if (ch.done) continue;
      if (t >= ch.at) { ch.s.className = 'dc'; ch.s.textContent = ch.c; ch.done = true; continue; }
      left++;
      if (Math.random() < 0.4) {
        ch.s.className = `dc ${CELLS[Math.floor(Math.random() * CELLS.length)]}`;
        ch.s.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
    }
    if (left) setTimeout(tick, 55);
  };
  tick();
}

const step = (dir, origin) => {
  const i = ids.indexOf(current.id) + dir;
  if (i >= 0 && i < ids.length) go(ids[i], { origin });
};

const originOf = (e, el) => {
  if (e.detail !== 0) return { x: e.clientX, y: e.clientY };
  const r = el.getBoundingClientRect(); // keyboard activation
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/* Input ------------------------------------------------------------------- */
let projects;

const isProjectHash = (h) => projects?.ids.includes(h);

// More: the menu item that opens a panel straight down from the bar
const moreBtn = document.querySelector('[data-more]');
const moreMenu = document.getElementById('more-menu');
function setMore(open) {
  moreMenu.hidden = !open;
  moreBtn.setAttribute('aria-expanded', String(open));
}
moreBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  setMore(moreMenu.hidden);
  // Move focus into the menu only when it was opened from the keyboard; after a
  // click it would make the first item look selected
  if (!moreMenu.hidden && e.detail === 0) moreMenu.querySelector('a, button').focus({ preventScroll: true });
});
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-more]')) return;
  // Close on any click outside, and after choosing an item inside
  if (!e.target.closest('.more') || e.target.closest('.more a, .more button')) setMore(false);
}, true);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !moreMenu.hidden) { setMore(false); moreBtn.focus(); } });

document.addEventListener('click', async (e) => {
  const p = e.target.closest('[data-project-open]');
  if (p) {
    e.preventDefault();
    const id = p.dataset.projectOpen;
    if (current?.id === 'work') { projects.open(id); history.pushState(null, '', `#${id}`); }
    else go('work', { origin: originOf(e, p), push: false, then: () => { history.pushState(null, '', `#${id}`); projects.open(id); } });
    return;
  }
  const a = e.target.closest('[data-goto]');
  if (a) {
    e.preventDefault();
    if (a.dataset.goto === 'work' && current?.id === 'work') projects.close();
    // A project stop on the map opens Work with all the cards, and points out
    // that project's card instead of diving straight into it
    const card = a.dataset.card;
    go(a.dataset.goto, { origin: originOf(e, a), then: card ? () => flashCard(card) : null });
    return;
  }
  const s = e.target.closest('[data-step]');
  if (s) step(Number(s.dataset.step), originOf(e, s));
});

addEventListener('keydown', (e) => {
  if (!current || projects?.isOpen() || e.target.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (['ArrowRight', 'PageDown'].includes(e.key)) { e.preventDefault(); step(1); }
  else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); step(-1); }
  else if (/^[1-9]$/.test(e.key) && ids[Number(e.key) - 1]) go(ids[Number(e.key) - 1]);
});

// Wheel / trackpad: a fresh gesture at a scroll boundary turns the page.
function scrollableToward(el, dir) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) {
      if (dir > 0 ? n.scrollTop + n.clientHeight < n.scrollHeight - 1 : n.scrollTop > 0) return true;
    }
    if (n.classList?.contains('panel')) break;
  }
  return false;
}
let lastWheel = 0;
addEventListener('wheel', (e) => {
  const now = performance.now();
  const fresh = now - lastWheel > 220;
  lastWheel = now;
  if (!fresh || busy || !current || projects?.isOpen() || document.body.classList.contains('is-viewing') || e.ctrlKey || Math.abs(e.deltaY) < 6 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  if (matchMedia('(max-width: 820px)').matches) return;
  const dir = e.deltaY > 0 ? 1 : -1;
  if (!scrollableToward(e.target, dir)) step(dir);
}, { passive: true });

addEventListener('popstate', async () => {
  const id = location.hash.slice(1).replace(/^cv$/, 'about');
  if (isProjectHash(id)) {
    if (current?.id === 'work') projects.open(id);
    else go('work', { push: false, then: () => projects.open(id) });
    return;
  }
  if (id === 'work') projects.close({ hash: false });
  go(ids.includes(id) ? id : ids[0], { push: false });
});

let resizeT;
addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    if (!busy) { fx.resize(); fx.clear(); }
    if (current) fitText(current);
  }, 120);
});

/* Boot -------------------------------------------------------------------- */
async function boot() {
  initSnakes(document, { reducedMotion });
  initStickers();
  initPixelImages(document, { reducedMotion });
  initCv(document.getElementById('about'));
  work = initWork(document.getElementById('work'), { reducedMotion });
  const indexPanel = document.getElementById('index');
  initGuide(indexPanel, initMap(indexPanel, { reducedMotion }), { reducedMotion });
  initContact(document.getElementById('contact'));
  projects = initProjects(document.getElementById('work'), { reducedMotion });
  initViewer({ reducedMotion });
  if (!reducedMotion) initBurst(document.querySelector('.fx--burst'), () => getComputedStyle(document.body).getPropertyValue('--accent').trim());

  const hash = location.hash.slice(1).replace(/^cv$/, 'about'); // old links to the CV page
  const first = document.getElementById(ids.includes(hash) ? hash : isProjectHash(hash) ? 'work' : ids[0]);
  const { cover, accent } = colours(first.dataset.scheme);

  // Loading screen: the photo resolves in pixel steps, then it waits for the
  // visitor to finish reading and choose Enter (with the guided intro) or Skip
  const loader = document.querySelector('.loader');
  const photo = loader.querySelector('img');
  const LOAD = reducedMotion ? 400 : 1600;
  await Promise.race([photo.decode().catch(() => {}), wait(1200)]);
  const started = performance.now();
  if (!reducedMotion) {
    pixelate(photo, { interval: LOAD / 5 });
    loader.querySelectorAll('.loader__name, .loader__titles').forEach((el, i) => decodeText(el, { duration: LOAD * (0.8 + i * 0.15) }));
  }
  await Promise.race([document.fonts.ready, wait(1500)]);
  await wait(Math.max(0, LOAD - (performance.now() - started)));
  const go = loader.querySelector('.loader__go');
  loader.classList.add('is-ready');
  go.querySelector('[data-intro="enter"]').focus({ preventScroll: true });
  const choice = await new Promise((resolve) => {
    go.addEventListener('click', (e) => { const b = e.target.closest('[data-intro]'); if (b) resolve(b.dataset.intro); });
    addEventListener('keydown', function key(e) {
      if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'ArrowRight') return;
      if (e.target.closest?.('[data-intro]')) return; // the focused button handles it
      removeEventListener('keydown', key);
      resolve('enter');
    });
  });
  // Skipping the intro also skips the guided tour and the suggested order
  intro = choice !== 'skip';
  document.documentElement.dataset.intro = intro ? 'on' : 'off';
  document.dispatchEvent(new CustomEvent('intro:chosen', { detail: { intro, first: first.id } }));
  if (!reducedMotion) await fx.run('cover', cover, { duration: 620, accent });
  loader.remove();
  document.documentElement.classList.remove('is-loading');
  swap(first);
  if (isProjectHash(hash)) projects.open(hash);
  await nextFrame();
  if (!reducedMotion) await fx.run('reveal', null, { duration: 800, accent });
}

boot();
