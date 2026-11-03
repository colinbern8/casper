import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAnalytics, quantile } from '../server/analytics';
import type { SupportCase, Ticket } from '../src/types';
import { startServer } from './helpers';
import { formatHours } from '../src/data/format';

const NOW = new Date('2026-11-02T15:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

let n = 0;
const ticket = (over: Partial<Ticket>): Ticket => ({
  id: `t${++n}`, ticketNumber: `T-${n}`, createdAt: hoursAgo(10), userRole: 'teacher_prep', userName: 'A', userEmail: 'a@d.test',
  school: 'North', room: '1', category: 'network', title: 'x', description: 'x', troubleshootStepsAttempted: [],
  priority: 'high', priorityReason: '', status: 'open', ...over,
});
const kase = (outcome: SupportCase['outcome'], createdAt = hoursAgo(5)) => ({ outcome, createdAt }) as SupportCase;

test('quantile uses the nearest rank and handles empty input', () => {
  assert.equal(quantile([], 0.5), null);
  assert.equal(quantile([4], 0.9), 4);
  assert.equal(quantile([1, 2, 3, 4], 0.5), 2);
  assert.equal(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9), 9);
});

test('analytics: per school, time to resolve by priority, top categories, self-help rate, last 30 days only', () => {
  const tickets = [
    ticket({ school: 'North', priority: 'critical', status: 'resolved', createdAt: hoursAgo(10), resolvedAt: hoursAgo(9), category: 'smartboard' }),
    ticket({ school: 'North', priority: 'critical', status: 'resolved', createdAt: hoursAgo(10), resolvedAt: hoursAgo(7), category: 'smartboard' }),
    ticket({ school: 'North', priority: 'high', status: 'resolved', createdAt: hoursAgo(30), resolvedAt: hoursAgo(6) }),
    ticket({ school: 'South', status: 'open', category: 'printer' }),
    ticket({ school: 'South', status: 'in_progress', category: 'smartboard' }),
    ticket({ school: 'Old', status: 'resolved', createdAt: hoursAgo(24 * 40), resolvedAt: hoursAgo(24 * 39) }),
  ];
  const cases = [kase('resolved'), kase('resolved'), kase('resolved'), kase('escalated'), kase('blocked'), kase('open'), kase('resolved', hoursAgo(24 * 31))];
  const a = computeAnalytics(tickets, cases, NOW);

  assert.deepEqual(a.totals, { tickets: 5, open: 2, resolved: 3, medianHoursToResolve: 3 });
  assert.deepEqual(a.perSchool, [{ school: 'North', open: 0, resolved: 3 }, { school: 'South', open: 2, resolved: 0 }]);
  assert.deepEqual(a.timeToResolve, [
    { priority: 'critical', resolved: 2, medianHours: 1, p90Hours: 3 },
    { priority: 'high', resolved: 1, medianHours: 24, p90Hours: 24 },
  ]);
  assert.deepEqual(a.topCategories, [{ category: 'smartboard', count: 3 }, { category: 'network', count: 1 }, { category: 'printer', count: 1 }]);
  assert.deepEqual(a.selfHelp, { resolved: 3, escalated: 1, blocked: 1, open: 1, selfResolvedRate: 0.6 });
  assert.equal(computeAnalytics([], [], NOW).selfHelp.selfResolvedRate, null, 'no division by zero');
});

test('analytics route: admins only', async () => {
  const { call, login, users } = await startServer();
  users.set('tech@d.test', 'tech', 'boss@d.test');
  assert.equal((await call('GET', '/api/admin/analytics', undefined, await login('tech@d.test'))).status, 403);
  const ok = await call('GET', '/api/admin/analytics', undefined, await login('boss@d.test'));
  assert.equal(ok.status, 200);
  assert.equal(ok.body.days, 30);
});

test('durations read as minutes, hours or days', () => {
  assert.equal(formatHours(null), 'n/a');
  assert.equal(formatHours(0.25), '15 min');
  assert.equal(formatHours(5.04), '5.0 h');
  assert.equal(formatHours(72), '3.0 days');
});
