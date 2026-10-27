import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { loadConfig } from '../server/config';
import { createApp } from '../server/app';
import { TicketStore } from '../server/store';
import { UserStore } from '../server/users';

const servers: Server[] = [];
after(() => servers.forEach(s => s.close()));

const prod = { NODE_ENV: 'production', GOOGLE_CLIENT_ID: 'x', SESSION_SECRET: 'y', ADMIN_EMAILS: 'a@d.test' } as NodeJS.ProcessEnv;
const ticket = (role: 'student' | 'staff') => ({
  userRole: role, userName: 'N', userEmail: 'n@d.test', school: 'S', room: 'R', category: 'other' as const,
  title: 'T', description: 'D', troubleshootStepsAttempted: [], priority: 'medium' as const, priorityReason: 'r', status: 'open' as const,
});

test('config: production refuses DEMO_MODE, development allows it', () => {
  assert.throws(() => loadConfig({ ...prod, DEMO_MODE: 'true' }), /DEMO_MODE/);
  assert.equal(loadConfig({ ...prod }).demoMode, false);
  assert.equal(loadConfig({ DEMO_MODE: 'true' } as NodeJS.ProcessEnv).demoMode, true);
});

test('config: district name and ticket prefix default to the current values, can be overridden, and are validated', () => {
  const d = loadConfig({} as NodeJS.ProcessEnv);
  assert.equal(d.districtName, 'Hamilton Township School District');
  assert.equal(d.ticketPrefix, 'HTSD');
  const o = loadConfig({ DISTRICT_NAME: ' Example Schools ', TICKET_PREFIX: 'ex1' } as NodeJS.ProcessEnv);
  assert.equal(o.districtName, 'Example Schools');
  assert.equal(o.ticketPrefix, 'EX1');
  for (const bad of ['A', 'TOOLONGPREFIX', 'AB-C', 'a b']) {
    assert.throws(() => loadConfig({ TICKET_PREFIX: bad } as NodeJS.ProcessEnv), /TICKET_PREFIX/, bad);
  }
});

test('ticket numbers use the configured prefix and keep the default when none is given', () => {
  const custom = new TicketStore(null, 'EX1');
  assert.match(custom.create(ticket('student')).ticketNumber, /^EX1-STU-0001$/);
  assert.match(custom.create(ticket('staff')).ticketNumber, /^EX1-\d{4}-0002$/);
  assert.match(new TicketStore(null).create(ticket('student')).ticketNumber, /^HTSD-STU-0001$/);
});

test('public config exposes the district name for the client', async () => {
  const config = loadConfig({ DEV_LOGIN: 'true', SESSION_SECRET: 's', DISTRICT_DOMAIN: 'd.test', DISTRICT_NAME: 'Example Schools' } as NodeJS.ProcessEnv);
  const app = createApp({ config, store: new TicketStore(null), users: new UserStore(null, []) });
  const server: Server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
  servers.push(server);
  const res = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/config`);
  assert.equal((await res.json() as any).districtName, 'Example Schools');
});

test('config: the student open-request limit defaults to one and rejects nonsense', () => {
  assert.equal(loadConfig({} as NodeJS.ProcessEnv).studentOpenTicketLimit, 1);
  assert.equal(loadConfig({ STUDENT_OPEN_TICKET_LIMIT: '3' } as NodeJS.ProcessEnv).studentOpenTicketLimit, 3);
  for (const bad of ['0', '11', '1.5', 'many', '-1']) {
    assert.throws(() => loadConfig({ STUDENT_OPEN_TICKET_LIMIT: bad } as NodeJS.ProcessEnv), /STUDENT_OPEN_TICKET_LIMIT/, bad);
  }
});
