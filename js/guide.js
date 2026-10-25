// The guide: Mikolaj as a face made of a dot and a bracket. Every time the
// site loads (unless the intro was skipped) it appears in the middle of the
// Index map, with the map dimmed, and talks the visitor through the lines one
// at a time, moving aside so the line it talks about stays in view. The
// visitor moves on with Next. When the tour ends it jumps up next to the name
// in the top bar and stays there on every page: click it for a tip about the
// page you are on (on the Index it can run the tour again).

// line: which line stays lit ('none' dims them all); pos: where the guide
// stands so that line and its labels are not covered
const STEPS = [
  { line: 'none', pos: '', text: "Hi, I'm Mikolaj. This map is everything I do, laid out like a metro." },
  { line: 'about', pos: '', text: 'Blue is about me: my studies, work and clubs on one metro, ending at About. Start there.' },
  { line: 'work', pos: 'low', text: 'Yellow is my work. Every stop is a project, oldest on the left, newest on the right.' },
  { line: 'skills', pos: 'high', text: 'Green is skills: the tools I reach for, from YOLO to a 3D printer.' },
  { line: 'contact', pos: '', text: "Red goes to Contact. That's where we can talk." },
  { line: 'about', pos: '', text: "I'll light up the next line as you go. Find me next to my name if you need me." },
];
const HELP = {
  index: 'This map is my whole site. Every stop opens something. Want the tour again?',
  about: 'Click a row to open it. The buttons on the left follow one line of the metro. Work is next.',
  work: 'Filter by category, then open any card for the full story. Skills come next.',
  project: 'Prev and Next walk through all twelve projects. Esc takes you back to the cards.',
  skills: 'Each box is one area I work in, from computer vision to the languages I speak. Last stop: Contact.',
  contact: 'The form opens your mail app with everything filled in. Or just copy my email.',
};
const TYPE = 24;   // ms per letter

export function initGuide(panel, map, { reducedMotion = false } = {}) {
  const index = panel.querySelector('.index');
  const faces = {
    stage: panel.querySelector('.guide--stage'),
    nav: document.querySelector('.guide--nav'),
  };
  const stage = panel.querySelector('.guide-stage');
  const bubble = stage.querySelector('.bubble');
  const text = bubble.querySelector('[data-bubble-text]');
  const count = bubble.querySelector('[data-bubble-step]');
  const next = bubble.querySelector('[data-bubble-next]');
  const skip = bubble.querySelector('[data-bubble-skip]');
  const help = document.querySelector('.bubble--help');
  const helpText = help.querySelector('[data-help-text]');
  const helpTour = help.querySelector('[data-help-tour]');
  let at = null;
  let i = -1;
  let typing = 0;
  let timer = 0;

  const phone = () => matchMedia('(max-width: 820px)').matches;

  // Only one face shows at a time: in the middle of the map (with the speech
  // bubble) or in the top bar; before the tour starts, neither
  function place(where) {
    at = where;
    stage.hidden = where !== 'stage';
    faces.nav.hidden = where !== 'nav';
  }
  place(phone() || document.documentElement.dataset.intro === 'off' ? 'nav' : null);

  // Appearing in place: a quick pixel pop rather than a jump
  function pop(where) {
    place(where);
    if (!reducedMotion) faces[where].animate([{ transform: 'scale(0)' }, { transform: 'scale(1.15)', offset: 0.7 }, { transform: 'none' }], { duration: 360, easing: 'steps(5)' });
  }

  // The face jumps in an arc from where it is to where it is going
  async function jump(where) {
    const from = at && faces[at];
    const to = faces[where];
    // Lay the target out to measure it; a copy flies while both stay hidden
    if (where === 'stage') stage.hidden = false;
    if (where === 'nav') faces.nav.hidden = false;
    if (reducedMotion || !from || !from.getClientRects().length || !to.getClientRects().length) { place(where); return; }
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    from.style.visibility = 'hidden';
    to.style.visibility = 'hidden';
    bubble.style.visibility = 'hidden';
    const fly = to.cloneNode(true);
    fly.removeAttribute('hidden');
    fly.className = 'guide guide--fly';
    Object.assign(fly.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, visibility: 'visible' });
    document.body.appendChild(fly);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const s = b.width / a.width;
    // A smooth arc (quadratic curve) that rises a little over both spots but
    // never leaves the screen; sampled into keyframes with an ease-in-out
    const cy0 = a.top + a.height / 2;
    const cx = dx * 0.5;
    const cy = Math.max(Math.min(0, dy) - 70, 24 + (a.height * Math.max(1, s)) / 2 - cy0);
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const N = 24;
    const frames = Array.from({ length: N + 1 }, (_, k) => {
      const t = ease(k / N);
      const x = 2 * (1 - t) * t * cx + t * t * dx;
      const y = 2 * (1 - t) * t * cy + t * t * dy;
      const r = Math.sin(t * Math.PI) * (dx < 0 ? -14 : 14);
      return { transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(1 + (s - 1) * t).toFixed(3)}) rotate(${r.toFixed(1)}deg)` };
    });
    await fly.animate(frames, { duration: 950, easing: 'linear' }).finished;
    fly.remove();
    from.style.visibility = '';
    to.style.visibility = '';
    bubble.style.visibility = '';
    place(where);
    to.animate([{ transform: 'scale(1.2, 0.85)' }, { transform: 'scale(0.92, 1.08)' }, { transform: 'none' }], { duration: 320, easing: 'steps(4)' });
  }

  /* Tour ---------------------------------------------------------------- */
  function show(n) {
    clearInterval(typing);
    clearTimeout(timer);
    if (!panel.classList.contains('is-active')) { end(); return; }
    i = n;
    asking = null;
    skip.textContent = 'Skip';
    const step = STEPS[i];
    map.highlight(step.line);
    stage.dataset.pos = step.pos;
    count.textContent = `${i + 1}/${STEPS.length}`;
    next.textContent = i === STEPS.length - 1 ? 'Got it' : 'Next';
    faces.stage.classList.add('is-talking');
    if (reducedMotion) { text.textContent = step.text; done(); return; }
    // Typed out letter by letter, like a terminal. The rest of the sentence is
    // already laid out but invisible, so the box keeps its size and words never
    // jump to the next line mid-type.
    let k = 0;
    const typed = document.createElement('span');
    const ghost = document.createElement('span');
    ghost.className = 'ghost';
    ghost.textContent = step.text;
    text.replaceChildren(typed, ghost);
    typing = setInterval(() => {
      k++;
      typed.textContent = step.text.slice(0, k);
      ghost.textContent = step.text.slice(k);
      if (k >= step.text.length) done();
    }, TYPE);
  }

  function done() {
    clearInterval(typing);
    typing = 0;
    text.textContent = STEPS[i].text;
    faces.stage.classList.remove('is-talking');
  }

  async function start() {
    if (phone() || i >= 0) return;
    closeHelp();
    i = 0;
    index.classList.add('is-guiding');
    if (at === 'nav') await jump('stage'); else pop('stage');
    if (i === 0) show(0);
  }

  function end() {
    const was = i >= 0;
    clearInterval(typing);
    clearTimeout(timer);
    typing = 0;
    i = -1;
    index.classList.remove('is-guiding');
    faces.stage.classList.remove('is-talking');
    map.highlight(null);
    if (was) jump('nav');
  }

  next.addEventListener('click', () => {
    if (i < 0) return;
    if (asking) { const el = asking; end(); go(el); return; }
    if (typing) { done(); return; }    // first click finishes the sentence
    if (i < STEPS.length - 1) show(i + 1); else end();
  });
  skip.addEventListener('click', () => {
    if (asking) show(i); // keep listening: back to where the tour was
    else end();
  });

  // While the guide talks, the map only listens: a click on a line or a stop
  // makes the guide ask whether to skip the tour and go there instead
  let asking = null;
  let passing = false;
  const PAGES = { about: 'About', work: 'Work', skills: 'Skills', contact: 'Contact' };
  document.addEventListener('click', (e) => {
    if (i < 0 || passing) return;
    const el = e.target.closest('.map [data-goto], .map a.stn');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    clearInterval(typing);
    typing = 0;
    faces.stage.classList.remove('is-talking');
    asking = el;
    const label = el.matches('a.stn') ? 'GitHub' : el.dataset.card
      ? el.closest('.mline')?.querySelector(`[data-card="${el.dataset.card}"] .snake-host`)?.textContent
        || document.querySelector(`.stn[data-card="${el.dataset.card}"] .snake-host`)?.textContent || 'that project'
      : PAGES[el.dataset.goto] || 'there';
    text.textContent = `Want to skip the tour and go to ${label}?`;
    next.textContent = 'Go there';
    skip.textContent = 'Keep listening';
  }, true);
  function go(el) {
    passing = true;
    if (el.click) el.click(); else el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    passing = false;
  }

  /* Help in the top bar --------------------------------------------------- */
  function current() {
    const p = document.querySelector('.panel.is-active');
    if (!p) return 'index';
    if (p.id === 'work' && !p.querySelector('.detail').hidden) return 'project';
    return p.id;
  }
  function openHelp() {
    const key = current();
    helpText.textContent = HELP[key] || HELP.index;
    helpTour.hidden = key !== 'index' || phone();
    help.hidden = false;
  }
  function closeHelp() { help.hidden = true; }

  faces.nav.addEventListener('click', (e) => {
    e.stopPropagation();
    if (help.hidden) openHelp(); else closeHelp();
  });
  help.querySelector('[data-help-close]').addEventListener('click', closeHelp);
  helpTour.addEventListener('click', () => { closeHelp(); start(); });
  document.addEventListener('click', (e) => { if (!help.hidden && !e.target.closest('.bubble--help, .guide--nav')) closeHelp(); });
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (i >= 0) end();
    closeHelp();
  });

  // Skipped intro, or arriving on another page: the guide waits in the top bar.
  // Phones have no room for the tour, so the guide says a short hello there.
  document.addEventListener('intro:chosen', (e) => {
    if (!e.detail.intro || e.detail.first !== panel.id) place('nav');
    if (e.detail.intro && phone()) {
      setTimeout(() => {
        helpText.textContent = "Hi, I'm Mikolaj. This is a map of my site, one line per page. Start with About, then Work and Skills. Tap me any time for tips.";
        helpTour.hidden = true;
        help.hidden = false;
      }, 1800);
    }
  });
  // Every fresh load of the Index gets the greeting, unless the intro was skipped
  panel.addEventListener('map:ready', (e) => {
    if (!e.detail.intro) return;
    if (document.documentElement.dataset.intro === 'off') place('nav'); else start();
  });
  // Leaving the Index mid-tour ends it; any page change closes the help
  new MutationObserver(() => { if (i >= 0 && !panel.classList.contains('is-active')) end(); })
    .observe(panel, { attributes: true, attributeFilter: ['class'] });
  document.querySelectorAll('.panel').forEach((p) => p.addEventListener('panel:enter', closeHelp));
}
