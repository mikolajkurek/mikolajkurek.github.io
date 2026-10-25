// Image viewer: clicking a picture in a project write-up opens it in an
// app-style window over the page instead of a new tab. The window grows out
// of the picture and shrinks back into it; ‹ › (or the arrow keys) step through
// the other pictures of the same project, the green dot shows it at full size,
// and Esc, the red dot or a click outside closes it.

export function initViewer({ reducedMotion = false } = {}) {
  const root = document.querySelector('.viewer');
  const win = root.querySelector('.viewer__win');
  const body = root.querySelector('.viewer__body');
  const img = body.querySelector('img');
  const title = root.querySelector('.viewer__title');
  const count = root.querySelector('[data-viewer-count]');
  const nav = root.querySelector('.viewer__nav');
  let list = [];
  let i = 0;
  let opener = null;

  const isOpen = () => !root.hidden;

  function show(n) {
    i = (n + list.length) % list.length;
    const btn = list[i];
    const thumb = btn.querySelector('img');
    img.src = thumb.currentSrc || thumb.src;
    img.alt = thumb.alt;
    title.textContent = btn.dataset.view || thumb.alt;
    count.textContent = `${i + 1}/${list.length}`;
    nav.hidden = list.length < 2;
    body.scrollTop = 0;
    body.scrollLeft = 0;
  }

  // Transform that maps the window onto a thumbnail's rectangle
  function toThumb(btn) {
    const w = win.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const dx = b.left + b.width / 2 - (w.left + w.width / 2);
    const dy = b.top + b.height / 2 - (w.top + w.height / 2);
    return `translate(${dx}px, ${dy}px) scale(${Math.max(0.05, b.width / w.width)}, ${Math.max(0.05, b.height / w.height)})`;
  }

  function open(btn) {
    const scope = btn.closest('.pw') || document;
    list = [...scope.querySelectorAll('[data-view]')];
    opener = btn;
    root.hidden = false;
    root.classList.remove('is-max');
    document.body.classList.add('is-viewing');
    show(list.indexOf(btn));
    if (!reducedMotion) {
      win.animate([{ transform: toThumb(btn), opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      root.animate([{ backgroundColor: 'rgb(10 12 9 / 0)' }, { backgroundColor: 'rgb(10 12 9 / 0.45)' }], { duration: 300 });
    }
    root.querySelector('[data-viewer-close]').focus({ preventScroll: true });
  }

  async function close() {
    if (!isOpen()) return;
    const back = list[i];
    if (!reducedMotion && back?.getClientRects().length) {
      root.animate([{ backgroundColor: 'rgb(10 12 9 / 0.45)' }, { backgroundColor: 'rgb(10 12 9 / 0)' }], { duration: 300, fill: 'forwards' });
      const shrink = win.animate([{ transform: 'none', opacity: 1 }, { transform: toThumb(back), opacity: 0.3 }], { duration: 320, easing: 'cubic-bezier(0.7, 0, 0.84, 0)' });
      // A paused tab may never finish the animation; close anyway
      await Promise.race([shrink.finished, new Promise((r) => setTimeout(r, 420))]);
      shrink.cancel();
    }
    root.hidden = true;
    root.getAnimations().forEach((a) => a.cancel());
    document.body.classList.remove('is-viewing');
    (back || opener)?.focus({ preventScroll: true });
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-view]');
    if (btn && !isOpen()) { e.preventDefault(); open(btn); }
  });
  root.addEventListener('click', (e) => {
    if (e.target === root || e.target.closest('[data-viewer-close]')) close();
    else if (e.target.closest('[data-viewer-max]')) root.classList.toggle('is-max');
    else if (e.target.closest('[data-viewer-prev]')) show(i - 1);
    else if (e.target.closest('[data-viewer-next]')) show(i + 1);
  });
  // Captured first, so the arrows and Esc do not also switch projects or pages
  addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') show(i + 1);
    else if (e.key === 'ArrowLeft') show(i - 1);
    else return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  return { isOpen, close };
}
