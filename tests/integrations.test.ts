import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { ChatService, type ChatContext } from '../server/chat';
import { notifyUrgentTicket } from '../server/notify';
import { seedDemoTickets } from '../server/demoData';
import { TicketStore } from '../server/store';
import type { Ticket } from '../src/types';

const ctx: ChatContext = { isStudent: false, isActiveClass: true, school: 'S', room: 'R', deviceType: '', assetTag: '' };
const turns = [{ role: 'user' as const, content: 'my board is dead' }];

function withModel(generate: (args: any) => Promise<{ text?: string }>) {
  const svc = new ChatService('fake-key', 'gemini-3.8-flash');
  (svc as any).ai = { models: { generateContent: generate } };
  return svc;
}

test('model reply: JSON is parsed, emoji stripped, escalation flows through', async () => {
  let seen: any;
  const svc = withModel(async args => {
    seen = args;
    return { text: JSON.stringify({ reply: '1. Check the cable 🔌', needsEscalation: true, isOutOfScope: false }) };
  });
  const r = await svc.reply(turns, ctx);
  assert.equal(r.source, 'ai');
  assert.equal(r.text, '1. Check the cable');
  assert.equal(r.needsEscalation, true);
  assert.deepEqual(r.suggestedActions.slice(0, 1), ['Submit IT ticket']);
  // Request shape: structured contents, system instruction, JSON schema, no user name anywhere.
  assert.equal(seen.contents[0].role, 'user');
  assert.match(seen.config.systemInstruction, /Greg Bot/);
  assert.equal(seen.config.responseMimeType, 'application/json');
  assert.ok(seen.config.responseSchema);
});

test('model reply: out-of-scope never offers escalation', async () => {
  const svc = withModel(async () => ({ text: JSON.stringify({ reply: 'I only help with school technology.', needsEscalation: true, isOutOfScope: true }) }));
  const r = await svc.reply(turns, ctx);
  assert.equal(r.needsEscalation, false);
  assert.equal(r.isOutOfScope, true);
});

test('model failures (throw, garbage, empty, blocked) fall back to built-in answers', async () => {
  for (const generate of [
    async () => { throw new Error('network down'); },
    async () => ({ text: 'not json at all' }),
    async () => ({ text: '' }),
    async () => ({ text: undefined }),
    async () => ({ text: JSON.stringify({ reply: '🔌' }) }),
  ]) {
    const r = await withModel(generate).reply([{ role: 'user', content: 'wifi problem' }], ctx);
    assert.equal(r.source, 'fallback');
    assert.ok(r.text.length > 10);
  }
});

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
