import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { notifyUrgentTicket } from '../server/notify';
import { createApp } from '../server/app';
import { loadConfig } from '../server/config';
import { UserStore } from '../server/users';
import { demoNameFor, seedDemoData } from '../server/demoData';
import { CaseStore } from '../server/cases';
import { PresenceStore } from '../server/presence';
import { findSchool } from '../src/data/schools';
import { computeAnalytics } from '../server/analytics';
import { TicketStore } from '../server/store';
import type { Ticket } from '../src/types';

const ticket = (over: Partial<Ticket> = {}): Ticket => ({
  id: 'i', ticketNumber: 'HTSD-2026-0001', createdAt: new Date().toISOString(), userRole: 'teacher_active', userName: 'Secret Name',
  userEmail: 'secret@x.org', school: 'Hamilton High School West', room: 'Room 104', category: 'smartboard', title: 'Board blank',
  description: 'desc', troubleshootStepsAttempted: [], priority: 'critical', priorityReason: 'r', status: 'open', assignedTech: 'Marcus Vance', ...over,
});

test('webhook: urgent staff tickets notify without personal data; students and low priority do not', async () => {
  const received: string[] = [];
  const srv = http.createServer((req, res) => {
    let b = '';
    req.on('data', c => (b += c));
    req.on('end', () => { received.push(b); res.end('ok'); });
  });
  await new Promise<void>(r => srv.listen(0, r));
  const url = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/hook`;

  await notifyUrgentTicket(url, ticket());
  await notifyUrgentTicket(url, ticket({ priority: 'medium' }));
  await notifyUrgentTicket(url, ticket({ userRole: 'student', priority: 'high' }));
  await notifyUrgentTicket(undefined, ticket());
  assert.equal(received.length, 1);
  assert.match(received[0], /PRIORITY 1/);
  assert.match(received[0], /Room 104/);
  assert.ok(!received[0].includes('Secret Name') && !received[0].includes('secret@x.org'));

  srv.close();
  // A dead webhook must never throw into ticket creation.
  await assert.doesNotReject(notifyUrgentTicket('http://127.0.0.1:1/dead', ticket()));
});

test('demo seed data: valid, the same every time, fills every screen, and only seeds empty stores', () => {
  const now = new Date('2026-11-02T15:00:00Z');
  const make = () => {
    const store = new TicketStore(null);
    const cases = new CaseStore(null);
    const presence = new PresenceStore(null);
    seedDemoData({ store, cases, presence, cfg: { domain: 'a.org' }, now });
    return { store, cases, presence };
  };
  const { store, cases, presence } = make();
  const tickets = store.list();
  assert.ok(tickets.length > 40 && cases.size > 40);
  assert.deepEqual(make().store.list().map(t => [t.ticketNumber, t.title, t.status]), tickets.map(t => [t.ticketNumber, t.title, t.status]), 'deterministic');
  for (const t of tickets) {
    assert.ok(findSchool(t.school), `unknown school ${t.school}`);
    assert.ok(t.createdAt <= now.toISOString() && (!t.resolvedAt || (t.resolvedAt >= t.createdAt && t.resolvedAt <= now.toISOString())), t.ticketNumber);
    assert.equal(t.status === 'resolved', !!t.resolvedAt, t.ticketNumber);
    if (t.caseId) assert.equal(cases.get(t.caseId)?.ticketId, t.id);
  }
  // Something for each new screen: shared queue, the demo teacher's requests, students waiting, self-help, coverage.
  assert.ok(tickets.some(t => t.status !== 'resolved' && !t.assignedTech), 'an unclaimed ticket in a shared queue');
  assert.ok(tickets.some(t => t.userEmail === 'demo.teacher@a.org' && t.status !== 'resolved'));
  assert.ok(tickets.some(t => t.userRole === 'student' && t.status === 'open' && t.caseId));
  assert.ok(!tickets.some(t => t.userEmail.startsWith('demo.student')), 'the demo students start with no open request');
  assert.ok(cases.list().some(c => c.outcome === 'resolved') && cases.list().some(c => c.outcome === 'blocked'));
  assert.ok(cases.list().every(c => c.createdAt <= now.toISOString() && c.updatedAt <= now.toISOString()), 'nothing in the future');
  assert.equal(presence.isAway('Leo Ortiz'), true);
  const a = computeAnalytics(tickets, cases.list(), now);
  assert.ok(a.perSchool.length >= 4 && a.timeToResolve.length >= 3 && a.topCategories.length >= 5);
  assert.ok(a.selfHelp.selfResolvedRate! > 0.3 && a.selfHelp.selfResolvedRate! < 0.8);

  const size = store.size;
  seedDemoData({ store, cases, presence, cfg: { domain: 'a.org' }, now });
  assert.equal(store.size, size, 'never seeds a store that has data');
  assert.equal(demoNameFor('demo.tech@a.org', 'a.org'), 'Sam Okafor');
  assert.equal(demoNameFor('demo.student@a.org', 'a.org'), 'Alex Sample');
  assert.equal(demoNameFor('someone@a.org', 'a.org'), undefined);
});

test('webhook: a failed first attempt is retried once', async () => {
  let hits = 0;
  const srv = http.createServer((_req, res) => {
    hits += 1;
    res.statusCode = hits === 1 ? 500 : 200;
    res.end('x');
  });
  await new Promise<void>(r => srv.listen(0, r));
  await notifyUrgentTicket(`http://127.0.0.1:${(srv.address() as AddressInfo).port}/hook`, ticket(), 1);
  assert.equal(hits, 2);
  srv.close();
});

test('health: reports 503 when the supplied check throws', async () => {
  const config = loadConfig({ NODE_ENV: 'development' } as NodeJS.ProcessEnv);
  let broken = false;
  const app = createApp({
    config,
    store: new TicketStore(null),
    users: new UserStore(null, []),
    healthCheck: () => { if (broken) throw new Error('disk full'); },
  });
  const srv = await new Promise<http.Server>(resolve => { const s = app.listen(0, () => resolve(s)); });
  const url = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/api/health`;
  assert.equal((await fetch(url)).status, 200);
  broken = true;
  const res = await fetch(url);
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { ok: false });
  srv.close();
});
