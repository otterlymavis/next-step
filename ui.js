// Execution Assistant — screens. All state changes go through Core and are saved immediately.
(function () {
  'use strict';
  const C = window.Core;
  const KEY = 'nextstep.state';
  const PREV_KEY = 'nextstep.state.prev';
  const UNREADABLE_PREFIX = 'nextstep.unreadable.';
  const OBSTACLES = ['Unclear', 'Too big', 'Missing material', 'Not the right moment'];
  const OUTCOME_LABEL = { finished: 'Step finished', progress: 'Made some progress', stuck: "Didn't get going" };

  let S = null;
  let view = { name: 'home' };
  let welcome = 'normal';
  let longAbsenceHandled = false;
  let askNextDismissed = false;
  let timer = null;
  const app = document.getElementById('app');
  const now = () => Date.now();

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
      toast('Could not save just now. Storage may be full or blocked.');
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

  const primary = (label, onclick) => h('button', { class: 'primary', onclick }, label);
  const secondary = (label, onclick, small) => h('button', { class: 'secondary', onclick }, label, small ? h('small', {}, small) : null);
  const link = (label, onclick) => h('button', { class: 'link', onclick }, label);
  const back = (to) => h('button', { class: 'icon-btn', onclick: () => go(to || 'home') }, '‹ Back');
  const topbar = (left, right) => h('div', { class: 'topbar' }, left || h('span'), right || h('span'));
  const menuBtn = () => h('button', { class: 'icon-btn', onclick: () => go('menu') }, 'Menu');

  function field(label, attrs, hint) {
    const tag = attrs.multiline ? 'textarea' : 'input';
    const a = Object.assign({}, attrs);
    delete a.multiline;
    const input = h(tag, a);
    return { el: h('div', {}, h('label', { for: a.id }, label), input, hint ? h('p', { class: 'hint' }, hint) : null), input };
  }

  function toast(msg) {
    const t = h('div', { class: 'toast', role: 'status' }, msg);
    document.body.append(t);
    setTimeout(() => t.remove(), 3200);
  }

  function goalName(id) {
    const g = C.goalById(S, id);
    return g ? g.name : '';
  }

  // ---------- render ----------

  function render() {
    clearInterval(timer);
    timer = null;
    const screen = screenFor();
    app.replaceChildren(screen);
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
    const resuming = !!(cp || C.suspendedAttemptFor(S, rec.id));
    const eyebrow = welcome === 'back' || welcome === 'long' ? 'Welcome back' : resuming ? 'Continue' : 'Next';
    const reason = S.recommendation.reason && S.recommendation.reason !== 'Continue where you stopped' ? S.recommendation.reason : '';

    return h('section', { class: 'screen' },
      topbar(null, menuBtn()),
      notices(),
      h('div', { class: 'center' },
        h('p', { class: 'eyebrow' }, eyebrow),
        reason ? h('div', {}, h('span', { class: 'reason' }, reason)) : null,
        h('h1', {}, g.name),
        h('p', { class: 'action-text' }, rec.text),
        cp ? h('p', { class: 'sub' }, cp) : null,
        h('div', { class: 'invite' },
          h('p', {}, rec.small.replace(/\.?$/, '') + '.'),
          h('p', {}, rec.target ? rec.target.replace(/\.?$/, '') + ', if you want.' : 'Keep going if you want.')),
        primary('START', () => onStart(rec)),
        h('div', { class: 'links' },
          link('Make it smaller', () => go('smaller', { actionId: rec.id })),
          link('Another task', () => go('another')))));
  }

  function notices() {
    const out = [];
    if (S.exampleNote) {
      out.push(h('div', { class: 'note' },
        h('p', {}, 'These are example goals from your plan. Change them under Menu → Goals.'),
        h('button', { class: 'inline-link', onclick: () => act(() => { S.exampleNote = false; }) }, 'Got it')));
    }
    for (const g of C.passedDeadlines(S, now())) {
      out.push(h('div', { class: 'note' },
        h('p', {}, (g.deadlineLabel || 'The deadline') + ' for ' + g.name + ' was on ' + C.formatDate(g.deadline) + '.'),
        h('div', { class: 'row' },
          h('button', { class: 'inline-link', onclick: () => go('goal', { goalId: g.id }) }, 'Update date'),
          h('button', { class: 'inline-link', onclick: () => act(() => { g.deadline = null; g.deadlineLabel = ''; }) }, 'Remove it'))));
    }
    const day = C.dueReview(S, now());
    if (day) {
      out.push(h('div', { class: 'note' },
        h('p', {}, 'A two-minute look back is ready, if you want it.'),
        h('div', { class: 'row' },
          h('button', { class: 'inline-link', onclick: () => go('review', { day }) }, 'Open'),
          h('button', { class: 'inline-link', onclick: () => act(() => S.reviewsSeen.push(day)) }, 'Not now'))));
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
    const f = field('Link, file, or how to open it', { id: 'res', placeholder: 'https://… or “Notebook, page 12”' });
    return h('section', { class: 'screen' },
      topbar(back()),
      h('div', { class: 'center' },
        h('h2', {}, 'Where is the material?'),
        h('p', { class: 'sub' }, 'Asked once, so START can open it next time.'),
        f.el,
        h('div', { class: 'spaced' }, primary('Save and start', () => {
          a.resource = f.input.value.trim();
          a.resourceAsked = true;
          doStart(a);
        })),
        h('div', { class: 'links' }, link('No material needed', () => { a.resourceAsked = true; doStart(a); }))));
  }

  function askNextScreen(g) {
    const f = field('What should open next time?', { id: 'next', placeholder: 'e.g. Open chapter 3 and read the first page' });
    return h('section', { class: 'screen' },
      topbar(null, menuBtn()),
      h('div', { class: 'center' },
        h('p', { class: 'eyebrow' }, welcome === 'normal' ? 'Before you start' : 'Welcome back'),
        h('h1', {}, g.name),
        f.el,
        h('div', { class: 'spaced' }, primary('Save', () => {
          if (!f.input.value.trim()) return f.input.focus();
          act(() => C.setNextStep(S, g.id, f.input.value));
        })),
        h('div', { class: 'links' },
          link('Not now', () => { askNextDismissed = true; render(); }),
          link('Move to later', () => act(() => C.setGoalStatus(S, g.id, 'later'))))));
  }

  function emptyScreen() {
    const resting = S.goals.filter((g) => g.status !== 'active');
    const activeNoStep = C.goalsNeedingNext(S);
    return h('section', { class: 'screen' },
      topbar(null, menuBtn()),
      h('div', { class: 'center' },
        h('h2', {}, S.goals.length ? 'Nothing is active right now.' : 'What would you like to start?'),
        h('p', { class: 'sub' }, S.goals.length ? 'That is fine. Add something, or bring one back.' : 'One goal is enough. It takes under two minutes.'),
        primary('Add a goal', () => go('goal', { goalId: null })),
        activeNoStep.length ? h('div', { class: 'spaced' },
          activeNoStep.map((g) => secondary(g.name, () => act(() => { askNextDismissed = false; g.needsNext = true; }), 'Choose its next step'))) : null,
        resting.length ? h('div', { class: 'spaced' },
          h('p', { class: 'eyebrow' }, 'Paused or for later'),
          resting.map((g) => secondary(g.name, () => act(() => C.setGoalStatus(S, g.id, 'active')), 'Make active'))) : null));
  }

  function longAbsenceScreen() {
    const active = S.goals.filter((g) => g.status === 'active');
    const choice = {};
    active.forEach((g) => { choice[g.id] = 'active'; });
    const rows = active.map((g) => {
      const keep = h('button', { class: 'chip', 'aria-pressed': 'true' }, 'Keep');
      const later = h('button', { class: 'chip', 'aria-pressed': 'false' }, 'Later');
      const paint = () => {
        keep.style.background = choice[g.id] === 'active' ? 'var(--soft)' : '';
        later.style.background = choice[g.id] === 'later' ? 'var(--soft)' : '';
        keep.setAttribute('aria-pressed', String(choice[g.id] === 'active'));
        later.setAttribute('aria-pressed', String(choice[g.id] === 'later'));
      };
      keep.onclick = () => { choice[g.id] = 'active'; paint(); };
      later.onclick = () => { choice[g.id] = 'later'; paint(); };
      paint();
      return h('li', {}, h('div', {}, g.name), h('div', { class: 'acts' }, keep, later));
    });
    return h('section', { class: 'screen' },
      topbar(null, h('button', { class: 'icon-btn', onclick: () => { longAbsenceHandled = true; render(); } }, 'Skip')),
      h('div', { class: 'center' },
        h('p', { class: 'eyebrow' }, 'Welcome back'),
        h('h2', {}, 'Which of these still fit right now?'),
        h('p', { class: 'sub' }, 'Optional. Anything set to later stays saved.'),
        h('ul', { class: 'list' }, rows),
        primary('Continue', () => {
          longAbsenceHandled = true;
          act(() => active.forEach((g) => { if (choice[g.id] !== 'active') C.setGoalStatus(S, g.id, choice[g.id]); }));
        })));
  }

  // ---------- in progress ----------

  function progressScreen(att) {
    const a = C.actionById(S, att.actionId);
    const g = C.goalById(S, att.goalId);
    const since = att.resumedAt || att.startedAt;
    const elapsed = h('p', { class: 'elapsed' }, 'Started ' + C.formatElapsed(now() - since));
    const cp = C.checkpointFor(S, a.id);
    const parkedCount = () => C.thoughtsFor(S, att.id).length;
    const parkedLine = h('p', { class: 'hint' }, parkedCount() ? parkedCount() + ' parked for later' : 'Stray thought? Park it here and get back to work.');
    const parkInput = h('input', { id: 'park', placeholder: 'Park a thought', autocomplete: 'off', enterkeyhint: 'done' });
    const doPark = () => {
      if (!C.parkThought(S, parkInput.value, att.id, now())) return parkInput.focus();
      save();
      parkInput.value = '';
      parkInput.blur();
      parkedLine.textContent = parkedCount() + ' parked for later';
      toast('Parked.');
    };
    parkInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doPark(); });
    const checkinSlot = h('div');

    const showCheckin = () => {
      if (!g.checkinMinutes || att.checkinShown) return;
      if (now() - since < g.checkinMinutes * 60000) return;
      checkinSlot.replaceChildren(h('div', { class: 'note' },
        h('p', {}, g.checkinMinutes + ' minutes in. Keep going or wrap up?'),
        h('div', { class: 'row' },
          h('button', { class: 'inline-link', onclick: () => { att.checkinShown = true; save(); checkinSlot.replaceChildren(); } }, 'Keep going'),
          h('button', { class: 'inline-link', onclick: () => { att.checkinShown = true; save(); go('finish', { attemptId: att.id }); } }, 'Wrap up'))));
    };
    showCheckin();
    timer = setInterval(() => {
      elapsed.textContent = 'Started ' + C.formatElapsed(now() - since);
      showCheckin();
    }, 20000);

    let resourceEl = null;
    if (C.isUrl(a.resource)) {
      resourceEl = h('div', { class: 'links' }, link('Open the material again', () => {
        window.open(a.resource.trim(), '_blank', 'noopener');
        C.recordLaunch(S, att.id, now());
        save();
      }));
    } else if (a.resource) {
      resourceEl = h('div', { class: 'note' }, h('p', {}, a.resource));
    }

    return h('section', { class: 'screen' },
      topbar(h('span', { class: 'eyebrow', style: 'margin:0' }, 'In progress · ' + g.name), menuBtn()),
      h('div', { class: 'center' },
        h('h2', {}, a.text),
        cp ? h('p', { class: 'sub' }, cp) : null,
        elapsed,
        checkinSlot,
        resourceEl,
        h('div', { class: 'park' }, parkInput, h('button', { class: 'secondary', onclick: doPark }, '+ Park')),
        parkedLine),
      h('div', { class: 'bottom' },
        primary('Finish', () => go('finish', { attemptId: att.id })),
        h('div', { class: 'links' }, link('Switch', () => go('another', { switching: true })))));
  }

  // ---------- finish (at most two taps) ----------

  function finishScreen() {
    const att = S.attempts.find((x) => x.id === view.attemptId);
    if (!att || att.state === 'finished') return homeScreen();
    const a = C.actionById(S, att.actionId);
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
      body = [
        h('h2', {}, 'How did it go?'),
        secondary('Step finished', () => (hasNext ? complete('finished') : go('finish', { attemptId: att.id, step: 'next' })), 'Move on to the next step'),
        secondary('Made some progress', () => go('finish', { attemptId: att.id, step: 'progress' }), 'Keep this step and save where you stopped'),
        secondary("Didn't get going", () => go('finish', { attemptId: att.id, step: 'stuck' }), 'Nothing changes, and that is fine'),
        h('div', { class: 'links' }, link('Not yet, keep going', () => go('home'))),
      ];
    } else if (step === 'progress') {
      const f = field('Where did you stop?', { id: 'pos', value: C.checkpointFor(S, a.id), placeholder: 'e.g. Stopped at 18:10' });
      body = [h('h2', {}, 'Saving your place'), f.el, h('div', { class: 'spaced' }, primary('Save', () => complete('progress', { position: f.input.value })))];
    } else if (step === 'next') {
      const f = field('What should open next time?', { id: 'next', placeholder: 'e.g. Start lecture 5' });
      body = [
        h('h2', {}, 'Nice. One more thing'),
        f.el,
        h('div', { class: 'spaced' }, primary('Save', () => complete('finished', { nextText: f.input.value, deferred: !f.input.value.trim() }))),
        h('div', { class: 'links' }, link('Decide next time', () => {
          complete('finished', { deferred: true });
        })),
      ];
    } else if (step === 'stuck') {
      body = [
        h('h2', {}, 'Anything get in the way?'),
        h('p', { class: 'sub' }, 'Optional, and no explanation is needed.'),
        h('div', { class: 'chips' }, OBSTACLES.map((o) => h('button', { class: 'chip', onclick: () => complete('stuck', { obstacle: o.toLowerCase() }) }, o))),
        link('Skip', () => complete('stuck', {})),
      ];
    }
    return h('section', { class: 'screen' }, topbar(back()), h('div', { class: 'center' }, body));
  }

  function thoughtsScreen() {
    const list = C.thoughtsFor(S, view.attemptId);
    if (!list.length) {
      view = Object.assign({ name: 'after' }, view.after);
      return afterScreen();
    }
    return h('section', { class: 'screen' },
      h('div', { class: 'center' },
        h('h2', {}, 'You parked ' + list.length + (list.length === 1 ? ' thought' : ' thoughts')),
        h('ul', { class: 'list' }, list.map((t) => h('li', {}, h('div', {}, t.text),
          h('div', { class: 'acts' },
            h('button', { class: 'inline-link', onclick: () => act(() => C.thoughtToGoal(S, t.id, now())) }, 'Make it a goal'),
            h('button', { class: 'inline-link', onclick: () => act(() => C.keepThought(S, t.id)) }, 'Keep for later'),
            h('button', { class: 'inline-link', onclick: () => act(() => C.deleteThought(S, t.id)) }, 'Delete'))))),
        primary('Done', () => act(() => list.forEach((t) => C.keepThought(S, t.id))))));
  }

  function afterScreen() {
    const v = view;
    if (v.deferred) {
      const g = C.goalById(S, v.goalId);
      if (g && !g.needsNext) { g.needsNext = true; askNextDismissed = true; save(); }
    }
    const next = v.nextId && C.actionById(S, v.nextId);
    const t = C.today(S, now());
    let msg;
    if (v.outcome === 'finished') msg = next ? 'Saved. Next time: ' + next.text + '.' : 'Saved. The next step can be decided next time.';
    else if (v.outcome === 'progress') {
      const cp = next && C.checkpointFor(S, next.id);
      msg = cp ? 'Saved. ' + goalName(v.goalId) + ' will be ready at: ' + cp + '.' : 'Saved. ' + goalName(v.goalId) + ' will be ready where you left it.';
    } else msg = 'That is fine. Nothing has changed, and it will be here when you want it.';

    const todayLine = 'Today: ' + t.starts + (t.starts === 1 ? ' start' : ' starts') +
      (t.finishedSteps ? ' · ' + t.finishedSteps + (t.finishedSteps === 1 ? ' step finished' : ' steps finished') : '');

    const doneForNow = () => { act(() => C.endSession(S)); go('home'); };
    const canContinue = next && C.goalById(S, next.goalId) && C.goalById(S, next.goalId).status === 'active';

    let buttons;
    if (v.outcome === 'stuck') {
      buttons = [
        secondary('Make it smaller', () => go('smaller', { actionId: v.nextId })),
        secondary('Another task', () => go('another')),
        h('div', { class: 'links' }, link('Stop for now. Rest is fine', () => { doneForNow(); toast('See you later.'); })),
      ];
    } else {
      buttons = [
        canContinue ? primary('Continue this goal', () => onStart(next)) : null,
        h('div', { class: 'links' }, link('Done for now', doneForNow)),
      ];
    }
    return h('section', { class: 'screen' },
      h('div', { class: 'center' }, h('h2', {}, msg), h('p', { class: 'sub' }, todayLine), buttons));
  }

  // ---------- another task / smaller ----------

  function anotherScreen() {
    const rec = C.actionById(S, S.recommendation.actionId);
    const alts = C.alternatives(S, now());
    const recGoal = rec && C.goalById(S, rec.goalId);
    return h('section', { class: 'screen' },
      topbar(back()),
      h('div', { class: 'center' },
        h('h2', {}, view.switching ? 'Switch to…' : 'Something else?'),
        alts.length
          ? alts.map((a) => secondary(goalName(a.goalId), () => act(() => { C.chooseAlternative(S, a.id, now()); view = { name: 'home' }; }), a.text))
          : h('p', { class: 'sub' }, "That's everything for now."),
        rec ? secondary('Make it smaller', () => go('smaller', { actionId: rec.id }), rec.small) : null,
        recGoal ? secondary('Pause ' + recGoal.name, () => {
          act(() => { C.setGoalStatus(S, recGoal.id, 'paused'); view = { name: 'home' }; });
          toast('Paused. Bring it back any time under Goals.');
        }, 'Stays saved until you resume it') : null,
        !alts.length ? h('div', { class: 'links' },
          link('Rest is fine. Stop here', () => { act(() => { C.endSession(S); view = { name: 'home' }; }); toast('See you later.'); }),
          S.recommendation.exclusions.length ? link('Start a fresh round', () => act(() => { C.freshRound(S, now()); view = { name: 'home' }; })) : null) : null));
  }

  function smallerScreen() {
    const a = C.actionById(S, view.actionId || S.recommendation.actionId);
    if (!a) return homeScreen();
    const f = field('Smallest useful version', { id: 'small', value: a.small });
    const suggestions = ['Just open it', 'Two minutes', 'Read one line', 'Do the first tiny bit'];
    return h('section', { class: 'screen' },
      topbar(back()),
      h('div', { class: 'center' },
        h('h2', {}, 'Make it smaller'),
        h('p', { class: 'sub' }, goalName(a.goalId) + ' · ' + a.text),
        h('div', { class: 'chips' }, suggestions.map((s) => h('button', { class: 'chip', onclick: () => { f.input.value = s; } }, s))),
        f.el,
        h('div', { class: 'spaced' }, primary('Save', () => act(() => {
          C.makeSmaller(S, a.id, f.input.value);
          if (!C.currentAttempt(S) || C.currentAttempt(S).actionId !== a.id) {
            const cur = C.currentAttempt(S);
            if (cur) cur.state = 'suspended';
            S.recommendation.actionId = a.id;
          }
          view = { name: 'home' };
        })))));
  }

  // ---------- secondary screens ----------

  function menuScreen() {
    const kept = S.thoughts.filter((t) => t.status === 'kept').length;
    return h('section', { class: 'screen' },
      topbar(back()),
      h('h2', {}, 'Menu'),
      secondary('Today', () => go('today'), todaySummary()),
      secondary('Goals', () => go('goals'), S.goals.filter((g) => g.status === 'active').length + ' active'),
      secondary('Saved thoughts', () => go('saved'), kept ? kept + ' saved' : 'None yet'),
      secondary('Look back', () => go('review'), 'What the app has noticed so far'),
      secondary('Backup and data', () => go('backup'), 'Export, import, and where data lives'));
  }

  function todaySummary() {
    const t = C.today(S, now());
    if (!t.starts) return 'Nothing yet today';
    return t.starts + (t.starts === 1 ? ' start' : ' starts') + (t.finishedSteps ? ' · ' + t.finishedSteps + ' finished' : '');
  }

  function todayScreen() {
    const t = C.today(S, now());
    const label = (i) => (i.outcome ? OUTCOME_LABEL[i.outcome] : i.state === 'current' ? 'In progress' : 'Set aside for later');
    return h('section', { class: 'screen' },
      topbar(back('menu')),
      h('h2', {}, 'Today'),
      t.items.length
        ? h('ul', { class: 'list' }, t.items.map((i) => h('li', {},
          h('div', {}, i.goal),
          h('div', { class: 'meta' }, new Date(i.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + label(i)))))
        : h('p', { class: 'sub' }, 'Nothing started yet today. That is fine.'));
  }

  function goalsScreen() {
    const groups = [['active', 'Active'], ['paused', 'Paused'], ['later', 'For later']];
    return h('section', { class: 'screen' },
      topbar(back('menu')),
      h('h2', {}, 'Goals'),
      groups.map(([st, title]) => {
        const gs = S.goals.filter((g) => g.status === st);
        if (!gs.length) return null;
        return h('div', {},
          h('p', { class: 'eyebrow' }, title),
          gs.map((g) => {
            const a = C.currentAction(S, g.id);
            return secondary(g.name, () => go('goal', { goalId: g.id }), a ? a.text : 'No next step yet');
          }));
      }),
      h('div', { class: 'spaced' }, primary('Add a goal', () => go('goal', { goalId: null }))));
  }

  function goalEditScreen() {
    const isNew = !view.goalId;
    const g = isNew ? null : C.goalById(S, view.goalId);
    if (!isNew && !g) return goalsScreen();
    const a = g ? C.currentAction(S, g.id) : null;
    const upcoming = g ? C.goalActions(S, g.id).filter((x) => !x.done && x !== a) : [];

    const name = field('Goal', { id: 'g-name', value: g ? g.name : '', placeholder: 'e.g. Automatic Control' });
    const text = field('Next concrete action', { id: 'g-text', value: a ? a.text : '', placeholder: 'e.g. Resume lecture 4 and watch five minutes' });
    const res = field('Material', { id: 'g-res', value: a ? a.resource : '', placeholder: 'Link, file, or how to open it' }, 'A link opens automatically on START.');
    const cp = field('Restart point', { id: 'g-cp', value: a ? C.checkpointFor(S, a.id) : '', placeholder: 'e.g. Lecture 4 · Resume at 12:40' });
    const small = field('Small version', { id: 'g-small', value: a ? a.small : 'Start with five minutes' });
    const target = field('Optional target', { id: 'g-target', value: a ? a.target : '', placeholder: 'e.g. Continue for around 20 minutes' });
    const later = field('Steps after this one (one per line)', { id: 'g-later', multiline: true, value: upcoming.map((x) => x.text).join('\n') });
    const dl = field('Deadline date', { id: 'g-dl', type: 'date', value: g && g.deadline ? g.deadline : '' }, 'Only real dates, such as an exam or submission.');
    const dlLabel = field('Deadline name', { id: 'g-dll', value: g ? g.deadlineLabel : '', placeholder: 'e.g. Exam' });
    const status = h('select', { id: 'g-status' },
      ['active', 'paused', 'later'].map((st) => h('option', { value: st, selected: (g ? g.status : 'active') === st }, { active: 'Active', paused: 'Paused', later: 'For later' }[st])));
    const checkin = h('select', { id: 'g-checkin' },
      [0, 15, 20, 25, 30, 45, 60].map((m) => h('option', { value: m, selected: (g && g.checkinMinutes || 0) === m }, m ? 'After ' + m + ' minutes' : 'Off')));

    const onSave = () => {
      const nm = name.input.value.trim();
      const tx = text.input.value.trim();
      if (!nm) return name.input.focus();
      act(() => {
        const t = now();
        const goal = g || C.addGoal(S, { name: nm }, t);
        goal.name = nm;
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
      toast('Saved.');
    };

    const more = h('details', { open: !isNew },
      h('summary', { style: 'cursor:pointer;color:var(--muted);margin-top:16px' }, 'More options'),
      cp.el, small.el, target.el, later.el, dl.el, dlLabel.el,
      h('label', { for: 'g-status' }, 'Status'), status,
      h('label', { for: 'g-checkin' }, 'Gentle check-in'), checkin,
      h('p', { class: 'hint' }, 'A quiet line on the in-progress screen. Never a notification.'));

    return h('section', { class: 'screen' },
      topbar(back(isNew ? 'home' : 'goals')),
      h('h2', {}, isNew ? 'Add a goal' : 'Edit goal'),
      name.el, text.el, res.el, more,
      h('div', { class: 'spaced' }, primary('Save', onSave)),
      g ? h('div', { class: 'links' }, link('Delete this goal', () => {
        if (!confirm('Delete “' + g.name + '” and its steps? This cannot be undone.')) return;
        act(() => { C.deleteGoal(S, g.id); view = { name: 'goals' }; });
      })) : null);
  }

  function savedThoughtsScreen() {
    const list = S.thoughts.filter((t) => t.status === 'kept');
    return h('section', { class: 'screen' },
      topbar(back('menu')),
      h('h2', {}, 'Saved thoughts'),
      list.length
        ? h('ul', { class: 'list' }, list.map((t) => h('li', {}, h('div', {}, t.text),
          h('div', { class: 'meta' }, new Date(t.at).toLocaleDateString()),
          h('div', { class: 'acts' },
            h('button', { class: 'inline-link', onclick: () => act(() => C.thoughtToGoal(S, t.id, now())) }, 'Make it a goal'),
            h('button', { class: 'inline-link', onclick: () => act(() => C.deleteThought(S, t.id)) }, 'Delete')))))
        : h('p', { class: 'sub' }, 'Thoughts parked during a session show up here if you keep them.'));
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
    const paste = field('Or paste a backup here', { id: 'imp', multiline: true, placeholder: '{ … }' });
    const file = h('input', { type: 'file', accept: 'application/json,.json', id: 'imp-file' });
    const doImport = (raw) => {
      const r = C.parseState(raw);
      if (!r.state) return toast(r.error || 'That backup looks empty.');
      if (!confirm('Replace the current data with this backup? The current data is kept as a fallback copy.')) return;
      try { localStorage.setItem(PREV_KEY, JSON.stringify(S)); } catch (e) { /* best effort */ }
      S = r.state;
      act(() => { view = { name: 'home' }; });
      toast('Backup restored.');
    };
    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      if (f) f.text().then(doImport);
    });
    const canShare = navigator.canShare && navigator.canShare({ files: [new File(['{}'], 'x.json', { type: 'application/json' })] });
    return h('section', { class: 'screen' },
      topbar(back('menu')),
      h('h2', {}, 'Backup and data'),
      h('div', { class: 'note' },
        h('p', {}, 'Everything is stored only in this browser on this device. Nothing is sent anywhere.'),
        h('p', {}, 'Clearing site data or deleting the home-screen app removes it, so export a backup now and then.')),
      canShare ? secondary('Share a backup file', () => {
        const f = new File([exportJson()], backupName(), { type: 'application/json' });
        navigator.share({ files: [f], title: 'Next Step backup' }).catch(() => {});
      }, 'Save to Files, or send to yourself') : null,
      secondary('Download a backup file', () => download(backupName(), exportJson())),
      secondary('Copy backup text', () => {
        navigator.clipboard.writeText(exportJson()).then(() => toast('Copied.'), () => toast('Copy did not work here. Try the download instead.'));
      }),
      h('p', { class: 'eyebrow', style: 'margin-top:20px' }, 'Restore'),
      h('label', { for: 'imp-file' }, 'From a file'), file,
      paste.el,
      h('div', { class: 'spaced' }, secondary('Restore from pasted text', () => doImport(paste.input.value))));
  }

  function reviewScreen() {
    const st = C.reviewStats(S, now());
    const day = view.day;
    const qs = ['When did it help you start?', 'When did you forget it existed, or skip it?', 'What would make the next start easier?'];
    const inputs = qs.map((q, i) => field(q, { id: 'rq' + i, multiline: true }));
    const obstacles = Object.entries(st.obstacles);
    return h('section', { class: 'screen' },
      topbar(back(day ? 'home' : 'menu')),
      h('h2', {}, 'Look back'),
      h('p', { class: 'sub' }, 'A record, not a score.'),
      h('table', { class: 'stats' },
        h('thead', {}, h('tr', {}, ['Week', 'Opened', 'Material', 'Starts', 'Got going'].map((x) => h('th', {}, x)))),
        h('tbody', {}, st.weeks.map((w) => h('tr', {}, [w.week, w.opens, w.launches, w.starts, w.began].map((x) => h('td', {}, String(x))))))),
      obstacles.length ? h('div', { class: 'note' },
        h('p', {}, 'What got in the way:'),
        h('p', {}, obstacles.map(([k, n]) => k + ' (' + n + ')').join(' · '))) : null,
      inputs.map((f) => f.el),
      h('div', { class: 'spaced' }, primary('Save', () => act(() => {
        S.reviews = S.reviews || [];
        S.reviews.push({ at: now(), day: day || null, answers: inputs.map((f, i) => ({ q: qs[i], a: f.input.value.trim() })) });
        if (day && !S.reviewsSeen.includes(day)) S.reviewsSeen.push(day);
        view = { name: 'home' };
      }))));
  }

  function recoverScreen() {
    return h('section', { class: 'screen' },
      h('div', { class: 'center' },
        h('h2', {}, 'Your saved data could not be opened'),
        h('p', { class: 'sub' }, view.error),
        view.raw != null ? secondary('Download the saved data', () => download('next-step-unreadable.json', view.raw), 'Keep a copy before doing anything else') : null,
        secondary('Restore from a backup', () => { S = S || C.emptyState(now()); go('backup'); }),
        view.raw != null ? link('Start fresh (the unreadable data stays stored)', () => {
          try { localStorage.setItem(UNREADABLE_PREFIX + Date.now(), view.raw); } catch (e) { return toast('Could not keep a copy, so nothing was changed.'); }
          S = C.emptyState(now());
          welcome = C.recordOpen(S, now());
          act(() => { view = { name: 'home' }; });
        }) : null));
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
