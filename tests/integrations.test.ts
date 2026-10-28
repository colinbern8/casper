import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { notifyUrgentTicket } from '../server/notify';
import { createApp } from '../server/app';
import { loadConfig } from '../server/config';
import { UserStore } from '../server/users';
import { seedDemoTickets } from '../server/demoData';
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

test('demo seed data uses valid schools and only seeds an empty store', () => {
  const store = new TicketStore(null);
  seedDemoTickets(store, { domain: 'a.org' });
  assert.equal(store.size, 3);
  seedDemoTickets(store, { domain: 'a.org' });
  assert.equal(store.size, 3);
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
