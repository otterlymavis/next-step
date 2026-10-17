// Phase 2 acceptance gates (PLAN §6), run with: node --test app/test/*.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../core.js');

const T0 = new Date('2026-10-17T10:00:00').getTime();
const MIN = 60 * 1000;
const roundtrip = (s) => C.parseState(JSON.stringify(s)).state;

test('fresh selection is stable and picks an active goal', () => {
  const s = C.seedState(T0);
  const a = C.ensureRecommendation(s, T0);
  assert.equal(C.goalById(s, a.goalId).name, 'Automatic Control');
  assert.equal(C.ensureRecommendation(s, T0 + MIN).id, a.id, 'does not reshuffle on refresh');
});

test('finishing advances exactly once, even if called twice', () => {
  const s = C.seedState(T0);
  const a = C.ensureRecommendation(s, T0);
  const att = C.start(s, a.id, T0);
  assert.equal(C.actionById(s, a.id).done, false, 'START does not complete');
  C.finish(s, att.id, 'finished', {}, T0 + 10 * MIN);
  const second = C.finish(s, att.id, 'finished', {}, T0 + 11 * MIN);
  assert.equal(second.changed, false);
  const done = s.actions.filter((x) => x.goalId === a.goalId && x.done);
  assert.equal(done.length, 1);
  assert.match(C.currentAction(s, a.goalId).text, /lecture 5/);
});

test('partial progress keeps the step and updates the restart point', () => {
  const s = C.seedState(T0);
  const a = C.ensureRecommendation(s, T0);
  const att = C.start(s, a.id, T0);
  C.finish(s, att.id, 'progress', { position: 'Lecture 4 · Resume at 18:10' }, T0 + 5 * MIN);
  assert.equal(C.actionById(s, a.id).done, false);
  assert.equal(C.checkpointFor(s, a.id), 'Lecture 4 · Resume at 18:10');
});

test("didn't get going leaves progress unchanged and records an obstacle", () => {
  const s = C.seedState(T0);
  const a = C.ensureRecommendation(s, T0);
  const before = C.checkpointFor(s, a.id);
  const att = C.start(s, a.id, T0);
  C.finish(s, att.id, 'stuck', { obstacle: 'too big' }, T0 + MIN);
  assert.equal(C.actionById(s, a.id).done, false);
  assert.equal(C.checkpointFor(s, a.id), before);
  assert.equal(att.obstacle, 'too big');
});

test('skipping never advances and the exclusion survives a reload', () => {
  let s = C.seedState(T0);
  const first = C.ensureRecommendation(s, T0);
  const next = C.skipRecommendation(s, T0);
  assert.notEqual(next.id, first.id);
  assert.equal(C.actionById(s, first.id).done, false);
  s = roundtrip(s);
  assert.equal(C.ensureRecommendation(s, T0).id, next.id);
  C.endSession(s);
  assert.equal(s.recommendation.exclusions.length, 0);
});

test('alternatives are capped at three', () => {
  const s = C.seedState(T0);
  for (let i = 0; i < 4; i++) {
    const g = C.addGoal(s, { name: 'Extra ' + i }, T0 + 10 + i);
    C.addAction(s, g.id, { text: 'Do thing ' + i });
  }
  C.ensureRecommendation(s, T0);
  assert.equal(C.alternatives(s, T0).length, 3);
});

test('switching mid-attempt suspends it and reopening respects the switch', () => {
  let s = C.seedState(T0);
  const a = C.ensureRecommendation(s, T0);
  const att = C.start(s, a.id, T0);
  const alt = C.alternatives(s, T0)[0];
  C.chooseAlternative(s, alt.id, T0 + MIN);
  assert.equal(att.state, 'suspended');
  s = roundtrip(s);
  assert.equal(C.currentAttempt(s), null);
  assert.equal(C.ensureRecommendation(s, T0 + 2 * MIN).id, alt.id);
  // selecting the suspended action later resumes its attempt and checkpoint
  C.endSession(s);
  const resumed = C.start(s, a.id, T0 + 60 * MIN);
  assert.equal(resumed.id, att.id);
  assert.equal(C.checkpointFor(s, a.id), 'Lecture 4 · Resume at 12:40');
});

test('pause persists and removes the goal from recommendations', () => {
  let s = C.seedState(T0);
  const a = C.ensureRecommendation(s, T0);
  C.setGoalStatus(s, a.goalId, 'paused');
  s = roundtrip(s);
  const b = C.ensureRecommendation(s, T0);
  assert.notEqual(b.goalId, a.goalId);
});

test('an unfinished attempt is restored after closing', () => {
  let s = C.seedState(T0);
  const a = C.ensureRecommendation(s, T0);
  C.start(s, a.id, T0);
  s = roundtrip(s);
  const cur = C.currentAttempt(s);
  assert.equal(cur.actionId, a.id);
  assert.equal(C.ensureRecommendation(s, T0 + 5 * C.DAY).id, a.id);
});

test('all actions skipped is detectable instead of cycling', () => {
  const s = C.seedState(T0);
  C.ensureRecommendation(s, T0);
  C.skipRecommendation(s, T0);
  C.skipRecommendation(s, T0);
  const last = C.skipRecommendation(s, T0);
  assert.equal(last, null);
  assert.equal(C.allSkipped(s), true);
  assert.ok(C.freshRound(s, T0));
});

test('no active goals produces no fabricated recommendation', () => {
  const s = C.emptyState(T0);
  assert.equal(C.ensureRecommendation(s, T0), null);
  const g = C.addGoal(s, { name: 'Later thing', status: 'later' }, T0);
  assert.equal(C.ensureRecommendation(s, T0), null);
  C.setGoalStatus(s, g.id, 'active');
  assert.equal(C.ensureRecommendation(s, T0), null, 'goal without an action still has nothing to start');
  assert.equal(C.goalsNeedingNext(s).length, 1);
});

test('finishing the last step without a next one asks, or defers', () => {
  const s = C.seedState(T0);
  const guitar = s.goals.find((g) => g.name === 'Guitar');
  const a = C.currentAction(s, guitar.id);
  const att = C.start(s, a.id, T0);
  const r = C.finish(s, att.id, 'finished', {}, T0 + MIN);
  assert.equal(r.next, null);
  C.setNextStep(s, guitar.id, '');
  assert.equal(guitar.needsNext, true);
  C.setNextStep(s, guitar.id, 'Learn the bridge section');
  assert.equal(guitar.needsNext, false);
  assert.equal(C.currentAction(s, guitar.id).text, 'Learn the bridge section');
});

test('an approaching deadline is preferred on a fresh selection', () => {
  const s = C.seedState(T0);
  const c = s.goals.find((g) => g.name === 'C — Pointers');
  c.deadline = '2026-10-25';
  c.deadlineLabel = 'Exam';
  const a = C.ensureRecommendation(s, T0);
  assert.equal(a.goalId, c.id);
  assert.match(s.recommendation.reason, /Exam on 25 Oct/);
});

test('rotation favours goals with less recent attention', () => {
  const s = C.seedState(T0);
  const a = C.ensureRecommendation(s, T0);
  const att = C.start(s, a.id, T0);
  C.finish(s, att.id, 'progress', { position: 'x' }, T0 + MIN);
  C.endSession(s);
  s.recommendation.actionId = null;
  const b = C.ensureRecommendation(s, T0 + 2 * MIN);
  assert.notEqual(b.goalId, a.goalId);
});

test('unreadable saved data is reported, not replaced', () => {
  const r = C.parseState('{not json');
  assert.ok(r.error);
  assert.equal(r.raw, '{not json');
  assert.ok(C.parseState('{"foo":1}').error);
});

test('return flow detects gaps', () => {
  const s = C.seedState(T0);
  assert.equal(C.recordOpen(s, T0), 'first');
  assert.equal(C.recordOpen(s, T0 + C.DAY / 2), 'normal');
  assert.equal(C.recordOpen(s, T0 + 6 * C.DAY), 'back');
  assert.equal(C.recordOpen(s, T0 + 40 * C.DAY), 'long');
});

test('parked thoughts belong to their attempt and can become goals', () => {
  const s = C.seedState(T0);
  const a = C.ensureRecommendation(s, T0);
  const att = C.start(s, a.id, T0);
  C.parkThought(s, 'Email the professor', att.id, T0);
  C.parkThought(s, 'Buy strings', att.id, T0);
  assert.equal(C.thoughtsFor(s, att.id).length, 2);
  const [t1, t2] = C.thoughtsFor(s, att.id);
  const g = C.thoughtToGoal(s, t1.id, T0);
  assert.equal(g.status, 'later');
  C.keepThought(s, t2.id);
  assert.equal(C.thoughtsFor(s, att.id).length, 0);
});

test('reminders change only when asked, and survive edits and reloads', () => {
  let s = C.seedState(T0);
  assert.equal(C.currentReminder(s), null, 'no strip without reminders');
  C.addReminder(s, 'Why I am doing this');
  C.addReminder(s, 'Drink water first');
  C.addReminder(s, '   ');
  assert.equal(s.reminders.length, 2, 'blank reminders are ignored');
  assert.deepEqual([C.currentReminder(s).position, C.currentReminder(s).total], [1, 2]);
  C.nextReminder(s);
  assert.equal(C.currentReminder(s).reminder.text, 'Drink water first');
  C.nextReminder(s);
  assert.equal(C.currentReminder(s).position, 1, 'wraps around');
  // moving keeps the same reminder showing
  C.moveReminder(s, s.reminders[0].id, +1);
  assert.equal(C.currentReminder(s).reminder.text, 'Why I am doing this');
  assert.equal(C.currentReminder(s).position, 2);
  // deleting another keeps the showing one
  C.deleteReminder(s, s.reminders[0].id);
  assert.equal(C.currentReminder(s).reminder.text, 'Why I am doing this');
  s = roundtrip(s);
  assert.equal(C.currentReminder(s).reminder.text, 'Why I am doing this');
  C.deleteReminder(s, s.reminders[0].id);
  assert.equal(C.currentReminder(s), null);
});
