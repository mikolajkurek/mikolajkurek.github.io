// Work: a project opens inside the Work page. The right-hand panel grows to
// the left over the index until it fills the page, with All projects / Prev /
// Next above the write-up; closing shrinks it back. Back button, Esc, or
// leaving the page close it.

import { countUp } from './sections.js';

export function initProjects(panel, { reducedMotion = false } = {}) {
  const work = panel.querySelector('.work');
  const detail = panel.querySelector('.detail');
  const body = detail.querySelector('.detail__body');
  const title = detail.querySelector('[data-proj-title]');
  const arts = [...detail.querySelectorAll('.pw')];
  let cur = -1;

  arts.forEach((a) => a.querySelectorAll('.pw__side > *, .pw__main > *').forEach((n, i) => n.style.setProperty('--i', i)));

  // With a skill filter on, Prev and Next stay within the projects it shows
  // (the rows not faded out of the index); otherwise they walk all of them
  const inView = () => {
    const seq = arts.filter((a) => !panel.querySelector(`.wrow[data-project-open="${a.id}"]`)?.classList.contains('is-out'));
    return seq.includes(arts[cur]) ? seq : arts;
  };
  function step(d) {
    const seq = inView();
    select(arts.indexOf(seq[(seq.indexOf(arts[cur]) + d + seq.length) % seq.length]));
  }

  function select(i) {
    cur = (i + arts.length) % arts.length;
    arts.forEach((a, n) => { a.hidden = n !== cur; });
    const seq = inView();
    title.textContent = `${String(seq.indexOf(arts[cur]) + 1).padStart(2, '0')}/${String(seq.length).padStart(2, '0')}  ${arts[cur].dataset.title}`;
    body.scrollTop = 0;
    arts[cur].querySelectorAll('[data-count]').forEach((n) => countUp(n, reducedMotion));
    // Restart the entrance for the new article
    arts[cur].classList.remove('is-in');
    void arts[cur].offsetWidth;
    arts[cur].classList.add('is-in');
    history.replaceState(null, '', `#${arts[cur].id}`);
  }

  // How far in from the left the right-hand panel starts: the project grows
  // out of it to the full width
  const side = panel.querySelector('.windex__list'); // the project grows out of the list column
  const from = () => {
    const w = work.getBoundingClientRect();
    const s = side.getBoundingClientRect();
    return s.width ? `inset(0 0 0 ${Math.max(0, s.left - w.left)}px)` : 'inset(0 0 100% 0)';
  };
  // Once the project fully covers the index, the index is hidden so a long
  // list can never show below it, and the page stops scrolling behind it
  function grow() {
    const cover = () => { if (isOpen()) work.classList.add('is-covered'); };
    if (reducedMotion) return cover();
    const a = detail.animate([{ clipPath: from() }, { clipPath: 'inset(0)' }], { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    Promise.race([a.finished, new Promise((r) => setTimeout(r, 620))]).then(cover, cover);
  }

  function open(id) {
    const i = arts.findIndex((a) => a.id === id);
    if (i < 0) return false;
    const wasOpen = isOpen();
    if (!wasOpen) panel.scrollTop = 0;
    work.classList.add('is-detail');
    detail.hidden = false;
    panel.querySelector('.windex').inert = true;
    select(i);
    if (!wasOpen) grow();
    detail.querySelector('[data-proj-back]').focus({ preventScroll: true });
    return true;
  }

  async function close({ hash = true } = {}) {
    if (!isOpen()) return;
    work.classList.remove('is-covered');
    if (!reducedMotion && panel.classList.contains('is-active')) {
      const shrink = detail.animate([{ clipPath: 'inset(0)' }, { clipPath: from() }], { duration: 380, easing: 'cubic-bezier(0.7, 0, 0.84, 0)', fill: 'forwards' });
      await Promise.race([shrink.finished, new Promise((r) => setTimeout(r, 480))]);
      shrink.cancel();
    }
    work.classList.remove('is-detail');
    detail.hidden = true;
    panel.querySelector('.windex').inert = false;
    panel.dispatchEvent(new CustomEvent('project:close'));
    if (hash) history.replaceState(null, '', '#work');
    const card = panel.querySelector(`[data-project-open="${arts[cur]?.id}"]`);
    card?.focus({ preventScroll: true });
  }

  const isOpen = () => !detail.hidden;

  detail.querySelector('[data-proj-back]').addEventListener('click', () => close());
  detail.querySelector('[data-proj-prev]').addEventListener('click', () => step(-1));
  detail.querySelector('[data-proj-next]').addEventListener('click', () => step(1));
  addEventListener('keydown', (e) => {
    if (!isOpen() || !panel.classList.contains('is-active') || e.target.closest?.('input, textarea, select')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  });

  return { ids: arts.map((a) => a.id), open, close, isOpen };
}
