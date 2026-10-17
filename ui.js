// Execution Assistant — screens. All state changes go through Core and are saved immediately.
(function () {
  'use strict';
  const C = window.Core;
  const KEY = 'nextstep.state';
  const UI_KEY = 'nextstep.ui'; // open screen and unsent drafts, so a process survives the app closing
  const PREV_KEY = 'nextstep.state.prev';
  const UNREADABLE_PREFIX = 'nextstep.unreadable.';
  const APP_VERSION = 10; // keep in step with VERSION in sw.js
  const RESUMABLE = new Set(['resource', 'finish', 'thoughts', 'goal', 'smaller', 'review', 'notes']);

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
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    up1: '<path d="m18 15-6-6-6 6"/>',
    down1: '<path d="m6 9 6 6 6-6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
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
  let UI = { view: null, drafts: {}, sheet: null };
  let welcome = 'normal';
  let longAbsenceHandled = false;
  let askNextDismissed = false;
  let updateReady = false; // a newer version has been installed in the background
  let timer = null;
  const app = document.getElementById('app');
  const now = () => Date.now();
  const reducedMotion = () => (S && S.prefs.motion === 'off') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const game = () => S && S.prefs.game;
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

  function loadUI() {
    try { UI = Object.assign(UI, JSON.parse(localStorage.getItem(UI_KEY) || '{}')); } catch (e) { /* start clean */ }
    UI.drafts = UI.drafts || {};
  }

  function saveUI() {
    try { localStorage.setItem(UI_KEY, JSON.stringify(UI)); } catch (e) { /* drafts are best effort */ }
  }

  // ---------- drafts: every typed value is kept until the form is submitted or abandoned with Back ----------

  const vkey = (v) => [v.name, v.goalId || '', v.actionId || '', v.attemptId || '', v.step || '', v.day || ''].join('|');
  const draftKey = (id) => vkey(view) + '#' + id;
  const draft = (id) => UI.drafts[draftKey(id)];

  function setDraft(id, value) {
    UI.drafts[draftKey(id)] = value;
    saveUI();
  }

  function clearDrafts(v) {
    const prefix = vkey(v || view) + '#';
    for (const k of Object.keys(UI.drafts)) if (k.startsWith(prefix)) delete UI.drafts[k];
    saveUI();
  }

  function applyDrafts(root) {
    root.querySelectorAll('input[id],textarea[id],select[id]').forEach((el) => {
      if (el.type === 'file') return;
      const d = draft(el.id);
      if (d != null) el.value = d;
    });
  }

  const onType = (e) => {
    const el = e.target;
    if (el.id && el.matches('input,textarea,select') && el.type !== 'file') setDraft(el.id, el.value);
  };
  document.addEventListener('input', onType);
  document.addEventListener('change', onType);

  // Run a submitted state change, save it, then redraw.
  function act(fn) {
    clearDrafts();
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
  const navBtn = (ic, label, onclick, cls) => h('button', { class: 'nav-btn press' + (cls ? ' ' + cls : ''), onclick: tap(onclick) }, icon(ic), label);
  // Back abandons the current form, so its drafts go too.
  const back = (to) => navBtn('back', 'Back', () => { clearDrafts(); go(to || 'home'); });
  const menuBtn = () => navBtn('menu', 'More', () => go('menu'));
  // Same layout on every screen: left = way back (or Today), centre = where you are, right = Menu.
  const topbar = (left, title, right) => h('div', { class: 'topbar' },
    left || h('span'),
    title ? h('span', { class: 'title' }, title) : h('span'),
    right === undefined ? menuBtn() : right || h('span'));
  const bigButton = (ic, label, hint, onclick, play) => h('button', { class: 'go-btn press', onclick: tap(onclick) },
    h('span', { class: 'go' + (play ? ' play' : '') }, icon(ic)),
    h('span', { class: 'go-label' }, label),
    hint ? h('span', { class: 'go-hint' }, hint) : null);
  const primary = (label, onclick, ic) => h('button', { class: 'primary press', onclick: tap(onclick) }, ic ? icon(ic) : null, label);
  const pill = (ic, label, onclick, cls) => h('button', { class: 'pill press' + (cls ? ' ' + cls : ''), onclick: tap(onclick) }, icon(ic), label);
  const orb = (ic, label, onclick, extra) =>
    h('button', { class: 'orb press', onclick: tap(onclick) }, h('span', { class: 'c' }, icon(ic)), h('span', { class: 'lbl' }, label, extra || null));
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

  // A single input with a labelled confirm button beside it.
  function inlineInput(attrs, label, onsubmit) {
    const input = h('input', Object.assign({ autocomplete: 'off', enterkeyhint: 'done' }, attrs));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') onsubmit(input.value); });
    return { el: h('div', { class: 'inline' }, input, h('button', { class: 'square press', onclick: tap(() => onsubmit(input.value)) }, icon('check'), label || 'Save')), input };
  }

  function steps(i, n) {
    const bars = [];
    for (let k = 1; k <= n; k++) bars.push(h('span', { class: 'bar' + (k <= i ? ' on' : '') }));
    return h('div', { class: 'steps', role: 'progressbar', 'aria-valuemin': '1', 'aria-valuemax': String(n), 'aria-valuenow': String(i) },
      h('div', { class: 'bars' }, bars), h('span', {}, 'Step ' + i + ' of ' + n));
  }

  function toast(msg, ic) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = h('div', { class: 'toast', role: 'status' }, ic ? icon(ic) : null, msg);
    // Sit just below the top bar and reminder strip so neither is covered.
    const anchor = app.querySelector('.reminder-slot:not(:empty)') || app.querySelector('.topbar');
    if (anchor) t.style.top = Math.round(anchor.getBoundingClientRect().bottom + 8) + 'px';
    document.body.append(t);
    setTimeout(() => t.remove(), 3500);
  }

  // Bottom sheet with a title and a Close button; Escape closes it too.
  function sheet(name, title, build, onClose) {
    const close = () => {
      scrim.remove();
      panel.remove();
      document.removeEventListener('keydown', onKey);
      if (UI.sheet === name) { UI.sheet = null; saveUI(); }
      if (onClose) onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const scrim = h('div', { class: 'scrim', onclick: close });
    const panel = h('div', { class: 'sheet', role: 'dialog', 'aria-label': title },
      h('div', { class: 'sheet-head' }, h('h2', {}, title), navBtn('x', 'Close', close)),
      build(close));
    document.body.append(scrim, panel);
    document.addEventListener('keydown', onKey);
    UI.sheet = name;
    saveUI();
    applyDrafts(panel);
    const inp = panel.querySelector('input,textarea');
    if (inp) setTimeout(() => inp.focus(), 50);
  }

  function applyPrefs() {
    const root = document.documentElement;
    if (S && S.prefs.theme !== 'auto') root.setAttribute('data-theme', S.prefs.theme);
    else root.removeAttribute('data-theme');
    document.body.classList.toggle('focus-mode', !!(S && S.prefs.focus));
    document.body.classList.toggle('no-motion', !!(S && S.prefs.motion === 'off'));
  }

  // ---------- render ----------

  function render() {
    clearInterval(timer);
    timer = null;
    // A confirmation belongs to the screen it was shown on; actions show theirs after rendering.
    document.querySelectorAll('.sheet,.scrim,.toast').forEach((x) => x.remove());
    applyPrefs();
    const screen = screenFor();
    const bar = screen.querySelector('.topbar');
    const quietHome = view.name === 'home' && !C.currentAttempt(S);
    if (bar && view.name !== 'recover' && !quietHome) bar.after(reminderStrip());
    app.replaceChildren(screen);
    applyDrafts(app);
    UI.view = RESUMABLE.has(view.name) ? view : null;
    saveUI();
    window.scrollTo(0, 0);
    if (view.after) view.after();
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
      case 'today': return progressHub();
      case 'progress': return progressHub();
      case 'goals': return goalsScreen();
      case 'goal': return goalEditScreen();
      case 'review': return reviewScreen();
      case 'notes': case 'reminders': case 'saved': return notesScreen();
      case 'settings': case 'backup': return settingsScreen();
      default: return homeScreen();
    }
  }

  // ---------- game layer: points, levels, streaks and badges, shown after Finish and in Progress ----------

  function newBadges() {
    return game() ? C.checkMilestones(S, now()) : [];
  }

  function switchRow(ic, title, desc, on, onToggle) {
    return h('button', { class: 'switch-row press', role: 'switch', 'aria-checked': String(!!on), onclick: tap(onToggle) },
      icon(ic), h('div', { class: 'grow' }, h('div', {}, title), h('div', { class: 'muted' }, desc)), h('span', { class: 'switch' }));
  }

  // ---------- reminder strip: pinned, still, changes only when tapped ----------

  function reminderStrip() {
    const slot = h('div', { class: 'reminder-slot hide-in-focus' });
    const paint = () => {
      const cur = C.currentReminder(S);
      if (!cur) return slot.replaceChildren();
      const more = cur.total > 1;
      slot.replaceChildren(h('button', {
        class: 'reminder press',
        'aria-label': 'Reminder ' + cur.position + ' of ' + cur.total + ': ' + cur.reminder.text + (more ? '. Tap for the next one.' : ''),
        onclick: tap(() => { if (!more) return go('reminders'); C.nextReminder(S); save(); paint(); }),
      },
      icon('message'),
      h('span', { class: 'grow' }, cur.reminder.text),
      h('span', { class: 'muted' }, more ? cur.position + ' of ' + cur.total : 'Edit')));
    };
    paint();
    return slot;
  }

  // ---------- home ----------

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
    const detail = [cp ? 'Saved place: ' + cp : '', dl].filter(Boolean).join(' · ');
    const startHint = C.isUrl(rec.resource) ? 'Opens your link' : !rec.resource && !rec.resourceAsked ? 'Asks where the material is, once' : rec.resource ? 'Shows: ' + rec.resource : '';

    // Home shows only the task and Start; everything else lives under More.
    const task = h('div', { class: 'task stack' },
      h('h1', {}, g.name),
      h('p', { class: 'action' }, rec.text),
      detail ? h('p', { class: 'muted' }, detail) : null);
    enableSwipe(task, () => go('another'));

    return h('section', { class: 'screen' },
      topbar(null, null),
      notices(),
      h('div', { class: 'center' },
        welcome === 'back' || welcome === 'long' ? h('p', { class: 'muted', style: 'text-align:center;margin-bottom:10px' }, 'Welcome back') : null,
        task,
        h('div', { class: 'stack', style: 'margin-top:36px' }, bigButton('play', 'Start', startHint, () => onStart(rec), true))),
      h('div', { class: 'bottom stack hide-in-focus' }, link2('Not this one', () => go('another'))));
  }

  const link2 = (label, onclick) => h('button', { class: 'textlink press', onclick: tap(onclick) }, label, ' →');

  // Horizontal swipe on the card; vertical scrolling is left alone. Buttons offer the same action.
  function enableSwipe(el, onSwipe) {
    let x0 = null, y0 = 0, dx = 0;
    el.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; dx = 0; el.classList.add('dragging'); });
    el.addEventListener('pointermove', (e) => {
      if (x0 == null) return;
      dx = e.clientX - x0;
      if (Math.abs(e.clientY - y0) > Math.abs(dx)) return;
      el.style.transform = 'translateX(' + dx + 'px)';
    });
    const end = () => {
      if (x0 == null) return;
      x0 = null;
      el.classList.remove('dragging');
      if (Math.abs(dx) > 90) {
        buzz();
        el.style.transform = 'translateX(' + (dx > 0 ? 110 : -110) + '%)';
        el.style.opacity = '0';
        setTimeout(onSwipe, 250);
      } else {
        el.style.transform = '';
      }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  function notices() {
    const out = [];
    const note = (ic, text, ...buttons) => h('div', { class: 'note' }, icon(ic), h('div', { class: 'grow' }, text), ...buttons);
    const tl = (label, fn) => h('button', { class: 'textlink press', onclick: tap(fn) }, label);
    if (updateReady) {
      out.push(note('refresh', 'A new version of the app is ready.',
        tl('Update now', () => location.reload())));
      return out; // one notice at a time
    }
    for (const g of C.passedDeadlines(S, now())) {
      out.push(note('flag', (g.deadlineLabel || 'Deadline') + ' for ' + g.name + ' was ' + C.formatDate(g.deadline) + '.',
        tl('Change date', () => go('goal', { goalId: g.id })),
        tl('Remove date', () => { act(() => { g.deadline = null; g.deadlineLabel = ''; }); toast('Date removed', 'check'); })));
    }
    const day = C.dueReview(S, now());
    if (day) {
      out.push(note('chart', 'A two-minute look back is ready.',
        tl('Open', () => go('review', { day })),
        tl('Not now', () => act(() => S.reviewsSeen.push(day)))));
    }
    return out.slice(0, 1); // one notice at a time
  }

  function onStart(a) {
    if (!a.resource && !a.resourceAsked) return go('resource', { actionId: a.id });
    doStart(a);
  }

  function doStart(a) {
    welcome = 'normal';
    clearDrafts();
    const att = C.start(S, a.id, now());
    if (C.isUrl(a.resource)) {
      window.open(a.resource.trim(), '_blank', 'noopener');
      C.recordLaunch(S, att.id, now());
    }
    newBadges();
    save();
    go('home');
    toast('Started', 'play');
  }

  // START asks for a missing resource once.
  function resourceScreen() {
    const a = C.actionById(S, view.actionId);
    if (!a) return homeScreen();
    const g = C.goalById(S, a.goalId);
    const inp = inlineInput({ id: 'res', placeholder: 'Link, or where it is' }, 'Save and start', (v) => {
      a.resource = v.trim();
      a.resourceAsked = true;
      doStart(a);
    });
    return h('section', { class: 'screen' },
      topbar(back(), 'Material'),
      h('div', { class: 'center stack' },
        emoji(g),
        h('h2', { style: 'margin-top:14px' }, 'Where is the material?'),
        h('p', { class: 'muted', style: 'margin:-6px 0 16px' }, 'Asked once. A link opens automatically next time.'),
        h('div', { style: 'width:100%' }, inp.el),
        h('div', { class: 'actions-row' }, pill('arrow', 'Start without material', () => { a.resourceAsked = true; doStart(a); }, 'quiet'))));
  }

  function askNextScreen(g) {
    const inp = inlineInput({ id: 'next', placeholder: 'e.g. Open chapter 3' }, 'Save', (v) => {
      if (!v.trim()) return inp.input.focus();
      act(() => C.setNextStep(S, g.id, v));
      toast('Next step saved', 'check');
    });
    return h('section', { class: 'screen' },
      topbar(null, null),
      h('div', { class: 'center stack' },
        emoji(g),
        h('h1', { style: 'margin:14px 0 6px' }, g.name),
        h('p', { class: 'muted', style: 'margin:0 0 16px' }, 'What should open next time?'),
        h('div', { style: 'width:100%' }, inp.el),
        h('div', { class: 'actions-row' },
          pill('clock', 'Ask me later', () => { askNextDismissed = true; render(); }, 'quiet'),
          pill('archive', 'Move goal to later', () => { act(() => C.setGoalStatus(S, g.id, 'later')); toast('Moved to later', 'archive'); }, 'quiet'))));
  }

  function emptyScreen() {
    const resting = S.goals.filter((g) => g.status !== 'active');
    const activeNoStep = C.goalsNeedingNext(S);
    return h('section', { class: 'screen' },
      topbar(null, null),
      h('div', { class: 'center' },
        h('div', { class: 'stack' },
          h('div', { style: 'font-size:52px' }, '🌱'),
          h('h2', { style: 'margin-top:10px' }, S.goals.length ? 'Nothing active right now' : 'What would you like to start?'),
          bigButton('plus', 'Add a goal', null, () => go('goal', { goalId: null }))),
        activeNoStep.length ? h('div', { class: 'spaced' },
          h('div', { class: 'section-label' }, 'Needs a next step'),
          h('div', { class: 'list' }, activeNoStep.map((g) => goalRow(g, 'Tap to choose its next step', () => act(() => { askNextDismissed = false; g.needsNext = true; }))))) : null,
        resting.length ? h('div', { class: 'spaced' },
          h('div', { class: 'section-label' }, 'Resting goals'),
          h('div', { class: 'list' }, resting.map((g) => goalRow(g, 'Tap to make active again', () => { act(() => C.setGoalStatus(S, g.id, 'active')); toast(g.name + ' is active', 'check'); })))) : null));
  }

  function goalRow(g, sub, onclick, trailing) {
    return h('button', { class: 'row-item press' + (g.status !== 'active' ? ' dim' : ''), onclick: tap(onclick) },
      emoji(g, 'sm'),
      h('div', { class: 'grow' }, h('div', { class: 't' }, g.name), sub ? h('div', { class: 's' }, sub) : null),
      trailing || null);
  }

  function longAbsenceScreen() {
    const active = S.goals.filter((g) => g.status === 'active');
    const choice = {};
    active.forEach((g) => { choice[g.id] = 'active'; });
    const rows = active.map((g) => {
      const btn = h('button', { class: 'row-item press', role: 'switch' });
      const paint = () => {
        const kept = choice[g.id] === 'active';
        btn.setAttribute('aria-checked', String(kept));
        btn.classList.toggle('dim', !kept);
        btn.replaceChildren(emoji(g, 'sm'), h('div', { class: 'grow' }, h('div', { class: 't' }, g.name), h('div', { class: 's' }, kept ? 'Keep active' : 'Move to later')),
          h('span', { class: 'switch' }));
      };
      btn.onclick = tap(() => { choice[g.id] = choice[g.id] === 'active' ? 'later' : 'active'; paint(); });
      paint();
      return btn;
    });
    return h('section', { class: 'screen' },
      topbar(null, 'Welcome back', navBtn('arrow', 'Skip', () => { longAbsenceHandled = true; render(); })),
      h('div', { class: 'center' },
        h('div', { class: 'stack' }, h('h2', {}, 'Which goals still fit right now?'),
          h('p', { class: 'muted', style: 'margin:-6px 0 18px' }, 'Optional. Switch off any that can wait. They stay saved.')),
        h('div', { class: 'list' }, rows),
        primary('Save and continue', () => {
          longAbsenceHandled = true;
          act(() => active.forEach((g) => { if (choice[g.id] !== 'active') C.setGoalStatus(S, g.id, choice[g.id]); }));
          toast('Saved', 'check');
        }, 'check')));
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

    // Park a thought in a bottom sheet; the label counts what was parked.
    const parkSlot = h('span', { style: 'display:contents' });
    const paintPark = () => {
      const n = C.thoughtsFor(S, att.id).length;
      parkSlot.replaceChildren(orb('bulb', 'Park a thought', openPark, n ? h('span', { class: 'count' }, ' (' + n + ')') : null));
    };
    function openPark() {
      sheet('park', 'Park a thought', (close) => {
        const inp = inlineInput({ id: 'park', placeholder: 'What came to mind?' }, 'Park it', (v) => {
          if (!C.parkThought(S, v, att.id, now())) return inp.input.focus();
          save();
          delete UI.drafts[draftKey('park')];
          close();
          paintPark();
          toast('Parked. You will see it when you finish', 'bulb');
        });
        return [h('p', { class: 'muted', style: 'margin-bottom:12px' }, 'It is saved for after, so you can get back to work.'), inp.el];
      });
    }
    paintPark();

    const showCheckin = () => {
      if (!g.checkinMinutes || att.checkinShown) return;
      if (now() - since < g.checkinMinutes * 60000) return;
      const dismiss = () => { att.checkinShown = true; save(); checkinSlot.replaceChildren(); };
      checkinSlot.replaceChildren(h('div', { class: 'note' }, icon('clock'),
        h('div', { class: 'grow' }, g.checkinMinutes + ' minutes in.'),
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
      orbs.push(orb('open', 'Open link', () => {
        window.open(a.resource.trim(), '_blank', 'noopener');
        C.recordLaunch(S, att.id, now());
        save();
      }));
    }
    orbs.push(parkSlot);
    orbs.push(orb('shuffle', 'Switch task', () => go('another', { switching: true })));

    if (UI.sheet === 'park') view.after = () => { delete view.after; openPark(); };

    return h('section', { class: 'screen', style: hueStyle(g) },
      topbar(h('span'), h('span', {}, h('span', { class: 'dot-static' }), ' In progress')),
      h('div', { class: 'center stack' },
        h('p', { class: 'muted' }, g.name),
        h('h2', { style: 'margin:4px 0 2px' }, a.text),
        h('div', { class: 'chips', style: 'margin-top:8px' },
          cp ? h('span', { class: 'chip' }, icon('bookmark'), cp) : null,
          a.resource && !C.isUrl(a.resource) ? h('span', { class: 'chip' }, icon('link'), a.resource) : null,
          null),
        h('div', { class: 'elapsed', 'aria-label': mins() + ' minutes since you started' }, elapsedNum, h('small', {}, 'min')),
        h('p', { class: 'muted', style: 'margin:0 0 20px' }, 'since you started'),
        checkinSlot,
        h('div', { class: 'orbs' }, orbs)),
      h('div', { class: 'bottom stack', style: 'margin-top:20px' },
        bigButton('check', 'Finish', 'Saves how it went', () => go('finish', { attemptId: att.id }))));
  }

  // ---------- finish (at most two taps, with a step indicator) ----------

  function finishScreen() {
    const att = S.attempts.find((x) => x.id === view.attemptId);
    if (!att || att.state === 'finished') return homeScreen();
    const a = C.actionById(S, att.actionId);
    const g = C.goalById(S, att.goalId);
    const step = view.step;
    const hasThoughts = C.thoughtsFor(S, att.id).length > 0;
    const total = hasThoughts ? 3 : 2;

    const complete = (outcome, opts) => {
      const levelBefore = C.levelInfo(C.totalPoints(S)).level;
      const r = C.finish(S, att.id, outcome, opts, now());
      clearDrafts();
      if (!r.changed) return go('home');
      const badges = newBadges();
      save();
      const levelAfter = C.levelInfo(C.totalPoints(S)).level;
      const afterView = {
        outcome, goalId: att.goalId, nextId: r.next ? r.next.id : null, deferred: !!(opts && opts.deferred),
        earned: C.attemptPoints(att), milestones: badges.map((m) => m.icon + ' ' + m.name),
        levelUp: levelAfter > levelBefore ? levelAfter : 0,
      };
      if (C.thoughtsFor(S, att.id).length) go('thoughts', { attemptId: att.id, total, then: afterView });
      else go('after', afterView);
    };

    let body;
    if (!step) {
      const hasNext = C.goalActions(S, a.goalId).some((x) => !x.done && x.id !== a.id);
      const o = (k, fn) => tile(OUTCOME[k].icon, OUTCOME[k].label, fn, { tone: OUTCOME[k].tone });
      body = [
        steps(1, total),
        h('h2', { style: 'text-align:center' }, 'How did it go?'),
        h('div', { class: 'tiles three' },
          o('finished', () => (hasNext ? complete('finished') : go('finish', { attemptId: att.id, step: 'next' }))),
          o('progress', () => go('finish', { attemptId: att.id, step: 'progress' })),
          o('stuck', () => go('finish', { attemptId: att.id, step: 'stuck' }))),
        h('div', { class: 'actions-row' }, pill('play', 'Not finished: back to it', () => { clearDrafts(); go('home'); }, 'quiet')),
      ];
    } else if (step === 'progress') {
      const inp = inlineInput({ id: 'pos', value: C.checkpointFor(S, a.id), placeholder: 'e.g. 18:10, page 4' }, 'Save', (v) => complete('progress', { position: v }));
      body = [steps(2, total), h('div', { class: 'stack' }, icon('bookmark'), h('h2', { style: 'margin-top:10px' }, 'Where did you stop?')), inp.el];
    } else if (step === 'next') {
      const inp = inlineInput({ id: 'next', placeholder: 'e.g. Start lecture 5' }, 'Save', (v) => complete('finished', { nextText: v, deferred: !v.trim() }));
      body = [
        steps(2, total),
        h('div', { class: 'stack' }, icon('arrow'), h('h2', { style: 'margin-top:10px' }, 'What should open next time?')),
        inp.el,
        h('div', { class: 'actions-row' }, pill('clock', 'Decide next time', () => complete('finished', { deferred: true }), 'quiet')),
      ];
    } else if (step === 'stuck') {
      body = [
        steps(2, total),
        h('h2', { style: 'text-align:center' }, 'What got in the way?'),
        h('div', { class: 'tiles' }, OBSTACLES.map((o) => tile(o.icon, o.label, () => complete('stuck', { obstacle: o.key })))),
        h('div', { class: 'actions-row' }, pill('arrow', 'Skip this question', () => complete('stuck', {}), 'quiet')),
      ];
    }
    const backTo = step ? navBtn('back', 'Back', () => { clearDrafts(); go('finish', { attemptId: att.id }); }) : back();
    return h('section', { class: 'screen', style: hueStyle(g) }, topbar(backTo, g.icon + ' Finish'), h('div', { class: 'center' }, body));
  }

  function thoughtsScreen() {
    const list = C.thoughtsFor(S, view.attemptId);
    if (!list.length) {
      view = Object.assign({ name: 'after' }, view.then);
      return afterScreen();
    }
    return h('section', { class: 'screen' },
      topbar(null, 'Finish'),
      h('div', { class: 'center' },
        steps(view.total || 3, view.total || 3),
        h('div', { class: 'stack' }, icon('bulb'), h('h2', { style: 'margin-top:10px' }, list.length === 1 ? 'You parked 1 thought' : 'You parked ' + list.length + ' thoughts')),
        h('div', { class: 'list' }, list.map((t) => thoughtRow(t, true))),
        primary('Keep the rest for later', () => { act(() => list.forEach((t) => C.keepThought(S, t.id))); toast('Kept in Thoughts', 'check'); }, 'check')));
  }

  function thoughtRow(t, withKeep) {
    return h('div', { class: 'row-item col' },
      h('div', {}, t.text),
      h('div', { class: 'btns' },
        pill('target', 'Make a goal', () => { act(() => C.thoughtToGoal(S, t.id, now())); toast('Added to goals for later', 'target'); }, 'small'),
        withKeep ? pill('archive', 'Keep', () => { act(() => C.keepThought(S, t.id)); toast('Kept in Thoughts', 'check'); }, 'small') : null,
        pill('trash', 'Delete', () => { act(() => C.deleteThought(S, t.id)); toast('Deleted', 'trash'); }, 'small')));
  }

  // One line of points and streak, plus any new badge or level.
  function rewardsPanel(v) {
    if (!game()) return null;
    const st = C.streaks(S, now());
    const parts = ['+' + (v.earned || 0) + ' points'];
    if (st.current) parts.push('🔥 ' + st.current + '-day streak');
    return h('div', { class: 'rewards-line hide-in-focus' },
      h('p', {}, parts.join(' · ')),
      (v.milestones || []).map((m) => h('p', {}, 'New badge: ' + m)),
      v.levelUp ? h('p', {}, '⭐ Level ' + v.levelUp + ': ' + C.levelInfo(C.totalPoints(S)).name) : null);
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
        topbar(null, null),
        h('div', { class: 'center' },
          h('div', { class: 'stack' }, h('div', { style: 'font-size:48px' }, '🌤️'), h('h2', { style: 'margin-top:8px' }, 'Saved. That is fine'),
            h('p', { class: 'muted', style: 'margin:-6px 0 20px' }, 'Nothing changed. It will be here when you want it.')),
          rewardsPanel(v),
          h('div', { class: 'tiles three' },
            tile('smaller', 'Make it smaller', () => go('smaller', { actionId: v.nextId })),
            tile('shuffle', 'Pick another', () => go('another')),
            tile('moon', 'Rest for now', () => { doneForNow(); toast('Rest is fine. See you later', 'moon'); }))));
    }

    const cp = v.outcome === 'progress' && next ? C.checkpointFor(S, next.id) : '';
    const canContinue = next && C.goalById(S, next.goalId) && C.goalById(S, next.goalId).status === 'active';
    const mark = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mark.setAttribute('viewBox', '0 0 100 100');
    mark.setAttribute('class', 'done-mark');
    mark.setAttribute('aria-hidden', 'true');
    mark.innerHTML = '<circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="5"/><path d="M30 52 44 66 71 37" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>';
    const continueLabel = v.outcome === 'progress' ? 'Continue this step' : 'Start the next step';

    return h('section', { class: 'screen', style: hueStyle(g) },
      topbar(null, null),
      h('div', { class: 'center stack' },
        mark,
        h('h2', { role: 'status' }, v.outcome === 'progress' ? 'Saved your place' : 'Step saved as done'),
        h('div', { class: 'chips', style: 'margin-top:0' },
          cp ? h('span', { class: 'chip' }, icon('bookmark'), 'Restart at: ' + cp) : null,
          v.outcome === 'finished' && next ? h('span', { class: 'chip' }, icon('arrow'), 'Next: ' + next.text) : null,
          v.outcome === 'finished' && !next ? h('span', { class: 'chip' }, icon('clock'), 'Next step: decide next time') : null),
        rewardsPanel(v),
        h('div', { class: 'actions-row', style: 'margin-top:30px' },
          canContinue ? h('button', { class: 'primary press', style: 'width:auto;padding:14px 20px', onclick: tap(() => onStart(next)) }, icon('play'), continueLabel) : null,
          pill('moon', 'Done for now', doneForNow))));
  }

  // ---------- another task / smaller ----------

  function anotherScreen() {
    const rec = C.actionById(S, S.recommendation.actionId);
    const alts = C.alternatives(S, now());
    const recGoal = rec && C.goalById(S, rec.goalId);
    const choose = (a) => {
      act(() => { C.chooseAlternative(S, a.id, now()); view = { name: 'home' }; });
      toast('Switched to ' + goalName(a.goalId), 'shuffle');
    };
    const altTiles = alts.map((a) => {
      const g = C.goalById(S, a.goalId);
      return tile(emoji(g, 'sm'), g.name, () => choose(a), { wide: true, sub: a.text, style: hueStyle(g) });
    });
    return h('section', { class: 'screen' },
      topbar(back(), view.switching ? 'Switch task' : 'Not this one'),
      h('div', { class: 'center' },
        alts.length
          ? h('div', { class: 'tiles one' }, altTiles)
          : h('div', { class: 'stack' }, h('div', { style: 'font-size:44px' }, '🍃'), h('h2', { style: 'margin-top:8px' }, 'That is everything for now')),
        h('div', { class: 'tiles three spaced' },
          rec ? tile('smaller', 'Make it smaller', () => go('smaller', { actionId: rec.id })) : null,
          recGoal ? tile('pause', 'Pause goal', () => {
            act(() => { C.setGoalStatus(S, recGoal.id, 'paused'); view = { name: 'home' }; });
            toast(recGoal.name + ' paused. Resume it in Goals', 'pause');
          }, { sub: recGoal.name }) : null,
          !alts.length ? tile('moon', 'Rest for now', () => { act(() => { C.endSession(S); view = { name: 'home' }; }); toast('Rest is fine. See you later', 'moon'); }) : null,
          !alts.length && S.recommendation.exclusions.length ? tile('refresh', 'Show all again', () => { act(() => { C.freshRound(S, now()); view = { name: 'home' }; }); toast('All tasks are back', 'refresh'); }) : null)));
  }

  function goalName(id) {
    const g = C.goalById(S, id);
    return g ? g.name : '';
  }

  function smallerScreen() {
    const a = C.actionById(S, view.actionId || S.recommendation.actionId);
    if (!a) return homeScreen();
    const g = C.goalById(S, a.goalId);
    const apply = (val) => {
      act(() => {
        C.makeSmaller(S, a.id, val);
        const cur = C.currentAttempt(S);
        if (cur && cur.actionId !== a.id) cur.state = 'suspended';
        S.recommendation.actionId = a.id;
        view = { name: 'home' };
      });
      toast('Smaller version saved: ' + val, 'check');
    };
    const suggestions = [['👀', 'Just open it'], ['⏱️', 'Two minutes'], ['📖', 'Read one line'], ['🤏', 'The tiniest first bit']];
    const inp = inlineInput({ id: 'small', placeholder: 'Or write your own' }, 'Save', (v) => v.trim() && apply(v.trim()));
    return h('section', { class: 'screen', style: hueStyle(g) },
      topbar(back(), g.icon + ' Make it smaller'),
      h('div', { class: 'center' },
        h('p', { class: 'muted', style: 'text-align:center;margin-bottom:16px' }, 'Pick the smallest useful start. It saves straight away.'),
        h('div', { class: 'tiles' }, suggestions.map(([e, label]) => tile(h('div', { style: 'font-size:28px' }, e), label, () => apply(label)))),
        h('div', { class: 'spaced' }, inp.el)));
  }

  // ---------- secondary screens ----------

  function menuScreen() {
    const kept = S.thoughts.filter((t) => t.status === 'kept').length;
    const t = C.today(S, now());
    return h('section', { class: 'screen' },
      topbar(back(), 'More', null),
      h('div', { class: 'tiles' },
        tile('target', 'Goals', () => go('goals'), { sub: S.goals.filter((g) => g.status === 'active').length + ' active' }),
        tile('calendar', 'Progress', () => go('progress'), { sub: t.starts ? t.starts + ' started today' : 'Today and look back' }),
        tile('message', 'Notes', () => go('notes'), { sub: S.reminders.length + ' reminders, ' + kept + ' thoughts' }),
        tile('sliders', 'Settings', () => go('settings'), { sub: 'Display and backup' })),
      h('p', { class: 'muted', style: 'text-align:center;margin-top:18px' }, 'App version ' + APP_VERSION),
      updateReady ? h('div', { class: 'actions-row' }, pill('refresh', 'Update to the new version', () => location.reload())) : null);
  }

  function notesScreen() {
    const add = inlineInput({ id: 'rem-new', placeholder: 'e.g. Drink water first' }, 'Add', (v) => {
      if (!v.trim()) return add.input.focus();
      act(() => C.addReminder(S, v));
      toast('Reminder added', 'check');
    });
    const edit = (r) => { UI.sheetFor = r.id; sheet('rem-edit', 'Edit reminder', (close) => {
      const inp = inlineInput({ id: 'rem-edit', value: r.text }, 'Save', (v) => {
        if (!v.trim()) return inp.input.focus();
        delete UI.drafts[draftKey('rem-edit')];
        close();
        act(() => C.updateReminder(S, r.id, v));
        toast('Reminder saved', 'check');
      });
      return [inp.el];
    }); };
    const reopen = UI.sheet === 'rem-edit' && S.reminders.find((r) => r.id === UI.sheetFor);
    if (reopen) view.after = () => { delete view.after; edit(reopen); };
    const rows = S.reminders.map((r, i) => h('div', { class: 'row-item col' },
      h('div', {}, r.text),
      h('div', { class: 'btns' },
        pill('pencil', 'Edit', () => edit(r), 'small'),
        i > 0 ? pill('up1', 'Move up', () => { act(() => C.moveReminder(S, r.id, -1)); toast('Moved up', 'up1'); }, 'small') : null,
        i < S.reminders.length - 1 ? pill('down1', 'Move down', () => { act(() => C.moveReminder(S, r.id, 1)); toast('Moved down', 'down1'); }, 'small') : null,
        pill('trash', 'Delete', () => { act(() => C.deleteReminder(S, r.id)); toast('Reminder deleted', 'trash'); }, 'small'))));
    const kept = S.thoughts.filter((t) => t.status === 'kept');
    return h('section', { class: 'screen' },
      topbar(back('menu'), 'Notes'),
      h('div', { class: 'section-label', style: 'margin-top:4px' }, 'Reminders'),
      h('p', { class: 'muted', style: 'margin-bottom:12px' }, 'Short notes in your own words. One shows at the top of every screen except Home; tap it for the next.'),
      add.el,
      rows.length ? h('div', { class: 'list spaced' }, rows) : null,
      h('div', { class: 'section-label' }, 'Saved thoughts'),
      kept.length ? h('div', { class: 'list' }, kept.map((t) => thoughtRow(t, false))) : h('p', { class: 'muted' }, 'Thoughts you park and keep appear here.'));
  }

  function settingsScreen() {
    const seg = (key, options) => h('div', { class: 'seg', role: 'group' }, options.map(([val, label]) =>
      h('button', { 'aria-pressed': String(S.prefs[key] === val), onclick: tap(() => { act(() => { S.prefs[key] = val; }); toast('Theme: ' + label, 'check'); }) }, label)));
    const focusRow = h('button', { class: 'switch-row press', role: 'switch', 'aria-checked': String(!!S.prefs.focus), onclick: tap(() => {
      act(() => { S.prefs.focus = !S.prefs.focus; });
      toast(S.prefs.focus ? 'Focus mode on' : 'Focus mode off', 'eye');
    }) },
    icon('eye'),
    h('div', { class: 'grow' }, h('div', {}, 'Focus mode'), h('div', { class: 'muted' }, 'Hides notices, reminders and the Not this one link. Only the task and Start stay.')),
    h('span', { class: 'switch' }));
    const gameRow = switchRow('target', 'Points and streaks', 'Points, levels, a streak and badges, shown after Finish and under Progress.', S.prefs.game, () => {
      act(() => { S.prefs.game = !S.prefs.game; });
      toast(S.prefs.game ? 'Game layer on' : 'Game layer off', 'target');
    });
    return h('section', { class: 'screen' },
      topbar(back('menu'), 'Settings'),
      h('label', { class: 'f' }, icon('sun'), 'Theme'),
      seg('theme', [['auto', 'Match phone'], ['light', 'Light'], ['dark', 'Dark']]),
      h('div', { class: 'spaced' }, focusRow),
      h('div', { class: 'spaced' }, switchRow('pause', 'Turn off animation', 'Stops screen fades and the swipe movement. Your phone\'s reduce-motion setting does this too.', S.prefs.motion === 'off', () => {
        act(() => { S.prefs.motion = S.prefs.motion === 'off' ? 'on' : 'off'; });
        toast(S.prefs.motion === 'off' ? 'Animation off' : 'Animation on', 'pause');
      })),
      h('div', { class: 'spaced' }, gameRow),
      h('div', { class: 'section-label', style: 'margin-top:28px' }, 'Backup'),
      backupSection());
  }

  function progressHub() {
    const lv = C.levelInfo(C.totalPoints(S));
    const st = C.streaks(S, now());
    const pct = lv.next ? Math.round(((lv.points - lv.floor) / (lv.next - lv.floor)) * 100) : 100;
    const ms = C.milestoneList(S).filter((m) => m.earnedAt);
    const stats = C.reviewStats(S, now());
    return h('section', { class: 'screen' },
      topbar(back('menu'), 'Progress'),
      game() ? h('div', { class: 'panel' },
        h('div', { class: 'lvl-head' }, h('b', {}, '⭐ Level ' + lv.level + ' · ' + lv.name), h('span', { class: 'muted' }, lv.points + ' points')),
        h('div', { class: 'lvl-bar', role: 'progressbar', 'aria-label': 'Progress to next level', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100' }, h('span', { style: 'width:' + pct + '%' })),
        h('p', {}, st.current ? '🔥 ' + st.current + '-day streak (best ' + st.best + ')' : '🔥 Start today for a streak'),
        ms.length ? h('p', { class: 'muted' }, 'Badges: ' + ms.map((m) => m.icon + ' ' + m.name).join(', ')) : null) : null,
      h('div', { class: 'section-label' }, 'Today'),
      todayList(),
      h('div', { class: 'section-label' }, 'Look back'),
      h('table', { class: 'stats' },
        h('thead', {}, h('tr', {}, ['Week', 'Opened', 'Started', 'Got going'].map((x) => h('th', {}, x)))),
        h('tbody', {}, stats.weeks.map((w) => h('tr', {}, [w.week, w.opens, w.starts, w.began].map((x) => h('td', {}, String(x))))))),
      h('div', { class: 'actions-row' }, pill('pencil', 'Answer the look-back questions', () => go('review'))));
  }

  function todayList() {
    const t = C.today(S, now());
    const label = (i) => (i.outcome ? OUTCOME[i.outcome].label : i.state === 'current' ? 'In progress' : 'Set aside');
    const ic = (i) => (i.outcome ? OUTCOME[i.outcome].icon : i.state === 'current' ? 'play' : 'pause');
    if (!t.items.length) return h('p', { class: 'muted' }, 'Nothing yet today. That is fine.');
    return h('div', { class: 'list' }, t.items.map((i) => {
      const g = S.goals.find((x) => x.name === i.goal);
      return h('div', { class: 'row-item' + (i.outcome ? ' ' + OUTCOME[i.outcome].tone : '') }, emoji(g, 'sm'),
        h('div', { class: 'grow' }, h('div', { class: 't' }, i.goal),
          h('div', { class: 's' }, new Date(i.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + label(i))),
        icon(ic(i)));
    }));
  }

  function todayScreen() {
    return h('section', { class: 'screen' }, topbar(back('menu'), 'Today'), todayList());
  }

  function goalsScreen() {
    const groups = [['active', 'Active'], ['paused', 'Paused'], ['later', 'Later']];
    return h('section', { class: 'screen' },
      topbar(back('menu'), 'Goals'),
      groups.map(([st, title]) => {
        const gs = S.goals.filter((g) => g.status === st);
        if (!gs.length) return null;
        return h('div', {},
          h('div', { class: 'section-label' }, title),
          h('div', { class: 'list' }, gs.map((g) => {
            const a = C.currentAction(S, g.id);
            return goalRow(g, a ? a.text : 'No next step yet', () => go('goal', { goalId: g.id }), h('span', { class: 'muted', style: 'display:inline-flex;gap:4px;align-items:center' }, icon('pencil'), 'Edit'));
          })));
      }),
      h('div', { class: 'spaced' }, primary('Add a goal', () => go('goal', { goalId: null }), 'plus')));
  }

  function goalEditScreen() {
    const isNew = !view.goalId;
    const g = isNew ? null : C.goalById(S, view.goalId);
    if (!isNew && !g) return goalsScreen();
    const a = g ? C.currentAction(S, g.id) : null;
    const upcoming = g ? C.goalActions(S, g.id).filter((x) => !x.done && x !== a) : [];
    let pickedIcon = draft('icon') || (g ? g.icon : C.GOAL_ICONS[S.goals.length % C.GOAL_ICONS.length]);
    let pickedHue = draft('hue') != null ? Number(draft('hue')) : g ? g.hue : C.GOAL_HUES[S.goals.length % C.GOAL_HUES.length];

    const preview = h('div', {});
    const paintPreview = () => preview.replaceChildren(emoji({ icon: pickedIcon, hue: pickedHue }));
    paintPreview();
    const iconButtons = C.GOAL_ICONS.map((e) => {
      const b = h('button', { class: 'press', 'aria-pressed': String(e === pickedIcon), 'aria-label': 'Use ' + e + ' as the icon' }, e);
      b.onclick = tap(() => { pickedIcon = e; setDraft('icon', e); iconButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); paintPreview(); });
      return b;
    });
    const hueButtons = C.GOAL_HUES.map((hv, i) => {
      const b = h('button', { class: 'press', style: '--h:' + hv, 'aria-pressed': String(hv === pickedHue), 'aria-label': 'Colour ' + (i + 1) });
      b.onclick = tap(() => { pickedHue = hv; setDraft('hue', String(hv)); hueButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === b))); paintPreview(); });
      return b;
    });

    const name = field('Goal name', 'target', { id: 'g-name', value: g ? g.name : '', placeholder: 'e.g. Automatic Control' });
    const text = field('Next action', 'play', { id: 'g-text', value: a ? a.text : '', placeholder: 'e.g. Watch lecture 4 for five minutes' });
    const res = field('Material (a link opens on Start)', 'link', { id: 'g-res', value: a ? a.resource : '', placeholder: 'Link, or where it is' });
    const cp = field('Restart point', 'bookmark', { id: 'g-cp', value: a ? C.checkpointFor(S, a.id) : '', placeholder: 'e.g. Lecture 4 · 12:40' });
    const small = field('Small version', 'timer', { id: 'g-small', value: a ? a.small : 'Start with five minutes' });
    const target = field('Optional target', 'target', { id: 'g-target', value: a ? a.target : '', placeholder: 'e.g. Around 20 minutes' });
    const later = field('Steps after this (one per line)', 'list', { id: 'g-later', multiline: true, value: upcoming.map((x) => x.text).join('\n') });
    const dl = field('Real deadline date', 'flag', { id: 'g-dl', type: 'date', value: g && g.deadline ? g.deadline : '' });
    const dlLabel = field('Deadline name', 'flag', { id: 'g-dll', value: g ? g.deadlineLabel : '', placeholder: 'e.g. Exam' });
    const status = h('select', { id: 'g-status' },
      ['active', 'paused', 'later'].map((st) => h('option', { value: st, selected: (g ? g.status : 'active') === st }, { active: 'Active', paused: 'Paused', later: 'Later' }[st])));
    const checkin = h('select', { id: 'g-checkin' },
      [0, 15, 20, 25, 30, 45, 60].map((m) => h('option', { value: m, selected: (g && g.checkinMinutes || 0) === m }, m ? 'After ' + m + ' minutes' : 'Off')));

    const onSave = () => {
      const nm = name.input.value.trim();
      const tx = text.input.value.trim();
      if (!nm) { toast('Add a goal name first', 'pencil'); return name.input.focus(); }
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
      toast(isNew ? 'Goal added' : 'Goal saved', 'check');
    };

    // Keep "More options" open if anything inside it has an unsaved draft.
    const moreIds = ['g-small', 'g-target', 'g-dl', 'g-dll', 'g-status', 'g-checkin'];
    const more = h('details', { open: moreIds.some((id) => draft(id) != null) },
      h('summary', {}, icon('sliders'), 'More options: small version, deadline, status'),
      small.el, target.el, dl.el, dlLabel.el,
      h('label', { class: 'f', for: 'g-status' }, icon('pause'), 'Status'), status,
      h('label', { class: 'f', for: 'g-checkin' }, icon('clock'), 'Quiet check-in (a line on screen, never a notification)'), checkin);

    return h('section', { class: 'screen' },
      topbar(back(isNew ? 'home' : 'goals'), isNew ? 'Add a goal' : 'Edit goal'),
      h('div', { class: 'stack' }, preview),
      h('label', { class: 'f' }, 'Icon and colour'),
      h('div', { class: 'picker' }, iconButtons),
      h('div', { class: 'swatches', style: 'margin-top:12px;justify-content:center' }, hueButtons),
      name.el, text.el, res.el,
      // Restart point and later steps stay visible so editing the action never leaves them stale.
      cp.el, h('p', { class: 'muted', style: 'margin-top:6px' }, 'Clear this if you changed the action.'),
      later.el, more,
      h('div', { class: 'spaced' }, primary(isNew ? 'Add goal' : 'Save changes', onSave, 'check')),
      g ? h('div', { class: 'actions-row' }, pill('trash', 'Delete this goal', () => {
        if (!confirm('Delete “' + g.name + '” and all its steps? This cannot be undone.')) return;
        act(() => { C.deleteGoal(S, g.id); view = { name: 'goals' }; });
        toast('Goal deleted', 'trash');
      }, 'quiet')) : null);
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

  function backupSection() {
    const file = h('input', { type: 'file', accept: 'application/json,.json', id: 'imp-file', style: 'display:none' });
    const doImport = (raw) => {
      const r = C.parseState(raw);
      if (!r.state) return toast(r.error || 'That backup looks empty', 'x');
      if (!confirm('Replace everything in the app with this backup? The current data is kept as a fallback copy.')) return;
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
    return h('div', {},
      h('p', { class: 'muted', style: 'margin-bottom:12px' }, 'Everything is stored only on this phone. Save a copy now and then.'),
      h('div', { class: 'tiles' },
        canShare ? tile('share', 'Share backup file', () => {
          const f = new File([exportJson()], backupName(), { type: 'application/json' });
          navigator.share({ files: [f], title: 'Next Step backup' }).then(() => toast('Backup shared', 'check')).catch(() => {});
        }) : null,
        tile('save', 'Download backup file', () => { download(backupName(), exportJson()); toast('Backup downloaded', 'check'); }),
        tile('copy', 'Copy backup text', () => {
          navigator.clipboard.writeText(exportJson()).then(() => toast('Backup copied', 'check'), () => toast('Copy did not work here', 'x'));
        })),
      h('p', { class: 'muted', style: 'margin:16px 0 10px' }, 'Restoring replaces everything currently in the app.'),
      h('div', { class: 'tiles' },
        tile('restore', 'Restore from file', () => file.click()),
        tile('pencil', 'Restore from text', () => sheet('paste', 'Restore from text', (close) => {
          const ta = h('textarea', { id: 'paste', placeholder: 'Paste the backup text here', style: 'min-height:140px' });
          return [ta, h('div', { class: 'spaced' }, primary('Replace data with this backup', () => { close(); doImport(ta.value); }, 'restore'))];
        }))),
      file);
  }

  function reviewScreen() {
    const st = C.reviewStats(S, now());
    const day = view.day;
    const qs = ['When did it help you start?', 'When did you forget it?', 'What would make starting easier?'];
    const inputs = qs.map((q, i) => field(q, null, { id: 'rq' + i, multiline: true }));
    const obstacles = Object.entries(st.obstacles);
    return h('section', { class: 'screen' },
      topbar(back(day ? 'home' : 'progress'), 'Look back'),
      h('p', { class: 'muted', style: 'margin-bottom:12px' }, 'A record, not a score.'),
      h('table', { class: 'stats' },
        h('thead', {}, h('tr', {}, ['Week', 'Opened', 'Link opened', 'Started', 'Got going'].map((x) => h('th', {}, x)))),
        h('tbody', {}, st.weeks.map((w) => h('tr', {}, [w.week, w.opens, w.launches, w.starts, w.began].map((x) => h('td', {}, String(x))))))),
      obstacles.length ? h('div', {},
        h('div', { class: 'section-label' }, 'What got in the way'),
        h('div', { class: 'chips', style: 'justify-content:flex-start' },
          obstacles.map(([k, n]) => {
            const o = OBSTACLES.find((x) => x.key === k);
            return h('span', { class: 'chip' }, icon(o ? o.icon : 'help'), (o ? o.label : k) + ': ' + n);
          }))) : null,
      inputs.map((f) => f.el),
      h('div', { class: 'spaced' }, primary('Save answers', () => {
        act(() => {
          S.reviews = S.reviews || [];
          S.reviews.push({ at: now(), day: day || null, answers: inputs.map((f, i) => ({ q: qs[i], a: f.input.value.trim() })) });
          if (day && !S.reviewsSeen.includes(day)) S.reviewsSeen.push(day);
          view = { name: 'home' };
        });
        toast('Answers saved', 'check');
      }, 'check')));
  }

  function recoverScreen() {
    return h('section', { class: 'screen' },
      h('div', { class: 'center' },
        h('div', { class: 'stack' }, h('div', { style: 'font-size:44px' }, '🧩'), h('h2', { style: 'margin-top:8px' }, 'Saved data could not be opened'),
          h('p', { class: 'muted', style: 'margin:-6px 0 20px' }, view.error)),
        h('div', { class: 'tiles' },
          view.raw != null ? tile('save', 'Download the saved data', () => download('next-step-unreadable.json', view.raw)) : null,
          tile('restore', 'Restore a backup', () => { S = S || C.emptyState(now()); go('backup'); })),
        view.raw != null ? h('div', { class: 'actions-row' }, pill('refresh', 'Start fresh (old data is kept)', () => {
          try { localStorage.setItem(UNREADABLE_PREFIX + Date.now(), view.raw); } catch (e) { return toast('Could not keep a copy, so nothing changed', 'x'); }
          S = C.emptyState(now());
          welcome = C.recordOpen(S, now());
          act(() => { view = { name: 'home' }; });
        }, 'quiet')) : null));
  }

  // ---------- boot ----------

  function boot() {
    loadUI();
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
    C.nextReminder(S);
    // Reopen an unfinished process exactly where it was left.
    const ALWAYS = new Set(['resource', 'finish', 'thoughts']); // mid-process screens
    const hasDraft = UI.view && Object.keys(UI.drafts).some((k) => k.startsWith(vkey(UI.view) + '#'));
    if (UI.view && RESUMABLE.has(UI.view.name) && (ALWAYS.has(UI.view.name) || hasDraft || UI.sheet)) {
      view = UI.view;
      longAbsenceHandled = true;
    }
    save();
    render();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  }

  // Coming back to an already-open app counts as a return.
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hiddenAt = now(); return; }
    if (!S || view.name === 'recover') return;
    if (hiddenAt && now() - hiddenAt > 30 * 60000) {
      askNextDismissed = false;
      C.nextReminder(S);
      const slot = app.querySelector('.reminder-slot');
      if (slot) slot.replaceWith(reminderStrip());
    }
    const w = C.recordOpen(S, now());
    save();
    if (w !== 'normal') { welcome = w; longAbsenceHandled = RESUMABLE.has(view.name); }
    if (['home', 'after'].includes(view.name) && !UI.sheet) render();
  });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
      // Look for a new version whenever the app comes back to the front.
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => {});
    // A new version took over: offer it on Home instead of reloading under you.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || updateReady || !S) return;
      updateReady = true;
      if (view.name === 'home' && !C.currentAttempt(S)) render();
      else toast('A new version is ready. Update from Home or Menu', 'refresh');
    });
  }

  boot();
})();
