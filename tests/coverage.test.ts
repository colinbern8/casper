import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startServer } from './helpers';
import { PresenceStore } from '../server/presence';
import { SCHOOLS, routeFor } from '../src/data/schools';

const staffTicket = (school = 'Hamilton High School West') => ({
  userRole: 'teacher_prep', school, room: 'Room 104', category: 'smartboard', title: 'Board blank', description: 'No signal on the board.',
});

test('routing: the lead technician, the backup while the lead is away, the shared queue when both are', () => {
  const school = SCHOOLS.find(s => s.name === 'Hamilton High School West')!;
  assert.deepEqual(routeFor(school, () => false), { tech: 'Marcus Vance' });
  const backup = routeFor(school, n => n === 'Marcus Vance');
  assert.equal(backup.tech, 'Priya Shah');
  assert.match(backup.note!, /Marcus Vance is marked away/);
  const shared = routeFor(school, () => true);
  assert.equal(shared.tech, '');
  assert.match(shared.note!, /shared Hamilton High School West queue/);
});

test('away status: a technician marks only themselves away, it changes routing, and it survives a restart', async () => {
  const { call, login, users } = await startServer();
  users.set('marcus@d.test', 'tech', 'boss@d.test');
  const marcus = await login('marcus@d.test', 'Marcus Vance');
  const teacher = await login('t@d.test', 'Teacher T');
  users.set('t@d.test', 'staff', 'boss@d.test');

  assert.equal((await call('PUT', '/api/techs/me', { away: 'yes' }, marcus)).status, 400);
  assert.equal((await call('PUT', '/api/techs/me', { away: true }, teacher)).status, 403, 'staff cannot set presence');
  const set = await call('PUT', '/api/techs/me', { away: true, name: 'Leo Ortiz' }, marcus);
  assert.equal(set.body.name, 'Marcus Vance', 'the name comes from the session, never the body');
  assert.equal(set.body.away, true);

  const list = await call('GET', '/api/techs', undefined, marcus);
  assert.equal(list.body.me, 'Marcus Vance');
  const row = list.body.technicians.find((t: { name: string }) => t.name === 'Marcus Vance');
  assert.deepEqual([row.away, row.leads], [true, ['Hamilton High School West']]);
  assert.equal(list.body.technicians.find((t: { name: string }) => t.name === 'Leo Ortiz').away, false);

  const routed = await call('POST', '/api/tickets', staffTicket(), teacher);
  assert.equal(routed.status, 201);
  assert.equal(routed.body.assignedTech, 'Priya Shah');
  assert.match(routed.body.techNotes, /Routed to backup Priya Shah/);

  await call('PUT', '/api/techs/me', { away: false }, marcus);
  assert.equal((await call('POST', '/api/tickets', staffTicket(), teacher)).body.assignedTech, 'Marcus Vance');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'presence-'));
  const file = path.join(dir, 'presence.json');
  new PresenceStore(file).set('Leo Ortiz', true);
  assert.equal(new PresenceStore(file).isAway('Leo Ortiz'), true);
});

test('claim: a technician takes a ticket from the shared queue or a colleague; students and staff cannot', async () => {
  const { call, login, users } = await startServer();
  users.set('sam@d.test', 'tech', 'boss@d.test');
  users.set('t@d.test', 'staff', 'boss@d.test');
  const sam = await login('sam@d.test', 'Sam Okafor');
  const teacher = await login('t@d.test', 'Teacher T');
  const kid = await login('kid@d.test');
  const ticket = (await call('POST', '/api/tickets', staffTicket(), teacher)).body;
  assert.equal(ticket.assignedTech, 'Marcus Vance');

  assert.equal((await call('POST', `/api/tickets/${ticket.id}/claim`, {}, kid)).status, 403);
  assert.equal((await call('POST', `/api/tickets/${ticket.id}/claim`, {}, teacher)).status, 403);
  assert.equal((await call('POST', '/api/tickets/nope/claim', {}, sam)).status, 404);

  const claimed = await call('POST', `/api/tickets/${ticket.id}/claim`, { assignedTech: 'Leo Ortiz' }, sam);
  assert.equal(claimed.status, 200);
  assert.equal(claimed.body.assignedTech, 'Sam Okafor', 'always the signed-in technician');
  assert.equal(claimed.body.status, 'assigned');
  assert.match(claimed.body.techNotes, /Sam Okafor\] Claimed this ticket from Marcus Vance/);
  assert.equal((await call('POST', `/api/tickets/${ticket.id}/claim`, {}, sam)).body.techNotes, claimed.body.techNotes, 'claiming twice changes nothing');

  // A technician may assign a ticket to themselves by name even if they are not on the school roster.
  assert.equal((await call('PATCH', `/api/tickets/${ticket.id}`, { assignedTech: 'Sam Okafor' }, sam)).status, 200);
  assert.equal((await call('PATCH', `/api/tickets/${ticket.id}`, { assignedTech: 'Somebody Else' }, sam)).status, 400);

  await call('PATCH', `/api/tickets/${ticket.id}`, { status: 'resolved' }, sam);
  assert.equal((await call('POST', `/api/tickets/${ticket.id}/claim`, {}, sam)).status, 409);
});

test('self-help cases: technicians list fixed and blocked student chats; students cannot', async () => {
  const { call, login, users } = await startServer({ env: { DEMO_MODE: 'true' } });
  users.set('sam@d.test', 'tech', 'boss@d.test');
  const sam = await login('sam@d.test', 'Sam Okafor');
  const kid = await login('demo.student@d.test');
  const c = (await call('POST', '/api/support/cases', { language: 'es', issueId: 'wifi' }, kid)).body;
  await call('POST', `/api/support/cases/${c.id}/attempts`, { stepId: 'wifi-restart', result: 'worked' }, kid);
  await call('POST', '/api/support/cases', { language: 'en', issueId: 'power' }, kid);

  assert.equal((await call('GET', '/api/support/cases', undefined, kid)).status, 403);
  const fixed = await call('GET', '/api/support/cases', undefined, sam);
  assert.deepEqual(fixed.body.map((x: { outcome: string }) => x.outcome), ['resolved'], 'default: fixed and blocked only');
  assert.equal(fixed.body[0].language, 'es');
  assert.equal((await call('GET', '/api/support/cases?outcome=all', undefined, sam)).body.length, 2);
});
