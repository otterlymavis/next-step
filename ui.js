// Execution Assistant — screens. All state changes go through Core and are saved immediately.
(function () {
  'use strict';
  const C = window.Core;
  const KEY = 'nextstep.state';
  const PREV_KEY = 'nextstep.state.prev';
  const UNREADABLE_PREFIX = 'nextstep.unreadable.';

  // Line icons (24×24, stroke).
  const ICONS = {
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    up: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    shuffle: '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h1.97a4 4 0 0 0 3.3-1.7l5.45-8.6a4 4 0 0 1 3.3-1.7H22"/><path d="M2 6h1.97a4 4 0 0 1 3.3 1.7l5.45 8.6a4 4 0 0 0 3.3 1.7H22"/>',
    bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    smaller: '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
    pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 16v-4M12 16V8M17 16v-7"/>',
    save: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><path d="M12 15V3"/>',
    restore: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><path d="M12 3v12"/>',
    share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><path d="M12 2v13"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    open: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    mountain: '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
    clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
    arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    timer: '<path d="M10 2h4M12 14l3-3"/><circle cx="12" cy="14" r="8"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  };

  const OBSTACLES = [
    { key: 'unclear', icon: 'help', label: 'Unclear' },
    { key: 'too big', icon: 'mountain', label: 'Too big' },
    { key: 'missing material', icon: 'clip', label: 'Missing stuff' },
    { key: 'not the right moment', icon: 'clock', label: 'Wrong moment' },
  ];
  const OUTCOME = {
    finished: { icon: 'check', label: 'Step done', tone: 'tone-good' },
    progress: { icon: 'up', label: 'Some progress', tone: 'tone-mid' },
    stuck: { icon: 'cloud', label: "Didn't start", tone: 'tone-calm' },
  };

  let S = null;
  let view = { name: 'home' };
  let welcome = 'normal';
  let longAbsenceHandled = false;
  let askNextDismissed = false;
  let timer = null;
  const app = document.getElementById('app');
  const now = () => Date.now();
  const buzz = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (e) { /* unsupported */ } };

  // ---------- storage ----------

  function load() {
    let raw;
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {
      return { error: 'This browser is not allowing the app to store data (private mode or blocked site data).', raw: null };
    }
    return C.parseState(raw);
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
      return true;
    } catch (e) {
      toast('Could not save just now', 'x');
      return false;
    }
  }

  // Run a state change, save it, then redraw.
  function act(fn) {
    fn();
    save();
    render();
  }

  function go(name, extra) {
    view = Object.assign({ name }, extra || {});
    render();
  }

  // ---------- DOM helpers ----------

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'i');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = ICONS[name] || '';
    return svg;
  }

  const tap = (fn) => (e) => { buzz(); fn(e); };
  const iconBtn = (name, label, onclick, badge) =>
    h('button', { class: 'icon-btn press', 'aria-label': label, title: label, onclick: tap(onclick) }, icon(name), badge ? h('span', { class: 'badge' }, String(badge)) : null);
  const back = (to) => iconBtn('back', 'Back', () => go(to || 'home'));
  const topbar = (left, right) => h('div', { class: 'topbar' }, left || h('span'), right || h('span'));
  const primary = (label, onclick, ic) => h('button', { class: 'primary press', onclick: tap(onclick) }, ic ? icon(ic) : null, label);
  const pill = (ic, label, onclick, quiet) => h('button', { class: 'pill press' + (quiet ? ' quiet' : ''), onclick: tap(onclick) }, icon(ic), label);
  const orb = (ic, label, onclick, badge) =>
    h('button', { class: 'orb press', onclick: tap(onclick) }, h('span', { class: 'c' }, icon(ic), badge ? h('span', { class: 'badge' }, String(badge)) : null), h('small', {}, label));
  const tile = (ic, label, onclick, opts) => {
    opts = opts || {};
    return h('button', { class: 'tile press ' + (opts.tone || '') + (opts.wide ? ' wide' : ''), onclick: tap(onclick), style: opts.style },
      typeof ic === 'string' ? icon(ic) : ic,
      opts.sub != null ? h('div', {}, h('b', {}, label), h('div', { class: 'sub2' }, opts.sub)) : h('b', {}, label));
  };
  const hueStyle = (g) => '--h:' + (g && g.hue != null ? g.hue : 160);
  const emoji = (g, size) => h('div', { class: 'emoji' + (size ? ' ' + size : ''), style: hueStyle(g), 'aria-hidden': 'true' }, g ? g.icon : '•');

  function field(label, ic, attrs) {
    const tag = attrs.multiline ? 'textarea' : 'input';
    const a = Object.assign({}, attrs);
    delete a.multiline;
    const input = h(tag, a);
    return { el: h('div', {}, h('label', { class: 'f', for: a.id }, ic ? icon(ic) : null, label), input), input };
  }

  // A single input with a square confirm button beside it.
  function inlineInput(attrs, ic, onsubmit) {
    const input = h('input', Object.assign({ autocomplete: 'off', enterkeyhint: 'done' }, attrs));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') onsubmit(input.value); });
    return { el: h('div', { class: 'inline' }, input, h('button', { class: 'square press', 'aria-label': 'Save', onclick: tap(() => onsubmit(input.value)) }, icon(ic || 'check'))), input };
  }

  function toast(msg, ic) {
    const t = h('div', { class: 'toast', role: 'status' }, ic ? icon(ic) : null, msg);
    document.body.append(t);
    setTimeout(() => t.remove(), 2600);
  }

  function sheet(build) {
    const close = () => { scrim.remove(); panel.remove(); };
    const scrim = h('div', { class: 'scrim', onclick: close });
    const panel = h('div', { class: 'sheet', role: 'dialog' }, build(close));
    document.body.append(scrim, panel);
    const inp = panel.querySelector('input,textarea');
    if (inp) setTimeout(() => inp.focus(), 50);
  }

  function todayDots() {
    const t = C.today(S, now());
    return t.items.map((i) => h('span', { class: 'dot' + (i.outcome === 'finished' || i.outcome === 'progress' ? ' full' : ''), title: i.goal }));
  }

  // ---------- render ----------

  function render() {
    clearInterval(timer);
    timer = null;
    document.querySelectorAll('.sheet,.scrim').forEach((x) => x.remove());
    app.replaceChildren(screenFor());
    window.scrollTo(0, 0);
  }

  function screenFor() {
    switch (view.name) {
      case 'recover': return recoverScreen();
      case 'resource': return resourceScreen();
      case 'finish': return finishScreen();
      case 'thoughts': return thoughtsScreen();
      case 'after': return afterScreen();
      case 'another': return anotherScreen();
      case 'smaller': return smallerScreen();
      case 'menu': return menuScreen();
      case 'today': return todayScreen();
      case 'goals': return goalsScreen();
      case 'goal': return goalEditScreen();
      case 'saved': return savedThoughtsScreen();
      case 'backup': return backupScreen();
      case 'review': return reviewScreen();
      default: return homeScreen();
    }
  }

  // ---------- home ----------

  function homeTopbar() {
    const t = C.today(S, now());
    const left = t.starts
      ? h('button', { class: 'today-btn press', 'aria-label': 'Today', onclick: tap(() => go('today')) }, todayDots())
      : h('span');
    return topbar(left, iconBtn('menu', 'Menu', () => go('menu')));
  }

  function homeScreen() {
    const cur = C.currentAttempt(S);
    if (cur && C.actionById(S, cur.actionId)) return progressScreen(cur);

    if (welcome === 'long' && !longAbsenceHandled && S.goals.some((g) => g.status === 'active')) return longAbsenceScreen();

    const needs = S.goals.filter((g) => g.status === 'active' && g.needsNext && !C.currentAction(S, g.id));
    if (needs.length && !askNextDismissed) return askNextScreen(needs[0]);

    const rec = C.ensureRecommendation(S, now());
    save();

    if (!rec) return emptyScreen();

    const g = C.goalById(S, rec.goalId);
    const cp = C.checkpointFor(S, rec.id);
    const dl = g.deadline && C.daysUntil(g.deadline, now()) >= 0 ? (g.deadlineLabel || 'Due') + ' ' + C.formatDate(g.deadline) : '';
    const greeting = welcome === 'back' || welcome === 'long' ? h('p', { class: 'muted', style: 'margin:0 0 14px;text-align:center' }, 'Welcome back 👋') : null;

    const card = h('div', { class: 'card stack', style: hueStyle(g) },
      emoji(g),
      h('h1', { style: 'margin-top:10px' }, g.name),
      h('p', { class: 'action' }, rec.text),
      h('div', { class: 'chips' },
        cp ? h('span', { class: 'chip' }, icon('bookmark'), cp) : null,
        h('span', { class: 'chip' }, icon('timer'), rec.small),
        dl ? h('span', { class: 'chip' }, icon('flag'), dl) : null));
    enableSwipe(card, () => go('another'));

    return h('section', { class: 'screen' },
      homeTopbar(),
      notices(),
      h('div', { class: 'center' },
        greeting,
        card,
        h('p', { class: 'swipe-hint' }, '← swipe for another'),
        h('div', { class: 'stack', style: 'margin-top:14px' },
          h('button', { class: 'go play press', 'aria-label': 'Start', onclick: tap(() => onStart(rec)) }, icon('play')),
          h('div', { class: 'go-label' }, 'START')),
        h('div', { class: 'actions-row' },
          pill('smaller', 'Smaller', () => go('smaller', { actionId: rec.id })),
          pill('shuffle', 'Another', () => go('another')))));
  }

  // Horizontal swipe on the card; vertical scrolling is left alone.
  function enableSwipe(el, onSwipe) {
    let x0 = null, y0 = 0, dx = 0;
    el.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; dx = 0; el.classList.add('dragging'); });
    el.addEventListener('pointermove', (e) => {
      if (x0 == null) return;
      dx = e.clientX - x0;
      if (Math.abs(e.clientY - y0) > Math.abs(dx)) return;
      el.style.transform = 'translateX(' + dx + 'px) rotate(' + dx / 40 + 'deg)';
      el.style.opacity = String(1 - Math.min(Math.abs(dx) / 400, 0.5));
    });
    const end = () => {
      if (x0 == null) return;
      x0 = null;
      el.classList.remove('dragging');
      if (Math.abs(dx) > 90) {
        buzz();
        el.style.transform = 'translateX(' + (dx > 0 ? 120 : -120) + '%)';
        el.style.opacity = '0';
        setTimeout(onSwipe, 180);
      } else {
        el.style.transform = '';
        el.style.opacity = '';
      }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  function notices() {
    const out = [];
    const note = (ic, text, ...buttons) => h('div', { class: 'note' }, icon(ic), h('div', { class: 'grow' }, text), ...buttons);
    const tl = (label, fn) => h('button', { class: 'textlink press', onclick: tap(fn) }, label);
    if (S.exampleNote) {
      out.push(note('pencil', 'Example goals. Make them yours.',
        tl('Edit', () => { S.exampleNote = false; save(); go('goals'); }),
        iconBtn('x', 'Dismiss', () => act(() => { S.exampleNote = false; }))));
    }
    for (const g of C.passedDeadlines(S, now())) {
      out.push(note('flag', (g.deadlineLabel || 'Deadline') + ' for ' + g.name + ' was ' + C.formatDate(g.deadline) + '.',
        tl('Update', () => go('goal', { goalId: g.id })),
        iconBtn('x', 'Remove date', () => act(() => { g.deadline = null; g.deadlineLabel = ''; }))));
    }
    const day = C.dueReview(S, now());
    if (day) {
      out.push(note('chart', 'A quick look back is ready.',
        tl('Open', () => go('review', { day })),
        iconBtn('x', 'Not now', () => act(() => S.reviewsSeen.push(day)))));
    }
    return out;
  }

  function onStart(a) {
    if (!a.resource && !a.resourceAsked) return go('resource', { actionId: a.id });
    doStart(a);
  }

  function doStart(a) {
    welcome = 'normal';
    const att = C.start(S, a.id, now());
    if (C.isUrl(a.resource)) {
      window.open(a.resource.trim(), '_blank', 'noopener');
      C.recordLaunch(S, att.id, now());
    }
    save();
    go('home');
  }

  // START asks for a missing resource once.
  function resourceScreen() {
    const a = C.actionById(S, view.actionId);
    if (!a) return homeScreen();
    const g = C.goalById(S, a.goalId);
    const inp = inlineInput({ id: 'res', placeholder: 'Link, or where it is' }, 'play', (v) => {
      a.resource = v.trim();
      a.resourceAsked = true;
      doStart(a);
    });
    return h('section', { class: 'screen' },
      topbar(back()),
      h('div', { class: 'center stack' },
        emoji(g),
        h('h2', { style: 'margin-top:16px' }, 'Where is the material?'),
        h('div', { style: 'width:100%' }, inp.el),
        h('div', { class: 'actions-row' }, pill('arrow', 'Nothing needed', () => { a.resourceAsked = true; doStart(a); }, true))));
  }

  function askNextScreen(g) {
    const inp = inlineInput({ id: 'next', placeholder: 'e.g. Open chapter 3' }, 'check', (v) => {
      if (!v.trim()) return inp.input.focus();
      act(() => C.setNextStep(S, g.id, v));
    });
    return h('section', { class: 'screen' },
      homeTopbar(),
      h('div', { class: 'center stack' },
        emoji(g),
        h('h1', { style: 'margin:16px 0 6px' }, g.name),
        h('p', { class: 'muted', style: 'margin:0 0 18px' }, 'What should open next time?'),
        h('div', { style: 'width:100%' }, inp.el),
        h('div', { class: 'actions-row' },
          pill('clock', 'Not now', () => { askNextDismissed = true; render(); }, true),
          pill('archive', 'Later', () => act(() => C.setGoalStatus(S, g.id, 'later')), true))));
  }

  function emptyScreen() {
    const resting = S.goals.filter((g) => g.status !== 'active');
    const activeNoStep = C.goalsNeedingNext(S);
    return h('section', { class: 'screen' },
      homeTopbar(),
      h('div', { class: 'center' },
        h('div', { class: 'stack' },
          h('div', { style: 'font-size:56px' }, '🌱'),
          h('h2', { style: 'margin-top:10px' }, S.goals.length ? 'Nothing active right now' : 'What would you like to start?'),
          h('button', { class: 'go press', 'aria-label': 'Add a goal', onclick: tap(() => go('goal', { goalId: null })) }, icon('plus')),
          h('div', { class: 'go-label' }, 'ADD A GOAL')),
        activeNoStep.length ? h('div', { class: 'spaced' },
          h('div', { class: 'section-label' }, 'Needs a next step'),
          h('div', { class: 'list' }, activeNoStep.map((g) => goalRow(g, 'Choose next step', () => act(() => { askNextDismissed = false; g.needsNext = true; }))))) : null,
        resting.length ? h('div', { class: 'spaced' },
          h('div', { class: 'section-label' }, 'Resting'),
          h('div', { class: 'list' }, resting.map((g) => goalRow(g, 'Tap to bring back', () => act(() => C.setGoalStatus(S, g.id, 'active')), 'play')))) : null));
  }

  function goalRow(g, sub, onclick, trailing) {
    return h('button', { class: 'row-item press' + (g.status !== 'active' ? ' dim' : ''), onclick: tap(onclick) },
      emoji(g, 'sm'),
      h('div', { class: 'grow' }, h('div', { class: 't' }, g.name), sub ? h('div', { class: 's' }, sub) : null),
      trailing ? icon(trailing) : null);
  }

  function longAbsenceScreen() {
    const active = S.goals.filter((g) => g.status === 'active');
    const choice = {};
    active.forEach((g) => { choice[g.id] = 'active'; });
    const rows = active.map((g) => {
      const btn = h('button', { class: 'row-item press' });
      const paint = () => {
        const kept = choice[g.id] === 'active';
        btn.classList.toggle('dim', !kept);
        btn.replaceChildren(emoji(g, 'sm'), h('div', { class: 'grow' }, h('div', { class: 't' }, g.name)),
          h('span', { class: 'pill', style: 'padding:6px 12px' }, icon(kept ? 'check' : 'archive'), kept ? 'Keep' : 'Later'));
      };
      btn.onclick = tap(() => { choice[g.id] = choice[g.id] === 'active' ? 'later' : 'active'; paint(); });
      paint();
      return btn;
    });
    return h('section', { class: 'screen' },
      topbar(null, pill('arrow', 'Skip', () => { longAbsenceHandled = true; render(); }, true)),
      h('div', { class: 'center' },
        h('div', { class: 'stack' }, h('div', { style: 'font-size:48px' }, '👋'), h('h2', { style: 'margin-top:8px' }, 'Welcome back'),
          h('p', { class: 'muted', style: 'margin:-8px 0 18px' }, 'Tap any that can wait.')),
        h('div', { class: 'list' }, rows),
        primary('Continue', () => {
          longAbsenceHandled = true;
          act(() => active.forEach((g) => { if (choice[g.id] !== 'active') C.setGoalStatus(S, g.id, choice[g.id]); }));
        }, 'arrow')));
  }

  // ---------- in progress ----------

  function progressScreen(att) {
    const a = C.actionById(S, att.actionId);
    const g = C.goalById(S, att.goalId);
    const since = att.resumedAt || att.startedAt;
    const mins = () => Math.floor((now() - since) / 60000);
    const elapsedNum = h('span', {}, String(mins()));
    const cp = C.checkpointFor(S, a.id);
    const checkinSlot = h('div', { style: 'width:100%' });

    // Park a thought in a bottom sheet; the bulb's badge counts what was parked.
    const parkSlot = h('span', { style: 'display:contents' });
    const paintPark = () => parkSlot.replaceChildren(orb('bulb', 'Park thought', openPark, C.thoughtsFor(S, att.id).length));
    function openPark() {
      sheet((close) => {
        const inp = inlineInput({ id: 'park', placeholder: 'Park a stray thought…' }, 'check', (v) => {
          if (!C.parkThought(S, v, att.id, now())) return inp.input.focus();
          save();
          close();
          paintPark();
          toast('Parked for later', 'bulb');
        });
        return [h('div', { class: 'stack' }, icon('bulb'), h('p', { class: 'muted', style: 'margin:6px 0 14px' }, 'Saved for after. Back to it.')), inp.el];
      });
    }
    paintPark();

    const showCheckin = () => {
      if (!g.checkinMinutes || att.checkinShown) return;
      if (now() - since < g.checkinMinutes * 60000) return;
      const dismiss = () => { att.checkinShown = true; save(); checkinSlot.replaceChildren(); };
      checkinSlot.replaceChildren(h('div', { class: 'note' }, icon('clock'),
        h('div', { class: 'grow' }, g.checkinMinutes + ' min in'),
        h('button', { class: 'textlink press', onclick: tap(dismiss) }, 'Keep going'),
        h('button', { class: 'textlink press', onclick: tap(() => { dismiss(); go('finish', { attemptId: att.id }); }) }, 'Wrap up')));
    };
    showCheckin();
    timer = setInterval(() => {
      elapsedNum.textContent = String(mins());
      showCheckin();
    }, 15000);

    const orbs = [];
    if (C.isUrl(a.resource)) {
      orbs.push(orb('open', 'Open', () => {
        window.open(a.resource.trim(), '_blank', 'noopener');
        C.recordLaunch(S, att.id, now());
        save();
      }));
    }
    orbs.push(parkSlot);
    orbs.push(orb('shuffle', 'Switch', () => go('another', { switching: true })));

    return h('section', { class: 'screen', style: hueStyle(g) },
      topbar(h('span', { class: 'chip', style: hueStyle(g) }, h('span', { class: 'breath' }), 'In progress'), iconBtn('menu', 'Menu', () => go('menu'))),
      h('div', { class: 'center stack' },
        emoji(g),
        h('h2', { style: 'margin:14px 0 4px' }, a.text),
        h('div', { class: 'chips', style: 'margin-top:8px' },
          cp ? h('span', { class: 'chip' }, icon('bookmark'), cp) : null,
          a.resource && !C.isUrl(a.resource) ? h('span', { class: 'chip' }, icon('link'), a.resource) : null,
          a.target ? h('span', { class: 'chip' }, icon('target'), a.target) : null),
        h('div', { class: 'elapsed', 'aria-label': 'Minutes since start' }, elapsedNum, h('small', {}, 'min')),
        h('p', { class: 'muted', style: 'margin:0 0 22px;font-size:14px' }, 'since you started'),
        checkinSlot,
        h('div', { class: 'orbs' }, orbs)),
      h('div', { class: 'bottom stack' },
        h('button', { class: 'go press', style: 'width:88px;height:88px', 'aria-label': 'Finish', onclick: tap(() => go('finish', { attemptId: att.id })) }, icon('check')),
        h('div', { class: 'go-label' }, 'FINISH')));
  }

  // ---------- finish (at most two taps) ----------

  function finishScreen() {
    const att = S.attempts.find((x) => x.id === view.attemptId);
    if (!att || att.state === 'finished') return homeScreen();
    const a = C.actionById(S, att.actionId);
    const g = C.goalById(S, att.goalId);
    const step = view.step;

    const complete = (outcome, opts) => {
      const r = C.finish(S, att.id, outcome, opts, now());
      if (!r.changed) return go('home');
      save();
      const afterView = { attemptId: att.id, outcome, goalId: att.goalId, nextId: r.next ? r.next.id : null, deferred: !!(opts && opts.deferred) };
      if (C.thoughtsFor(S, att.id).length) go('thoughts', { attemptId: att.id, after: afterView });
      else go('after', afterView);
    };

    let body;
    if (!step) {
      const hasNext = C.goalActions(S, a.goalId).some((x) => !x.done && x.id !== a.id);
      const o = (k, fn) => tile(OUTCOME[k].icon, OUTCOME[k].label, fn, { tone: OUTCOME[k].tone });
      body = [
        h('h2', { style: 'text-align:center' }, 'How did it go?'),
        h('div', { class: 'tiles three' },
          o('finished', () => (hasNext ? complete('finished') : go('finish', { attemptId: att.id, step: 'next' }))),
          o('progress', () => go('finish', { attemptId: att.id, step: 'progress' })),
          o('stuck', () => go('finish', { attemptId: att.id, step: 'stuck' }))),
        h('div', { class: 'actions-row' }, pill('play', 'Keep going', () => go('home'), true)),
      ];
    } else if (step === 'progress') {
      const inp = inlineInput({ id: 'pos', value: C.checkpointFor(S, a.id), placeholder: 'e.g. 18:10, page 4' }, 'check', (v) => complete('progress', { position: v }));
      body = [h('div', { class: 'stack' }, icon('bookmark'), h('h2', { style: 'margin-top:10px' }, 'Where did you stop?')), inp.el];
    } else if (step === 'next') {
      const inp = inlineInput({ id: 'next', placeholder: 'e.g. Start lecture 5' }, 'check', (v) => complete('finished', { nextText: v, deferred: !v.trim() }));
      body = [
        h('div', { class: 'stack' }, icon('arrow'), h('h2', { style: 'margin-top:10px' }, 'What opens next time?')),
        inp.el,
        h('div', { class: 'actions-row' }, pill('clock', 'Decide later', () => complete('finished', { deferred: true }), true)),
      ];
    } else if (step === 'stuck') {
      body = [
        h('h2', { style: 'text-align:center' }, 'What got in the way?'),
        h('div', { class: 'tiles' }, OBSTACLES.map((o) => tile(o.icon, o.label, () => complete('stuck', { obstacle: o.key })))),
        h('div', { class: 'actions-row' }, pill('arrow', 'Skip', () => complete('stuck', {}), true)),
      ];
    }
    return h('section', { class: 'screen', style: hueStyle(g) },
      topbar(step ? iconBtn('back', 'Back', () => go('finish', { attemptId: att.id })) : back(), emoji(g, 'xs')),
      h('div', { class: 'center' }, body));
  }

  function thoughtsScreen() {
    const list = C.thoughtsFor(S, view.attemptId);
    if (!list.length) {
      view = Object.assign({ name: 'after' }, view.after);
      return afterScreen();
    }
    return h('section', { class: 'screen' },
      h('div', { class: 'center' },
        h('div', { class: 'stack' }, icon('bulb'), h('h2', { style: 'margin-top:10px' }, list.length === 1 ? '1 parked thought' : list.length + ' parked thoughts')),
        h('div', { class: 'list' }, list.map((t) => thoughtRow(t, true))),
        primary('Keep the rest', () => act(() => list.forEach((t) => C.keepThought(S, t.id))), 'check')));
  }

  function thoughtRow(t, withKeep) {
    return h('div', { class: 'row-item' },
      h('div', { class: 'grow' }, h('div', {}, t.text)),
      iconBtn('target', 'Make it a goal', () => { act(() => C.thoughtToGoal(S, t.id, now())); toast('Saved as a goal for later', 'target'); }),
      withKeep ? iconBtn('archive', 'Keep for later', () => act(() => C.keepThought(S, t.id))) : null,
      iconBtn('trash', 'Delete', () => act(() => C.deleteThought(S, t.id))));
  }

  function afterScreen() {
    const v = view;
    if (v.deferred) {
      const g = C.goalById(S, v.goalId);
      if (g && !g.needsNext) { g.needsNext = true; askNextDismissed = true; save(); }
    }
    const g = C.goalById(S, v.goalId);
    const next = v.nextId && C.actionById(S, v.nextId);
    const doneForNow = () => act(() => { C.endSession(S); view = { name: 'home' }; });

    if (v.outcome === 'stuck') {
      return h('section', { class: 'screen' },
        h('div', { class: 'center' },
          h('div', { class: 'stack' }, h('div', { style: 'font-size:52px' }, '🌤️'), h('h2', { style: 'margin-top:8px' }, "That's fine"),
            h('p', { class: 'muted', style: 'margin:-8px 0 22px' }, 'Nothing changed. It will be here.')),
          h('div', { class: 'tiles three' },
            tile('smaller', 'Smaller', () => go('smaller', { actionId: v.nextId })),
            tile('shuffle', 'Another', () => go('another')),
            tile('moon', 'Rest', () => { doneForNow(); toast('See you later', 'moon'); }))));
    }

    const cp = v.outcome === 'progress' && next ? C.checkpointFor(S, next.id) : '';
    const canContinue = next && C.goalById(S, next.goalId) && C.goalById(S, next.goalId).status === 'active';
    const mark = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mark.setAttribute('viewBox', '0 0 100 100');
    mark.setAttribute('class', 'done-mark');
    mark.innerHTML = '<circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="5"/><path d="M30 52 44 66 71 37" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>';

    return h('section', { class: 'screen', style: hueStyle(g) },
      h('div', { class: 'center stack' },
        mark,
        h('h2', {}, 'Saved'),
        h('div', { class: 'chips', style: 'margin-top:0' },
          cp ? h('span', { class: 'chip' }, icon('bookmark'), cp) : null,
          v.outcome === 'finished' && next ? h('span', { class: 'chip' }, icon('arrow'), next.text) : null,
          v.outcome === 'finished' && !next ? h('span', { class: 'chip' }, icon('clock'), 'Next step: decide later') : null),
        h('div', { class: 'dots', 'aria-label': 'Today' }, todayDots()),
        h('div', { class: 'actions-row', style: 'margin-top:34px' },
          canContinue ? h('button', { class: 'primary press', style: 'width:auto;padding:15px 22px', onclick: tap(() => onStart(next)) }, icon('play'), 'Keep going') : null,
          pill('moon', 'Done for now', doneForNow))));
  }

  // ---------- another task / smaller ----------

  function anotherScreen() {
    const rec = C.actionById(S, S.recommendation.actionId);
    const alts = C.alternatives(S, now());
    const recGoal = rec && C.goalById(S, rec.goalId);
    const choose = (a) => act(() => { C.chooseAlternative(S, a.id, now()); view = { name: 'home' }; });
    return h('section', { class: 'screen' },
      topbar(back(), h('span', { class: 'muted' }, view.switching ? 'Switch to' : 'Pick one')),
      h('div', { class: 'center' },
        alts.length
          ? h('div', { class: 'tiles one' }, alts.map((a) => {
            const g = C.goalById(S, a.goalId);
            return tile(emoji(g, 'sm'), g.name, () => choose(a), { wide: true, sub: a.text, style: hueStyle(g) });
          }))
          : h('div', { class: 'stack' }, h('div', { style: 'font-size:48px' }, '🍃'), h('h2', { style: 'margin-top:8px' }, "That's everything for now")),
        h('div', { class: 'tiles three spaced' },
          rec ? tile('smaller', 'Smaller', () => go('smaller', { actionId: rec.id })) : null,
          recGoal ? tile('pause', 'Pause', () => {
            act(() => { C.setGoalStatus(S, recGoal.id, 'paused'); view = { name: 'home' }; });
            toast('Paused. Bring it back in Goals', 'pause');
          }, { sub: recGoal.name }) : null,
          !alts.length ? tile('moon', 'Rest', () => { act(() => { C.endSession(S); view = { name: 'home' }; }); toast('See you later', 'moon'); }) : null,
          !alts.length && S.recommendation.exclusions.length ? tile('refresh', 'Start over', () => act(() => { C.freshRound(S, now()); view = { name: 'home' }; })) : null)));
  }

  function smallerScreen() {
    const a = C.actionById(S, view.actionId || S.recommendation.actionId);
    if (!a) return homeScreen();
    const g = C.goalById(S, a.goalId);
    const apply = (val) => act(() => {
      C.makeSmaller(S, a.id, val);
      const cur = C.currentAttempt(S);
      if (cur && cur.actionId !== a.id) cur.state = 'suspended';
      S.recommendation.actionId = a.id;
      view = { name: 'home' };
    });
    const suggestions = [['👀', 'Just open it'], ['⏱️', 'Two minutes'], ['📖', 'Read one line'], ['🤏', 'The tiniest first bit']];
    const inp = inlineInput({ id: 'small', placeholder: 'Or type your own' }, 'check', (v) => v.trim() && apply(v));
    return h('section', { class: 'screen', style: hueStyle(g) },
      topbar(back(), emoji(g, 'xs')),
      h('div', { class: 'center' },
        h('div', { class: 'stack' }, icon('smaller'), h('h2', { style: 'margin-top:10px' }, 'Make it smaller')),
        h('div', { class: 'tiles' }, suggestions.map(([e, label]) => tile(h('div', { style: 'font-size:30px' }, e), label, () => apply(label)))),
        h('div', { class: 'spaced' }, inp.el)));
  }

  // ---------- secondary screens ----------

  function menuScreen() {
    const kept = S.thoughts.filter((t) => t.status === 'kept').length;
    const t = C.today(S, now());
    return h('section', { class: 'screen' },
      topbar(back()),
      h('div', { class: 'tiles' },
        tile('calendar', 'Today', () => go('today'), { sub: t.starts ? t.starts + ' started' : '—' }),
        tile('target', 'Goals', () => go('goals'), { sub: S.goals.filter((g) => g.status === 'active').length + ' active' }),
        tile('bulb', 'Thoughts', () => go('saved'), { sub: kept ? kept + ' saved' : '—' }),
        tile('chart', 'Look back', () => go('review'), { sub: 'Your pattern' }),
        tile('save', 'Backup', () => go('backup'), { sub: 'Export & restore' })));
  }

  function todayScreen() {
    const t = C.today(S, now());
    const ic = (i) => (i.outcome ? OUTCOME[i.outcome].icon : i.state === 'current' ? 'play' : 'pause');
    return h('section', { class: 'screen' },
      topbar(back('menu'), h('span', { class: 'muted' }, 'Today')),
      t.items.length
        ? h('div', { class: 'list' }, t.items.map((i) => {
          const g = S.goals.find((x) => x.name === i.goal);
          return h('div', { class: 'row-item' }, emoji(g, 'sm'),
            h('div', { class: 'grow' }, h('div', { class: 't' }, i.goal), h('div', { class: 's' }, new Date(i.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))),
            h('span', { class: i.outcome ? OUTCOME[i.outcome].tone : 'muted' }, icon(ic(i))));
        }))
        : h('div', { class: 'center stack' }, h('div', { style: 'font-size:48px' }, '☀️'), h('p', { class: 'muted' }, 'Nothing yet today. That is fine.')));
  }

  function goalsScreen() {
    const groups = [['active', 'Active'], ['paused', 'Paused'], ['later', 'Later']];
    return h('section', { class: 'screen' },
      topbar(back('menu'), iconBtn('plus', 'Add a goal', () => go('goal', { goalId: null }))),
      groups.map(([st, title]) => {
        const gs = S.goals.filter((g) => g.status === st);
        if (!gs.length) return null;
        return h('div', {},
          h('div', { class: 'section-label' }, title),
          h('div', { class: 'list' }, gs.map((g) => {
            const a = C.currentAction(S, g.id);
            return goalRow(g, a ? a.text : 'No next step yet', () => go('goal', { goalId: g.id }), 'pencil');
          })));
      }));
  }

  function goalEditScreen() {
    const isNew = !view.goalId;
    const g = isNew ? null : C.goalById(S, view.goalId);
    if (!isNew && !g) return goalsScreen();
    const a = g ? C.currentAction(S, g.id) : null;
    const upcoming = g ? C.goalActions(S, g.id).filter((x) => !x.done && x !== a) : [];
    let pickedIcon = g ? g.icon : C.GOAL_ICONS[S.goals.length % C.GOAL_ICONS.length];
    let pickedHue = g ? g.hue : C.GOAL_HUES[S.goals.length % C.GOAL_HUES.length];

    const preview = h('div', {});
    const paintPreview = () => preview.replaceChildren(emoji({ icon: pickedIcon, hue: pickedHue }));
    paintPreview();
    const iconButtons = C.GOAL_ICONS.map((e) => {
      const b = h('button', { class: 'press', 'aria-pressed': String(e === pickedIcon), 'aria-label': e }, e);
      b.onclick = tap(() => { pickedIcon = e; iconButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); paintPreview(); });
      return b;
    });
    const hueButtons = C.GOAL_HUES.map((hv) => {
      const b = h('button', { class: 'press', style: '--h:' + hv, 'aria-pressed': String(hv === pickedHue), 'aria-label': 'Colour' });
      b.onclick = tap(() => { pickedHue = hv; hueButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); paintPreview(); });
      return b;
    });

    const name = field('Goal', 'target', { id: 'g-name', value: g ? g.name : '', placeholder: 'e.g. Automatic Control' });
    const text = field('Next action', 'play', { id: 'g-text', value: a ? a.text : '', placeholder: 'e.g. Watch lecture 4 for five minutes' });
    const res = field('Material', 'link', { id: 'g-res', value: a ? a.resource : '', placeholder: 'Link, or where it is' });
    const cp = field('Restart point', 'bookmark', { id: 'g-cp', value: a ? C.checkpointFor(S, a.id) : '', placeholder: 'e.g. Lecture 4 · 12:40' });
    const small = field('Small version', 'timer', { id: 'g-small', value: a ? a.small : 'Start with five minutes' });
    const target = field('Optional target', 'target', { id: 'g-target', value: a ? a.target : '', placeholder: 'e.g. Around 20 minutes' });
    const later = field('Steps after this (one per line)', 'list', { id: 'g-later', multiline: true, value: upcoming.map((x) => x.text).join('\n') });
    const dl = field('Real deadline', 'flag', { id: 'g-dl', type: 'date', value: g && g.deadline ? g.deadline : '' });
    const dlLabel = field('Deadline name', 'flag', { id: 'g-dll', value: g ? g.deadlineLabel : '', placeholder: 'e.g. Exam' });
    const status = h('select', { id: 'g-status' },
      ['active', 'paused', 'later'].map((st) => h('option', { value: st, selected: (g ? g.status : 'active') === st }, { active: 'Active', paused: 'Paused', later: 'Later' }[st])));
    const checkin = h('select', { id: 'g-checkin' },
      [0, 15, 20, 25, 30, 45, 60].map((m) => h('option', { value: m, selected: (g && g.checkinMinutes || 0) === m }, m ? m + ' min' : 'Off')));

    const onSave = () => {
      const nm = name.input.value.trim();
      const tx = text.input.value.trim();
      if (!nm) return name.input.focus();
      act(() => {
        const t = now();
        const goal = g || C.addGoal(S, { name: nm }, t);
        goal.name = nm;
        goal.icon = pickedIcon;
        goal.hue = pickedHue;
        const newStatus = status.value;
        if (newStatus !== goal.status) C.setGoalStatus(S, goal.id, newStatus);
        goal.deadline = dl.input.value || null;
        goal.deadlineLabel = dlLabel.input.value.trim();
        goal.checkinMinutes = Number(checkin.value) || null;
        let action = a;
        if (tx && !action) action = C.addAction(S, goal.id, { text: tx });
        if (action) {
          if (tx) action.text = tx;
          action.resource = res.input.value.trim();
          action.small = small.input.value.trim() || 'Start with five minutes';
          action.target = target.input.value.trim();
          C.setCheckpoint(S, action.id, cp.input.value, t);
        }
        // Replace the upcoming steps with the edited list, keeping order after the current one.
        const lines = later.input.value.split('\n').map((l) => l.trim()).filter(Boolean);
        const keep = new Set();
        upcoming.forEach((x, i) => { if (lines[i] != null) { x.text = lines[i]; keep.add(x.id); } });
        S.actions = S.actions.filter((x) => !(upcoming.includes(x) && !keep.has(x.id)));
        lines.slice(upcoming.length).forEach((l) => C.addAction(S, goal.id, { text: l }));
        S.exampleNote = false;
        view = { name: isNew ? 'home' : 'goals' };
      });
      toast('Saved', 'check');
    };

    const more = h('details', {},
      h('summary', {}, icon('sliders'), 'More'),
      cp.el, small.el, target.el, later.el, dl.el, dlLabel.el,
      h('label', { class: 'f', for: 'g-status' }, icon('pause'), 'Status'), status,
      h('label', { class: 'f', for: 'g-checkin' }, icon('clock'), 'Quiet check-in'), checkin);

    return h('section', { class: 'screen' },
      topbar(back(isNew ? 'home' : 'goals'),
        g ? iconBtn('trash', 'Delete goal', () => {
          if (!confirm('Delete “' + g.name + '” and its steps?')) return;
          act(() => { C.deleteGoal(S, g.id); view = { name: 'goals' }; });
        }) : null),
      h('div', { class: 'stack' }, preview),
      h('div', { class: 'spaced picker' }, iconButtons),
      h('div', { class: 'swatches', style: 'margin-top:12px;justify-content:center' }, hueButtons),
      name.el, text.el, res.el, more,
      h('div', { class: 'spaced' }, primary('Save', onSave, 'check')));
  }

  function savedThoughtsScreen() {
    const list = S.thoughts.filter((t) => t.status === 'kept');
    return h('section', { class: 'screen' },
      topbar(back('menu'), h('span', { class: 'muted' }, 'Thoughts')),
      list.length
        ? h('div', { class: 'list' }, list.map((t) => thoughtRow(t, false)))
        : h('div', { class: 'center stack' }, icon('bulb'), h('p', { class: 'muted' }, 'Parked thoughts you keep land here.')));
  }

  function exportJson() {
    return JSON.stringify(S, null, 2);
  }

  function download(name, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function backupName() {
    return 'next-step-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  }

  function backupScreen() {
    const file = h('input', { type: 'file', accept: 'application/json,.json', id: 'imp-file', style: 'display:none' });
    const doImport = (raw) => {
      const r = C.parseState(raw);
      if (!r.state) return toast(r.error || 'That backup looks empty', 'x');
      if (!confirm('Replace the current data with this backup? The current data is kept as a fallback copy.')) return;
      try { localStorage.setItem(PREV_KEY, JSON.stringify(S)); } catch (e) { /* best effort */ }
      S = r.state;
      act(() => { view = { name: 'home' }; });
      toast('Backup restored', 'check');
    };
    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      if (f) f.text().then(doImport);
    });
    const canShare = navigator.canShare && navigator.canShare({ files: [new File(['{}'], 'x.json', { type: 'application/json' })] });
    return h('section', { class: 'screen' },
      topbar(back('menu'), h('span', { class: 'muted' }, 'Backup')),
      h('div', { class: 'note' }, icon('help'), h('div', { class: 'grow' }, 'Stored only on this device. Export now and then.')),
      h('div', { class: 'tiles spaced' },
        canShare ? tile('share', 'Share file', () => {
          const f = new File([exportJson()], backupName(), { type: 'application/json' });
          navigator.share({ files: [f], title: 'Next Step backup' }).catch(() => {});
        }) : null,
        tile('save', 'Download', () => download(backupName(), exportJson())),
        tile('copy', 'Copy text', () => {
          navigator.clipboard.writeText(exportJson()).then(() => toast('Copied', 'check'), () => toast('Copy did not work here', 'x'));
        }),
        tile('restore', 'Restore file', () => file.click()),
        tile('pencil', 'Paste backup', () => sheet((close) => {
          const ta = h('textarea', { placeholder: '{ … }', style: 'min-height:140px' });
          return [ta, h('div', { class: 'spaced' }, primary('Restore', () => { close(); doImport(ta.value); }, 'restore'))];
        }))),
      file);
  }

  function reviewScreen() {
    const st = C.reviewStats(S, now());
    const day = view.day;
    const qs = ['When did it help you start?', 'When did you forget it?', 'What would make starting easier?'];
    const inputs = qs.map((q, i) => field(q, null, { id: 'rq' + i, multiline: true }));
    const obstacles = Object.entries(st.obstacles);
    const th = (ic, label) => h('th', { title: label, 'aria-label': label }, icon(ic));
    return h('section', { class: 'screen' },
      topbar(back(day ? 'home' : 'menu'), h('span', { class: 'muted' }, 'Look back')),
      h('table', { class: 'stats' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Wk'), th('menu', 'Opened'), th('open', 'Material'), th('play', 'Starts'), th('up', 'Got going'))),
        h('tbody', {}, st.weeks.map((w) => h('tr', {}, [w.week, w.opens, w.launches, w.starts, w.began].map((x) => h('td', {}, String(x))))))),
      obstacles.length ? h('div', { class: 'chips', style: 'justify-content:flex-start' },
        obstacles.map(([k, n]) => {
          const o = OBSTACLES.find((x) => x.key === k);
          return h('span', { class: 'chip' }, icon(o ? o.icon : 'help'), (o ? o.label : k) + ' ×' + n);
        })) : null,
      inputs.map((f) => f.el),
      h('div', { class: 'spaced' }, primary('Save', () => act(() => {
        S.reviews = S.reviews || [];
        S.reviews.push({ at: now(), day: day || null, answers: inputs.map((f, i) => ({ q: qs[i], a: f.input.value.trim() })) });
        if (day && !S.reviewsSeen.includes(day)) S.reviewsSeen.push(day);
        view = { name: 'home' };
      }), 'check')));
  }

  function recoverScreen() {
    return h('section', { class: 'screen' },
      h('div', { class: 'center' },
        h('div', { class: 'stack' }, h('div', { style: 'font-size:48px' }, '🧩'), h('h2', { style: 'margin-top:8px' }, 'Saved data could not be opened'),
          h('p', { class: 'muted', style: 'margin:-8px 0 20px' }, view.error)),
        h('div', { class: 'tiles' },
          view.raw != null ? tile('save', 'Download it first', () => download('next-step-unreadable.json', view.raw)) : null,
          tile('restore', 'Restore backup', () => { S = S || C.emptyState(now()); go('backup'); })),
        view.raw != null ? h('div', { class: 'actions-row' }, pill('refresh', 'Start fresh (old data kept)', () => {
          try { localStorage.setItem(UNREADABLE_PREFIX + Date.now(), view.raw); } catch (e) { return toast('Could not keep a copy, so nothing changed', 'x'); }
          S = C.emptyState(now());
          welcome = C.recordOpen(S, now());
          act(() => { view = { name: 'home' }; });
        }, true)) : null));
  }

  // ---------- boot ----------

  function boot() {
    const r = load();
    if (r.error) {
      view = { name: 'recover', error: r.error, raw: r.raw };
      render();
      return;
    }
    S = r.state;
    if (!S) {
      S = C.seedState(now());
      S.exampleNote = true;
    }
    welcome = C.recordOpen(S, now());
    if (welcome === 'first') welcome = 'normal';
    save();
    render();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  }

  // Coming back to an already-open app counts as a return.
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hiddenAt = now(); return; }
    if (!S || view.name === 'recover') return;
    if (hiddenAt && now() - hiddenAt > 30 * 60000) askNextDismissed = false;
    const w = C.recordOpen(S, now());
    save();
    if (w !== 'normal') { welcome = w; longAbsenceHandled = false; }
    if (['home', 'after'].includes(view.name)) render();
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  boot();
})();
