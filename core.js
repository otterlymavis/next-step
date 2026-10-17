// Execution Assistant — pure state and rules. No DOM access here, so it can be tested in Node.
(function (root) {
  'use strict';

  const SCHEMA = 1;
  const DAY = 24 * 60 * 60 * 1000;
  const DEADLINE_WINDOW_DAYS = 14; // adjustable prototype rule (PLAN §4)
  const WELCOME_BACK_DAYS = 2;
  const LONG_ABSENCE_DAYS = 21;
  const MAX_ALTERNATIVES = 3;
  const GOAL_ICONS = ['📘', '💻', '🎸', '🧹', '🏃', '🎨', '🧪', '✍️', '🎮', '🌱', '🍳', '🧠', '📐', '🎧', '🧺', '⭐'];
  const GOAL_HUES = [160, 210, 28, 280, 340, 95];

  let idCounter = 0;
  function uid(prefix) {
    idCounter += 1;
    return prefix + '_' + Date.now().toString(36) + '_' + idCounter.toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function emptyState(now) {
    return {
      schema: SCHEMA,
      createdAt: now,
      lastOpenAt: null,
      goals: [],
      actions: [],
      checkpoints: {},   // actionId -> { position, updatedAt }
      attempts: [],
      recommendation: { actionId: null, reason: '', exclusions: [] },
      thoughts: [],
      events: [],        // { type: 'open' | 'launch', at, actionId? }
      reviewsSeen: [],   // [7, 14]
      prefs: { theme: 'auto', focus: false, game: true, mascot: true }, // theme: auto | light | dark
      game: { milestones: {}, quests: {}, spins: {} }, // earned once; keyed by id or day
      reminders: [],     // { id, text } in display order
      reminderIndex: 0,  // which reminder is showing
    };
  }

  // Example goals from PLAN.md, used as editable placeholders.
  function seedState(now) {
    const s = emptyState(now);
    const ac = addGoal(s, { name: 'Automatic Control', icon: '📐', hue: 210 }, now);
    addAction(s, ac.id, {
      text: 'Resume lecture 4 and watch the next five minutes',
      small: 'Watch five minutes',
      target: 'Continue for around 20 minutes',
    });
    setCheckpoint(s, s.actions[s.actions.length - 1].id, 'Lecture 4 · Resume at 12:40', now);
    addAction(s, ac.id, { text: 'Start lecture 5 and watch the first five minutes', small: 'Watch five minutes' });

    const c = addGoal(s, { name: 'C — Pointers', icon: '💻', hue: 160 }, now + 1);
    addAction(s, c.id, {
      text: 'Open exercise 3 and read the first question',
      small: 'Read the first question',
      target: 'Work on it for around 25 minutes',
    });
    setCheckpoint(s, s.actions[s.actions.length - 1].id, 'Exercise 3 · the saved question', now);

    const g = addGoal(s, { name: 'Guitar', icon: '🎸', hue: 28 }, now + 2);
    addAction(s, g.id, {
      text: 'Pick up the guitar and play through the song you are learning',
      small: 'Play for five minutes',
      resource: 'Guitar is next to the desk',
    });
    return s;
  }

  // ---------- persistence helpers ----------

  // Returns { state } or { error, raw }. Never replaces unreadable data with an empty plan.
  function parseState(raw) {
    if (raw == null || raw === '') return { state: null };
    try {
      const s = JSON.parse(raw);
      if (!s || typeof s !== 'object' || !Array.isArray(s.goals) || !Array.isArray(s.actions)) {
        return { error: 'Saved data has an unexpected shape.', raw };
      }
      if (s.schema > SCHEMA) return { error: 'Saved data comes from a newer version of the app.', raw };
      return { state: normalize(s) };
    } catch (e) {
      return { error: 'Saved data could not be read.', raw };
    }
  }

  function normalize(s) {
    const base = emptyState(s.createdAt || Date.now());
    const out = Object.assign(base, s);
    out.recommendation = Object.assign({ actionId: null, reason: '', exclusions: [] }, s.recommendation || {});
    out.checkpoints = s.checkpoints || {};
    out.attempts = s.attempts || [];
    out.thoughts = s.thoughts || [];
    out.events = s.events || [];
    out.reviewsSeen = s.reviewsSeen || [];
    out.prefs = Object.assign({ theme: 'auto', focus: false, game: true, mascot: true }, s.prefs || {});
    out.game = Object.assign({ milestones: {}, quests: {}, spins: {} }, s.game || {});
    out.reminders = s.reminders || [];
    out.reminderIndex = s.reminderIndex || 0;
    out.goals.forEach((g, i) => {
      if (!g.icon) g.icon = GOAL_ICONS[i % GOAL_ICONS.length];
      if (g.hue == null) g.hue = GOAL_HUES[i % GOAL_HUES.length];
    });
    return out;
  }

  // ---------- lookups ----------

  const goalById = (s, id) => s.goals.find((g) => g.id === id) || null;
  const actionById = (s, id) => s.actions.find((a) => a.id === id) || null;

  function goalActions(s, goalId) {
    return s.actions.filter((a) => a.goalId === goalId).sort((a, b) => a.order - b.order);
  }

  // The next unfinished step of a goal, or null if there is no known next step.
  function currentAction(s, goalId) {
    return goalActions(s, goalId).find((a) => !a.done) || null;
  }

  function currentAttempt(s) {
    return s.attempts.find((a) => a.state === 'current') || null;
  }

  function suspendedAttemptFor(s, actionId) {
    return s.attempts.find((a) => a.state === 'suspended' && a.actionId === actionId) || null;
  }

  function lastAttention(s, goalId) {
    let t = 0;
    for (const a of s.attempts) if (a.goalId === goalId && a.startedAt > t) t = a.startedAt;
    return t;
  }

  function daysUntil(dateStr, now) {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return Math.round((d - today) / DAY);
  }

  // ---------- goals and actions ----------

  function addGoal(s, fields, now) {
    const g = {
      id: uid('g'),
      name: (fields.name || '').trim() || 'Untitled goal',
      icon: fields.icon || GOAL_ICONS[s.goals.length % GOAL_ICONS.length],
      hue: fields.hue != null ? fields.hue : GOAL_HUES[s.goals.length % GOAL_HUES.length],
      status: fields.status || 'active', // active | paused | later
      deadline: fields.deadline || null, // 'YYYY-MM-DD', user-entered only
      deadlineLabel: fields.deadlineLabel || '',
      checkinMinutes: fields.checkinMinutes || null, // gentle check-in, off by default
      needsNext: false, // "Decide next time" was chosen
      createdAt: now,
    };
    s.goals.push(g);
    return g;
  }

  function addAction(s, goalId, fields) {
    const existing = goalActions(s, goalId);
    const a = {
      id: uid('a'),
      goalId,
      text: (fields.text || '').trim(),
      resource: (fields.resource || '').trim(),
      small: (fields.small || '').trim() || 'Start with five minutes',
      target: (fields.target || '').trim(),
      order: existing.length ? existing[existing.length - 1].order + 1 : 1,
      done: false,
      doneAt: null,
    };
    s.actions.push(a);
    const g = goalById(s, goalId);
    if (g) g.needsNext = false;
    return a;
  }

  function setCheckpoint(s, actionId, position, now) {
    position = (position || '').trim();
    if (position) s.checkpoints[actionId] = { position, updatedAt: now };
    else delete s.checkpoints[actionId];
  }

  function checkpointFor(s, actionId) {
    return s.checkpoints[actionId] ? s.checkpoints[actionId].position : '';
  }

  function setGoalStatus(s, goalId, status) {
    const g = goalById(s, goalId);
    if (!g) return;
    g.status = status;
    if (status !== 'active') {
      const cur = currentAttempt(s);
      if (cur && cur.goalId === goalId) cur.state = 'suspended';
      const rec = s.recommendation.actionId && actionById(s, s.recommendation.actionId);
      if (rec && rec.goalId === goalId) s.recommendation.actionId = null;
    }
  }

  function deleteGoal(s, goalId) {
    const ids = new Set(goalActions(s, goalId).map((a) => a.id));
    s.goals = s.goals.filter((g) => g.id !== goalId);
    s.actions = s.actions.filter((a) => !ids.has(a.id));
    ids.forEach((id) => delete s.checkpoints[id]);
    s.attempts.forEach((a) => {
      if (ids.has(a.actionId) && a.state !== 'finished') a.state = 'finished';
    });
    s.recommendation.exclusions = s.recommendation.exclusions.filter((id) => !ids.has(id));
    if (ids.has(s.recommendation.actionId)) s.recommendation.actionId = null;
  }

  // ---------- recommendation (PLAN §4) ----------

  function eligibleActions(s) {
    const out = [];
    for (const g of s.goals) {
      if (g.status !== 'active') continue;
      const a = currentAction(s, g.id);
      if (a) out.push(a);
    }
    return out;
  }

  // Goals that are active but have no known next step.
  function goalsNeedingNext(s) {
    return s.goals.filter((g) => g.status === 'active' && !currentAction(s, g.id));
  }

  function isValidRec(s, actionId) {
    const a = actionId && actionById(s, actionId);
    if (!a || a.done) return false;
    const g = goalById(s, a.goalId);
    return !!g && g.status === 'active' && currentAction(s, g.id) === a;
  }

  function deadlineReason(g, now) {
    if (!g.deadline) return '';
    const n = daysUntil(g.deadline, now);
    const label = g.deadlineLabel || 'Deadline';
    if (n < 0) return '';
    return label + ' on ' + formatDate(g.deadline);
  }

  // Stable ordering: real approaching deadline first, then least recent attention, then creation order.
  function rankCandidates(s, candidates, now) {
    return candidates
      .map((a) => {
        const g = goalById(s, a.goalId);
        const n = daysUntil(g.deadline, now);
        const soon = n != null && n >= 0 && n <= DEADLINE_WINDOW_DAYS;
        return { a, g, soon, n, last: lastAttention(s, g.id) };
      })
      .sort((x, y) => {
        if (x.soon !== y.soon) return x.soon ? -1 : 1;
        if (x.soon && y.soon && x.n !== y.n) return x.n - y.n;
        if (x.last !== y.last) return x.last - y.last;
        if (x.g.createdAt !== y.g.createdAt) return x.g.createdAt - y.g.createdAt;
        return x.a.order - y.a.order;
      });
  }

  function reasonFor(s, a, now) {
    const g = goalById(s, a.goalId);
    const dl = deadlineReason(g, now);
    if (suspendedAttemptFor(s, a.id) || checkpointFor(s, a.id)) return dl ? 'Continue where you stopped · ' + dl : 'Continue where you stopped';
    return dl;
  }

  // Ensures s.recommendation points at a sensible action. Mutates s; returns the action or null.
  function ensureRecommendation(s, now) {
    const cur = currentAttempt(s);
    if (cur && isValidRec(s, cur.actionId)) {
      s.recommendation.actionId = cur.actionId;
      return actionById(s, cur.actionId);
    }
    const rec = s.recommendation;
    if (isValidRec(s, rec.actionId) && !rec.exclusions.includes(rec.actionId)) {
      rec.reason = reasonFor(s, actionById(s, rec.actionId), now);
      return actionById(s, rec.actionId);
    }
    const pool = eligibleActions(s).filter((a) => !rec.exclusions.includes(a.id));
    const ranked = rankCandidates(s, pool, now);
    if (!ranked.length) {
      rec.actionId = null;
      rec.reason = '';
      return null;
    }
    rec.actionId = ranked[0].a.id;
    rec.reason = reasonFor(s, ranked[0].a, now);
    return ranked[0].a;
  }

  // Up to three alternatives to the current recommendation. Excluded actions are left out.
  function alternatives(s, now) {
    const rec = s.recommendation;
    const pool = eligibleActions(s).filter((a) => a.id !== rec.actionId && !rec.exclusions.includes(a.id));
    return rankCandidates(s, pool, now).slice(0, MAX_ALTERNATIVES).map((x) => x.a);
  }

  // Choose an alternative: the rejected suggestion is excluded until a fresh round. Never advances progress.
  function chooseAlternative(s, actionId, now) {
    const rec = s.recommendation;
    if (rec.actionId && rec.actionId !== actionId && !rec.exclusions.includes(rec.actionId)) {
      rec.exclusions.push(rec.actionId);
    }
    suspendCurrent(s, actionId);
    rec.actionId = actionId;
    rec.reason = reasonFor(s, actionById(s, actionId), now);
  }

  // Skip the current suggestion without choosing a replacement.
  function skipRecommendation(s, now) {
    const rec = s.recommendation;
    if (rec.actionId && !rec.exclusions.includes(rec.actionId)) rec.exclusions.push(rec.actionId);
    suspendCurrent(s, null);
    rec.actionId = null;
    return ensureRecommendation(s, now);
  }

  function allSkipped(s) {
    const pool = eligibleActions(s);
    return pool.length > 0 && pool.every((a) => s.recommendation.exclusions.includes(a.id));
  }

  function freshRound(s, now) {
    s.recommendation.exclusions = [];
    s.recommendation.actionId = null;
    return ensureRecommendation(s, now);
  }

  // ---------- attempts (PLAN §3 core loop) ----------

  function suspendCurrent(s, exceptActionId) {
    const cur = currentAttempt(s);
    if (cur && cur.actionId !== exceptActionId) cur.state = 'suspended';
  }

  // START: creates (or resumes) an attempt. Does not mark anything complete.
  function start(s, actionId, now) {
    const existing = currentAttempt(s);
    if (existing && existing.actionId === actionId) return existing;
    suspendCurrent(s, actionId);
    const a = actionById(s, actionId);
    const susp = suspendedAttemptFor(s, actionId);
    if (susp) {
      susp.state = 'current';
      susp.resumedAt = now;
      s.recommendation.actionId = actionId;
      return susp;
    }
    const att = {
      id: uid('t'),
      actionId,
      goalId: a.goalId,
      state: 'current',
      startedAt: now,
      endedAt: null,
      outcome: null,
      obstacle: null,
      resourceOpened: false,
      checkinShown: false,
    };
    s.attempts.push(att);
    s.recommendation.actionId = actionId;
    return att;
  }

  function recordLaunch(s, attemptId, now) {
    const att = s.attempts.find((a) => a.id === attemptId);
    if (att) att.resourceOpened = true;
    s.events.push({ type: 'launch', at: now, actionId: att ? att.actionId : null });
  }

  // Finish an attempt. Idempotent: a second call on the same attempt changes nothing.
  // outcome: 'finished' | 'progress' | 'stuck'
  // opts: { position, obstacle, nextText }
  function finish(s, attemptId, outcome, opts, now) {
    opts = opts || {};
    const att = s.attempts.find((a) => a.id === attemptId);
    if (!att || att.state === 'finished') return { changed: false };
    const action = actionById(s, att.actionId);
    att.state = 'finished';
    att.endedAt = now;
    att.outcome = outcome;
    if (outcome === 'stuck' && opts.obstacle) att.obstacle = opts.obstacle;
    let next = null;
    if (outcome === 'finished' && action) {
      action.done = true;
      action.doneAt = now;
      delete s.checkpoints[action.id];
      next = currentAction(s, action.goalId);
      if (!next && opts.nextText) next = addAction(s, action.goalId, { text: opts.nextText });
      s.recommendation.actionId = next ? next.id : null;
    } else if (outcome === 'progress' && action) {
      if (opts.position != null) setCheckpoint(s, action.id, opts.position, now);
      next = action;
    } else {
      next = action;
    }
    return { changed: true, next };
  }

  // After "Step finished" with no known next step.
  function setNextStep(s, goalId, text) {
    const g = goalById(s, goalId);
    if (!g) return null;
    if (!text || !text.trim()) {
      g.needsNext = true;
      return null;
    }
    return addAction(s, goalId, { text });
  }

  // Make it smaller: replace the small version of an action (same step, same checkpoint).
  function makeSmaller(s, actionId, small) {
    const a = actionById(s, actionId);
    if (a && small && small.trim()) a.small = small.trim();
  }

  // Ending the session clears temporary exclusions (PLAN §4).
  function endSession(s) {
    s.recommendation.exclusions = [];
  }

  // ---------- parked thoughts ----------

  function parkThought(s, text, attemptId, now) {
    text = (text || '').trim();
    if (!text) return null;
    const t = { id: uid('p'), text, at: now, attemptId: attemptId || null, status: 'new' };
    s.thoughts.push(t);
    return t;
  }

  function thoughtsFor(s, attemptId) {
    return s.thoughts.filter((t) => t.attemptId === attemptId && t.status === 'new');
  }

  function keepThought(s, id) {
    const t = s.thoughts.find((x) => x.id === id);
    if (t) t.status = 'kept';
  }

  function deleteThought(s, id) {
    s.thoughts = s.thoughts.filter((x) => x.id !== id);
  }

  function thoughtToGoal(s, id, now) {
    const t = s.thoughts.find((x) => x.id === id);
    if (!t) return null;
    const g = addGoal(s, { name: t.text, status: 'later' }, now);
    deleteThought(s, id);
    return g;
  }

  // ---------- reminders: pinned notes that change only when asked ----------

  function currentReminder(s) {
    const n = s.reminders.length;
    if (!n) return null;
    const i = ((s.reminderIndex % n) + n) % n;
    return { reminder: s.reminders[i], position: i + 1, total: n };
  }

  function nextReminder(s) {
    if (s.reminders.length) s.reminderIndex = (s.reminderIndex + 1) % s.reminders.length;
  }

  function addReminder(s, text) {
    text = (text || '').trim();
    if (!text) return null;
    const r = { id: uid('r'), text };
    s.reminders.push(r);
    return r;
  }

  function updateReminder(s, id, text) {
    const r = s.reminders.find((x) => x.id === id);
    if (r && text && text.trim()) r.text = text.trim();
  }

  // Deleting keeps the same reminder on screen where possible.
  function deleteReminder(s, id) {
    const showing = currentReminder(s);
    const i = s.reminders.findIndex((x) => x.id === id);
    if (i < 0) return;
    s.reminders.splice(i, 1);
    if (!s.reminders.length) { s.reminderIndex = 0; return; }
    const keep = showing && showing.reminder.id !== id ? s.reminders.findIndex((x) => x.id === showing.reminder.id) : Math.min(i, s.reminders.length - 1);
    s.reminderIndex = keep;
  }

  // Moves a reminder one place up (-1) or down (+1); the one showing stays showing.
  function moveReminder(s, id, dir) {
    const showing = currentReminder(s);
    const i = s.reminders.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= s.reminders.length) return;
    [s.reminders[i], s.reminders[j]] = [s.reminders[j], s.reminders[i]];
    if (showing) s.reminderIndex = s.reminders.findIndex((x) => x.id === showing.reminder.id);
  }

  // ---------- game layer: points, levels, streaks, quests, daily spin, milestones, records ----------
  // Points are derived from attempts, so finishing twice can never award twice.

  const POINTS = { start: 5, finished: 20, progress: 10, stuck: 5 };
  const LEVELS = [0, 50, 150, 300, 500, 800, 1200, 1700, 2300, 3000, 4000];
  const LEVEL_NAMES = ['Sprout', 'Starter', 'Mover', 'Builder', 'Climber', 'Explorer', 'Pathfinder', 'Trailblazer', 'Navigator', 'Captain', 'Legend'];
  const SPIN_PRIZES = [5, 10, 15, 10, 20, 25];
  const QUESTS = [
    { id: 'start1', text: 'Start any task', bonus: 15, done: (t) => t.starts >= 1 },
    { id: 'start2', text: 'Start two tasks today', bonus: 20, done: (t) => t.starts >= 2 },
    { id: 'finish1', text: 'Finish one step', bonus: 25, done: (t) => t.finished >= 1 },
    { id: 'progress1', text: 'Save your place on something', bonus: 15, done: (t) => t.progress >= 1 },
    { id: 'park1', text: 'Park a thought instead of acting on it', bonus: 15, done: (t) => t.parked >= 1 },
  ];
  const MILESTONES = [
    { id: 'first-start', icon: '🌅', name: 'First start', hint: 'Press Start once', test: (m) => m.starts >= 1 },
    { id: 'first-step', icon: '✅', name: 'First step done', hint: 'Finish a step', test: (m) => m.finished >= 1 },
    { id: 'honest', icon: '🤝', name: 'Honest check-in', hint: "Say when you didn't start", test: (m) => m.stuck >= 1 },
    { id: 'parked', icon: '💡', name: 'Thought parked', hint: 'Park a stray thought', test: (m) => m.parked >= 1 },
    { id: 'ten', icon: '🔟', name: 'Ten starts', hint: 'Start 10 times', test: (m) => m.starts >= 10 },
    { id: 'streak3', icon: '🔥', name: '3-day streak', hint: 'Start on 3 days in a row', test: (m) => m.bestStreak >= 3 },
    { id: 'comeback', icon: '🔁', name: 'Came back', hint: 'Start again after 3+ days away', test: (m) => m.comeback },
    { id: 'level3', icon: '🚀', name: 'Level 3', hint: 'Reach level 3', test: (m) => m.level >= 3 },
    { id: 'quarter', icon: '🏅', name: '25 starts', hint: 'Start 25 times', test: (m) => m.starts >= 25 },
    { id: 'streak7', icon: '🌟', name: '7-day streak', hint: 'Start on 7 days in a row', test: (m) => m.bestStreak >= 7 },
    { id: 'fifty', icon: '🏆', name: '50 starts', hint: 'Start 50 times', test: (m) => m.starts >= 50 },
  ];

  function dayKey(t) {
    const d = new Date(t);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function shiftDay(key, n) {
    const d = new Date(key + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return dayKey(d.getTime());
  }

  // Every point ever earned, with when and why.
  function pointsLog(s) {
    const log = [];
    for (const a of s.attempts) {
      log.push({ at: a.startedAt, points: POINTS.start, reason: 'Started' });
      if (a.outcome) log.push({ at: a.endedAt || a.startedAt, points: POINTS[a.outcome], reason: a.outcome === 'finished' ? 'Step done' : a.outcome === 'progress' ? 'Some progress' : 'Honest check-in' });
    }
    for (const q of Object.values(s.game.quests)) log.push({ at: q.at, points: q.bonus, reason: 'Daily quest' });
    for (const sp of Object.values(s.game.spins)) log.push({ at: sp.at, points: sp.points, reason: 'Daily spin' });
    return log;
  }

  function totalPoints(s) {
    return pointsLog(s).reduce((n, x) => n + x.points, 0);
  }

  // Points for one attempt so far (shown on the Saved screen).
  function attemptPoints(a) {
    return POINTS.start + (a.outcome ? POINTS[a.outcome] : 0);
  }

  function levelInfo(points) {
    let i = 0;
    while (i + 1 < LEVELS.length && points >= LEVELS[i + 1]) i++;
    const next = LEVELS[i + 1] != null ? LEVELS[i + 1] : null;
    return { level: i + 1, name: LEVEL_NAMES[i], points, floor: LEVELS[i], next };
  }

  // A streak counts days with at least one start. Today still counts as "alive" until it ends.
  function streaks(s, now) {
    const days = new Set(s.attempts.map((a) => dayKey(a.startedAt)));
    const today = dayKey(now);
    let cursor = days.has(today) ? today : shiftDay(today, -1);
    let current = 0;
    while (days.has(cursor)) { current++; cursor = shiftDay(cursor, -1); }
    const sorted = [...days].sort();
    let best = 0, run = 0, prev = null, comeback = false;
    for (const d of sorted) {
      if (prev && shiftDay(prev, 1) === d) run++;
      else {
        if (prev && (new Date(d) - new Date(prev)) / DAY >= 3) comeback = true;
        run = 1;
      }
      if (run > best) best = run;
      prev = d;
    }
    return { current, best, startedToday: days.has(today), comeback };
  }

  function todayCounts(s, now) {
    const k = dayKey(now);
    const atts = s.attempts.filter((a) => dayKey(a.startedAt) === k);
    return {
      starts: atts.length,
      finished: atts.filter((a) => a.outcome === 'finished').length,
      progress: atts.filter((a) => a.outcome === 'progress').length,
      parked: s.thoughts.filter((t) => dayKey(t.at) === k).length,
    };
  }

  // One quest per day, picked by date so it stays the same all day.
  function dailyQuest(s, now) {
    const k = dayKey(now);
    let hash = 0;
    for (const ch of k) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    const q = QUESTS[hash % QUESTS.length];
    const claimed = s.game.quests[k];
    return { id: q.id, text: q.text, bonus: q.bonus, complete: q.done(todayCounts(s, now)), claimed: !!claimed };
  }

  // Awards today's quest bonus once, when it is complete. Returns the bonus or 0.
  function claimQuest(s, now) {
    const q = dailyQuest(s, now);
    if (!q.complete || q.claimed) return 0;
    s.game.quests[dayKey(now)] = { id: q.id, bonus: q.bonus, at: now };
    return q.bonus;
  }

  // The daily spin unlocks after the first start of the day.
  function canSpin(s, now) {
    return todayCounts(s, now).starts >= 1 && !s.game.spins[dayKey(now)];
  }

  function spin(s, now, rand) {
    if (!canSpin(s, now)) return null;
    const index = Math.floor((rand == null ? Math.random() : rand) * SPIN_PRIZES.length) % SPIN_PRIZES.length;
    const points = SPIN_PRIZES[index];
    s.game.spins[dayKey(now)] = { points, at: now };
    return { index, points };
  }

  function milestoneStats(s, now) {
    const st = streaks(s, now);
    return {
      starts: s.attempts.length,
      finished: s.attempts.filter((a) => a.outcome === 'finished').length,
      stuck: s.attempts.filter((a) => a.outcome === 'stuck').length,
      parked: s.thoughts.length,
      bestStreak: st.best,
      comeback: st.comeback,
      level: levelInfo(totalPoints(s)).level,
    };
  }

  // Awards any newly reached milestones (each only once) and returns them.
  function checkMilestones(s, now) {
    const m = milestoneStats(s, now);
    const fresh = [];
    for (const def of MILESTONES) {
      if (!s.game.milestones[def.id] && def.test(m)) {
        s.game.milestones[def.id] = now;
        fresh.push(def);
      }
    }
    return fresh;
  }

  function milestoneList(s) {
    return MILESTONES.map((d) => ({ id: d.id, icon: d.icon, name: d.name, hint: d.hint, earnedAt: s.game.milestones[d.id] || null }));
  }

  // Personal records board: your own best days and weeks, never other people.
  function records(s) {
    const byDay = {};
    for (const x of pointsLog(s)) { const k = dayKey(x.at); byDay[k] = (byDay[k] || 0) + x.points; }
    const days = Object.entries(byDay).map(([day, points]) => ({ day, points })).sort((a, b) => b.points - a.points || (a.day < b.day ? 1 : -1));
    const byWeek = {};
    for (const { day, points } of days) {
      const d = new Date(day + 'T12:00:00');
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const wk = dayKey(d.getTime());
      byWeek[wk] = (byWeek[wk] || 0) + points;
    }
    const weeks = Object.entries(byWeek).map(([week, points]) => ({ week, points })).sort((a, b) => b.points - a.points);
    return { topDays: days.slice(0, 5), bestWeek: weeks[0] || null };
  }

  // Where the current step sits among a goal's known steps.
  function stepMap(s, goalId) {
    const all = goalActions(s, goalId);
    const done = all.filter((a) => a.done).length;
    const cur = all.find((a) => !a.done);
    return { done, total: all.length, position: cur ? done + 1 : done };
  }

  // ---------- return flow and evidence ----------

  // Records an app open and reports what kind of welcome to show.
  function recordOpen(s, now) {
    const prev = s.lastOpenAt;
    s.lastOpenAt = now;
    s.events.push({ type: 'open', at: now });
    if (s.events.length > 5000) s.events = s.events.slice(-5000);
    if (!prev) return 'first';
    const gap = (now - prev) / DAY;
    if (gap >= LONG_ABSENCE_DAYS) return 'long';
    if (gap >= WELCOME_BACK_DAYS) return 'back';
    return 'normal';
  }

  function passedDeadlines(s, now) {
    return s.goals.filter((g) => g.status === 'active' && g.deadline && daysUntil(g.deadline, now) < 0);
  }

  function isSameDay(a, b) {
    const x = new Date(a), y = new Date(b);
    return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
  }

  function today(s, now) {
    const atts = s.attempts.filter((a) => isSameDay(a.startedAt, now));
    return {
      starts: atts.length,
      finishedSteps: atts.filter((a) => a.outcome === 'finished').length,
      items: atts.map((a) => {
        const act = actionById(s, a.actionId);
        const g = goalById(s, a.goalId);
        return { goal: g ? g.name : '—', text: act ? act.text : '', outcome: a.outcome, state: a.state, at: a.startedAt };
      }),
    };
  }

  // Day-7 / day-14 review offer.
  function dueReview(s, now) {
    const days = (now - s.createdAt) / DAY;
    for (const d of [14, 7]) if (days >= d && !s.reviewsSeen.includes(d)) return d;
    return null;
  }

  function reviewStats(s, now) {
    const start = s.createdAt;
    const weeks = [];
    const nWeeks = Math.max(1, Math.ceil((now - start) / (7 * DAY)));
    for (let w = 0; w < nWeeks; w++) {
      const lo = start + w * 7 * DAY, hi = lo + 7 * DAY;
      const inW = (t) => t >= lo && t < hi;
      const atts = s.attempts.filter((a) => inW(a.startedAt));
      weeks.push({
        week: w + 1,
        opens: s.events.filter((e) => e.type === 'open' && inW(e.at)).length,
        launches: s.events.filter((e) => e.type === 'launch' && inW(e.at)).length,
        starts: atts.length,
        began: atts.filter((a) => a.outcome === 'finished' || a.outcome === 'progress').length,
        stuck: atts.filter((a) => a.outcome === 'stuck').length,
      });
    }
    const obstacles = {};
    for (const a of s.attempts) if (a.obstacle) obstacles[a.obstacle] = (obstacles[a.obstacle] || 0) + 1;
    return { weeks, obstacles };
  }

  // ---------- formatting ----------

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.getDate() + ' ' + MONTHS[d.getMonth()];
  }

  function formatElapsed(ms) {
    const m = Math.floor(ms / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + ' min ago';
    const h = Math.floor(m / 60);
    return h + ' h ' + (m % 60) + ' min ago';
  }

  function isUrl(str) {
    return /^(https?:\/\/|mailto:|tel:)/i.test((str || '').trim());
  }

  const api = {
    SCHEMA, DAY, GOAL_ICONS, GOAL_HUES, emptyState, seedState, parseState, normalize,
    goalById, actionById, goalActions, currentAction, currentAttempt, suspendedAttemptFor,
    addGoal, addAction, setCheckpoint, checkpointFor, setGoalStatus, deleteGoal,
    eligibleActions, goalsNeedingNext, ensureRecommendation, alternatives, chooseAlternative,
    skipRecommendation, allSkipped, freshRound,
    start, recordLaunch, finish, setNextStep, makeSmaller, endSession,
    parkThought, thoughtsFor, keepThought, deleteThought, thoughtToGoal,
    currentReminder, nextReminder, addReminder, updateReminder, deleteReminder, moveReminder,
    POINTS, SPIN_PRIZES, dayKey, pointsLog, totalPoints, attemptPoints, levelInfo, streaks, todayCounts,
    dailyQuest, claimQuest, canSpin, spin, checkMilestones, milestoneList, records, stepMap,
    recordOpen, passedDeadlines, today, dueReview, reviewStats,
    formatDate, formatElapsed, isUrl, daysUntil,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Core = api;
})(typeof self !== 'undefined' ? self : this);
