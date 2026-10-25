// Snake underline: on hover a pixel line slithers out under the element one
// block at a time, its raised head in the accent colour. When it reaches the end
// the head settles into a clean line. On leave the tail chases the head off to
// the right, like the old Nokia game.

const STRIDE = 6; // must match --px
const SELECTOR = '[data-snake], .nav a, .nav__more, .more a, .more button, .pcard, .wrow, .stn, .link, .email, .brand, .foot__pager button';

const active = new Set();
const all = new Set();
let raf = 0;
let last = 0;
let instant = false;

export function initSnakes(root = document, { reducedMotion = false } = {}) {
  instant = reducedMotion;
  root.querySelectorAll(SELECTOR).forEach(attach);
}

// Clear every snake inside `root` at once. Used when a page is swapped out,
// because an element that disappears under the pointer never gets pointerleave.
export function resetSnakes(root = document) {
  for (const st of all) {
    if (!root.contains(st.el)) continue;
    st.head = st.tail = 0;
    st.mode = 'idle';
    active.delete(st);
    render(st);
  }
}

function attach(el) {
  if (el.__snake) return;
  // Padded items (the nav tabs) mark their label as the host, so the line
  // matches the word rather than the whole button
  const host = el.querySelector(':scope > .snake-host') || el;
  const s = document.createElement('span');
  s.className = 'snake';
  s.setAttribute('aria-hidden', 'true');
  host.appendChild(s);
  host.classList.add('has-snake');
  const st = { el, s, head: 0, tail: 0, n: 0, mode: 'idle', acc: 0 };
  el.__snake = st;
  all.add(st);

  const grow = () => {
    // Round up so the line always reaches the last letter
    st.n = Math.max(2, Math.ceil(host.getBoundingClientRect().width / STRIDE));
    st.mode = 'grow';
    wake(st);
  };
  const leave = () => {
    if (st.mode === 'idle' && st.head === 0) return;
    if (st.head === 0) { st.mode = 'idle'; active.delete(st); return; } // left before the first block appeared
    st.mode = 'leave';
    wake(st);
    // Safety net: whatever happens to the animation, nothing stays behind
    clearTimeout(st.guard);
    st.guard = setTimeout(() => {
      if (st.mode !== 'leave') return;
      st.head = st.tail = 0;
      st.mode = 'idle';
      active.delete(st);
      render(st);
    }, 900);
  };
  // Mouse and pen only: a finger never sends a reliable leave, so on touch
  // screens the line would stay drawn after the tap
  el.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') grow(); });
  el.addEventListener('pointerleave', leave);
  el.addEventListener('focus', () => el.matches(':focus-visible') && grow());
  el.addEventListener('blur', leave);
}

function wake(st) {
  if (instant) {
    if (st.mode === 'grow') { st.tail = 0; st.head = st.n; } else { st.head = st.tail = 0; }
    st.mode = 'idle';
    render(st);
    return;
  }
  active.add(st);
  if (!raf) {
    last = performance.now();
    raf = setTimeout(() => loop(performance.now()), 16);
  }
}

function loop(now) {
  const dt = Math.min(48, now - last);
  last = now;
  for (const st of active) {
    // Short links take ~180 ms, long ones at most ~380 ms; leaving is a bit faster
    const time = Math.min(0.38, Math.max(0.18, st.n * 0.012));
    const speed = (st.n / time) * (st.mode === 'leave' ? 1.35 : 1);
    st.acc += (dt / 1000) * speed;
    let steps = Math.floor(st.acc);
    st.acc -= steps;
    while (steps-- > 0 && st.mode !== 'idle') {
      if (st.mode === 'grow') {
        if (st.tail > 0) st.tail--;
        if (st.head < st.n) st.head++;
        if (st.head >= st.n && st.tail === 0) st.mode = 'idle';
      } else {
        if (st.head < st.n) st.head++;
        st.tail++;
        if (st.tail >= st.head) { st.head = st.tail = 0; st.mode = 'idle'; }
      }
    }
    render(st);
    if (st.mode === 'idle') active.delete(st);
  }
  // A timer rather than requestAnimationFrame, which browsers pause or throttle
  // (background tabs, battery saving) and which left a block stuck mid-way
  raf = active.size ? setTimeout(() => loop(performance.now()), 16) : 0;
}

function render({ s, head, tail, mode }) {
  const on = head > tail;
  s.style.transform = on ? `translateX(${tail * STRIDE}px)` : '';
  s.style.width = on ? `${(head - tail) * STRIDE - 1}px` : '0px';
  s.classList.toggle('is-on', on);
  s.classList.toggle('is-moving', mode !== 'idle' && on);
}
