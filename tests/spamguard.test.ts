import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpamGuard, lockoutMessage } from '../server/spamGuard';
import { LIMITS } from '../server/config';

const MIN = 60_000;

test('the 3rd bad message warns, the 5th signs out and locks out for 15 minutes', () => {
  let t = 1_000_000;
  const g = new SpamGuard(() => t);
  assert.deepEqual([1, 2].map(() => g.strike('kid@d.test').action), ['none', 'none']);
  assert.deepEqual(g.strike('kid@d.test'), { strikes: 3, action: 'warn', remaining: 2 });
  assert.equal(g.strike('kid@d.test').action, 'warn');
  assert.equal(g.lockedUntil('kid@d.test'), null);
  assert.deepEqual(g.strike('KID@d.test'), { strikes: 5, action: 'sign_out', remaining: 0 });
  assert.equal(g.lockedUntil('kid@d.test'), t + 15 * MIN);
  assert.equal(g.retryAfterSeconds('kid@d.test'), 15 * 60);
  assert.equal(g.lockedUntil('other@d.test'), null, 'other students are not affected');

  t += 15 * MIN - 1;
  assert.notEqual(g.lockedUntil('kid@d.test'), null);
  t += 1;
  assert.equal(g.lockedUntil('kid@d.test'), null, 'the lockout ends after 15 minutes');
  assert.equal(g.strike('kid@d.test').action, 'none', 'and the count starts again');
});

test('strikes older than the strike window are forgotten', () => {
  let t = 0;
  const g = new SpamGuard(() => t);
  g.strike('a@d.test');
  g.strike('a@d.test');
  t += LIMITS.spam.strikeWindowMs;
  assert.equal(g.strike('a@d.test').strikes, 1);
});

test('the same message again is a repeat, until the repeat window passes; nothing is stored as text', () => {
  let t = 0;
  const g = new SpamGuard(() => t);
  assert.equal(g.isRepeat('a@d.test', 'my wifi is broken'), false);
  assert.equal(g.isRepeat('a@d.test', '  My  WIFI is broken '), true, 'case and spacing do not matter');
  assert.equal(g.isRepeat('b@d.test', 'my wifi is broken'), false, 'per student');
  assert.equal(g.isRepeat('a@d.test', 'something different'), false);
  t += LIMITS.spam.repeatWindowMs;
  assert.equal(g.isRepeat('a@d.test', 'something different'), false);
  assert.ok(!JSON.stringify([...(g as unknown as { last: Map<string, unknown> }).last.values()]).includes('different'));
});

test('the lockout message is in English and Spanish with the minutes left', () => {
  const m = lockoutMessage(14 * 60 + 1);
  assert.match(m, /15 minutes/);
  assert.match(m, /15 minutos/);
  assert.match(lockoutMessage(30), /1 minute\./);
});
