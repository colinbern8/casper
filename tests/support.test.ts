import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { loadConfig } from '../server/config';
import { createApp } from '../server/app';
import { TicketStore } from '../server/store';
import { CaseStore } from '../server/cases';
import { UserStore } from '../server/users';
import { SlidingWindowLimiter } from '../server/rateLimit';
import { checkDevice, DEMO_STUDENTS } from '../server/supportFixtures';
import { SUPPORT_ISSUES } from '../src/data/supportContent';
import { SUPPORT_ISSUE_IDS } from '../src/types';

const servers: Server[] = [];
after(() => servers.forEach(s => s.close()));

async function start(env: Record<string, string> = { DEMO_MODE: 'true' }) {
  const config = loadConfig({
    DEV_LOGIN: 'true',
    SESSION_SECRET: 'test-secret',
    DISTRICT_DOMAIN: 'd.test',
    ADMIN_EMAILS: 'boss@d.test',
    ...env,
  } as NodeJS.ProcessEnv);
  const users = new UserStore(null, config.adminEmails);
  const store = new TicketStore(null);
  const app = createApp({
    config,
    store,
    users,
    cases: new CaseStore(null),
    limiter: new SlidingWindowLimiter(),
  });
  const server: Server = await new Promise(resolve => {
    const s = app.listen(0, () => resolve(s));
  });
  servers.push(server);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (method: string, p: string, body?: unknown, cookie?: string) => {
    const res = await fetch(base + p, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json().catch(() => null)) as any };
  };
  const login = async (email: string, name?: string) => {
    const res = await fetch(base + '/api/auth/dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });
    assert.equal(res.status, 200);
    return res.headers.get('set-cookie')!.split(';')[0];
  };
  return { call, login, users, store };
}

const S = '/api/support/cases';

test('support routes do not exist unless DEMO_MODE is on, and need a session when it is', async () => {
  const off = await start({});
  const kid = await off.login('demo.student@d.test');
  assert.equal((await off.call('POST', S, { language: 'en', issueId: 'wifi' }, kid)).status, 404);

  const on = await start();
  assert.equal((await on.call('POST', S, { language: 'en', issueId: 'wifi' })).status, 401);
});

test('case: language and issue are validated; roster students get fixture details, others are labelled off-roster', async () => {
  const { call, login } = await start();
  const alex = await login('demo.student@d.test');
  assert.equal((await call('POST', S, { language: 'fr', issueId: 'wifi' }, alex)).status, 400);
  assert.equal((await call('POST', S, { language: 'en', issueId: 'nope' }, alex)).status, 400);

  const ok = await call('POST', S, { language: 'en', issueId: 'wifi', description: 'wifi\u0000 bad' }, alex);
  assert.equal(ok.status, 201);
  assert.equal(ok.body.student.displayName, DEMO_STUDENTS['demo.student'].displayName);
  assert.equal(ok.body.student.onRoster, true);
  assert.equal(ok.body.outcome, 'open');
  assert.match(ok.body.caseNumber, /^DEMO-CASE-0001$/);
  assert.equal(ok.body.history, undefined); // technician field, never sent to the student

  const stranger = await login('kid@d.test', 'Some Kid');
  const off = await call('POST', S, { language: 'es', issueId: 'power' }, stranger);
  assert.equal(off.body.student.onRoster, false);
  assert.equal(off.body.student.displayName, 'Some Kid');
});

test('device check is simulated: match, mismatch, unknown tag, no assignment; expected tag never reaches the student', async () => {
  const { call, login } = await start();
  const alex = await login('demo.student@d.test');
  const c = (await call('POST', S, { language: 'en', issueId: 'power' }, alex)).body;

  assert.equal((await call('POST', `${S}/${c.id}/device-check`, { assetTag: '  ' }, alex)).status, 400);
  const match = await call('POST', `${S}/${c.id}/device-check`, { assetTag: 'demo-cb-1001' }, alex);
  assert.equal(match.body.deviceCheck.result, 'match');
  assert.equal(match.body.deviceCheck.simulated, true);
  const mismatch = await call('POST', `${S}/${c.id}/device-check`, { assetTag: 'DEMO-CB-1003' }, alex);
  assert.equal(mismatch.body.deviceCheck.result, 'mismatch');
  assert.equal(mismatch.body.deviceCheck.expectedTag, undefined);
  assert.equal((await call('POST', `${S}/${c.id}/device-check`, { assetTag: 'DEMO-CB-9999' }, alex)).body.deviceCheck.result, 'unknown_tag');

  assert.equal(checkDevice(undefined, 'DEMO-CB-1001').result, 'no_assignment');
});

test('resolved path: a working step closes the case with no ticket; closed cases refuse more changes', async () => {
  const { call, login, store } = await start();
  const alex = await login('demo.student@d.test');
  const c = (await call('POST', S, { language: 'en', issueId: 'wifi' }, alex)).body;

  assert.equal((await call('POST', `${S}/${c.id}/attempts`, { stepId: 'power-hold', result: 'worked' }, alex)).status, 400);
  assert.equal((await call('POST', `${S}/${c.id}/attempts`, { stepId: 'wifi-restart', result: 'maybe' }, alex)).status, 400);
  const first = await call('POST', `${S}/${c.id}/attempts`, { stepId: 'wifi-restart', result: 'not_worked' }, alex);
  assert.equal(first.body.outcome, 'open');
  const second = await call('POST', `${S}/${c.id}/attempts`, { stepId: 'wifi-toggle', result: 'worked' }, alex);
  assert.equal(second.body.outcome, 'resolved');
  assert.deepEqual(second.body.attempts.map((a: any) => a.result), ['not_worked', 'worked']);

  assert.equal(store.size, 0);
  assert.equal((await call('POST', `${S}/${c.id}/attempts`, { stepId: 'wifi-forget', result: 'worked' }, alex)).status, 409);
  assert.equal((await call('POST', `${S}/${c.id}/escalate`, {}, alex)).status, 409);
});

test('escalation (Spanish): ticket comes from the existing validator and carries the case; technician sees every field', async () => {
  const { call, login, users, store } = await start();
  users.set('tech@d.test', 'tech', 'test');
  const sofia = await login('demo.estudiante@d.test');
  const tech = await login('tech@d.test', 'Tina Tech');

  const c = (await call('POST', S, { language: 'es', issueId: 'power', description: 'No prende desde ayer' }, sofia)).body;
  await call('POST', `${S}/${c.id}/device-check`, { assetTag: 'DEMO-CB-1003' }, sofia);
  await call('POST', `${S}/${c.id}/attempts`, { stepId: 'power-charger', result: 'not_worked' }, sofia);
  await call('POST', `${S}/${c.id}/attempts`, { stepId: 'power-hold', result: 'not_worked' }, sofia);

  const esc = await call('POST', `${S}/${c.id}/escalate`, { reason: 'steps_not_worked', priority: 'critical', userRole: 'teacher_active' }, sofia);
  assert.equal(esc.status, 201);
  assert.equal(esc.body.case.outcome, 'escalated');
  assert.equal(esc.body.ticket.caseId, c.id);
  assert.equal(esc.body.ticket.userRole, 'student');
  assert.equal(esc.body.ticket.priority, 'medium'); // client-supplied priority/role ignored
  assert.equal(esc.body.ticket.assignedTech, 'Media Center Tech Desk');
  assert.equal(esc.body.ticket.assetTag, 'DEMO-CB-1003');
  assert.match(esc.body.ticket.description, /Spanish/);
  assert.match(esc.body.ticket.description, /No prende desde ayer/);
  assert.equal(esc.body.ticket.title, 'Student support (demo): My Chromebook will not turn on');
  assert.deepEqual(esc.body.ticket.troubleshootStepsAttempted, [
    'Checked charger and charging light (did not work)',
    'Held Power button for about 10 seconds (did not work)',
  ]);
  assert.equal(store.size, 1);

  const full = await call('GET', `${S}/${c.id}`, undefined, tech);
  assert.equal(full.status, 200);
  assert.equal(full.body.language, 'es');
  assert.equal(full.body.reported.description, 'No prende desde ayer');
  assert.equal(full.body.deviceCheck.result, 'mismatch');
  assert.equal(full.body.deviceCheck.expectedTag, 'DEMO-CB-1002');
  assert.deepEqual(full.body.history.map((h: any) => h.action), ['case_started', 'device_checked', 'escalated']);

  const own = await call('GET', `${S}/${c.id}`, undefined, sofia);
  assert.equal(own.status, 200);
  assert.equal(own.body.deviceCheck.expectedTag, undefined);
  assert.equal(own.body.history, undefined);
});

test('escalation: damaged devices go straight to a technician; the shared student ticket limit still applies', async () => {
  const { call, login } = await start();
  const jordan = await login('demo.student2@d.test');
  const make = async () => (await call('POST', S, { language: 'en', issueId: 'damaged' }, jordan)).body;

  const a = await make();
  assert.equal((await call('POST', `${S}/${a.id}/attempts`, { stepId: 'anything', result: 'worked' }, jordan)).status, 400);
  assert.equal((await call('POST', `${S}/${a.id}/escalate`, { reason: 'damaged_device' }, jordan)).status, 201);
  assert.equal((await call('POST', `${S}/${(await make()).id}/escalate`, {}, jordan)).status, 201);

  const third = await make();
  const blocked = await call('POST', `${S}/${third.id}/escalate`, {}, jordan);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.error, 'TICKET_LIMIT_EXCEEDED');
  assert.equal((await call('GET', `${S}/${third.id}`, undefined, jordan)).body.outcome, 'open'); // nothing half-done
});

test('"something else": goes straight to a technician with the student\'s own words, nothing is guessed', async () => {
  const { call, login, users } = await start();
  users.set('tech@d.test', 'tech', 'test');
  const alex = await login('demo.student@d.test');
  const tech = await login('tech@d.test', 'Tina Tech');

  const c = (await call('POST', S, { language: 'en', issueId: 'other', description: 'The headphone jack is loose' }, alex)).body;
  assert.equal(c.reported.issueId, 'other');
  assert.equal((await call('POST', `${S}/${c.id}/attempts`, { stepId: 'anything', result: 'worked' }, alex)).status, 400);
  const esc = await call('POST', `${S}/${c.id}/escalate`, { reason: 'no_steps_for_issue' }, alex);
  assert.equal(esc.status, 201);
  assert.equal(esc.body.ticket.category, 'other');
  assert.equal(esc.body.ticket.title, 'Student support (demo): Something else');
  assert.match(esc.body.ticket.description, /headphone jack is loose/);
  assert.equal((await call('GET', `${S}/${c.id}`, undefined, tech)).body.reported.description, 'The headphone jack is loose');
});

test('access: students only reach their own cases; only technicians record dispositions', async () => {
  const { call, login, users } = await start();
  users.set('tech@d.test', 'tech', 'test');
  users.set('teacher@d.test', 'staff', 'test');
  const alex = await login('demo.student@d.test');
  const sofia = await login('demo.estudiante@d.test');
  const teacher = await login('teacher@d.test');
  const tech = await login('tech@d.test', 'Tina Tech');

  const c = (await call('POST', S, { language: 'en', issueId: 'damaged' }, alex)).body;
  assert.equal((await call('GET', `${S}/${c.id}`, undefined, sofia)).status, 404);
  assert.equal((await call('POST', `${S}/${c.id}/device-check`, { assetTag: 'DEMO-CB-1001' }, sofia)).status, 404);
  assert.equal((await call('POST', `${S}/${c.id}/attempts`, { stepId: 'x', result: 'worked' }, sofia)).status, 404);
  assert.equal((await call('POST', `${S}/${c.id}/escalate`, {}, tech)).status, 404); // not even a technician can act as the student
  assert.equal((await call('GET', `${S}/${c.id}`, undefined, teacher)).status, 404);

  await call('POST', `${S}/${c.id}/escalate`, {}, alex);
  for (const who of [alex, sofia, teacher]) {
    assert.equal((await call('POST', `${S}/${c.id}/disposition`, { value: 'loaner_approved' }, who)).status, 403);
  }
  assert.equal((await call('POST', `${S}/${c.id}/disposition`, { value: 'loaner_approved' })).status, 401);
});

test('disposition: validated, recorded as demo, drafts an unsent message in the student language, history stays minimal', async () => {
  const { call, login, users } = await start();
  users.set('tech@d.test', 'tech', 'test');
  const alex = await login('demo.student@d.test');
  const sofia = await login('demo.estudiante@d.test');
  const tech = await login('tech@d.test', 'Tina Tech');

  const open = (await call('POST', S, { language: 'en', issueId: 'login' }, alex)).body;
  assert.equal((await call('POST', `${S}/${open.id}/disposition`, { value: 'loaner_approved' }, tech)).status, 409); // not escalated yet

  const en = (await call('POST', S, { language: 'en', issueId: 'damaged' }, alex)).body;
  await call('POST', `${S}/${en.id}/escalate`, {}, alex);
  assert.equal((await call('POST', `${S}/${en.id}/disposition`, { value: 'wipe_device' }, tech)).status, 400);
  const d = await call('POST', `${S}/${en.id}/disposition`, { value: 'loaner_approved', note: 'Swap at the desk' }, tech);
  assert.equal(d.status, 200);
  assert.equal(d.body.disposition.demo, true);
  assert.equal(d.body.disposition.by, 'Tina Tech');
  assert.equal(d.body.notificationDraft.status, 'draft_unsent');
  assert.equal(d.body.notificationDraft.language, 'en');
  assert.equal(d.body.notificationDraft.spanishReview, undefined);
  assert.equal(d.body.notificationDraft.recipient, 'demo.student@d.test');
  assert.match(d.body.notificationDraft.body, /Alex Sample/);
  assert.deepEqual(d.body.history.map((h: any) => h.action), ['case_started', 'escalated', 'disposition_recorded']);

  const es = (await call('POST', S, { language: 'es', issueId: 'damaged' }, sofia)).body;
  await call('POST', `${S}/${es.id}/escalate`, {}, sofia);
  const ds = await call('POST', `${S}/${es.id}/disposition`, { value: 'in_person_check' }, tech);
  assert.equal(ds.body.notificationDraft.language, 'es');
  assert.equal(ds.body.notificationDraft.spanishReview, 'awaiting_human_review');
  assert.match(ds.body.notificationDraft.body, /Hola Sofía/);

  // The student never sees the technician's decision or the draft.
  const view = await call('GET', `${S}/${en.id}`, undefined, alex);
  assert.equal(view.body.disposition, undefined);
  assert.equal(view.body.notificationDraft, undefined);
});

test('support content: every issue has both languages, unique step ids, and Spanish is flagged for human review', () => {
  assert.deepEqual(SUPPORT_ISSUES.map(i => i.id), SUPPORT_ISSUE_IDS);
  const ids = new Set<string>();
  for (const issue of SUPPORT_ISSUES) {
    assert.ok(issue.title.en && issue.title.es && issue.blurb.en && issue.blurb.es);
    assert.equal(issue.review.es, 'awaiting_human_review');
    if (issue.escalateOnly) assert.ok(issue.escalateOnly.en && issue.escalateOnly.es && issue.steps.length === 0);
    else assert.ok(issue.steps.length >= 2);
    for (const s of issue.steps) {
      assert.ok(s.text.en && s.text.es && s.label);
      assert.ok(!ids.has(s.id), `duplicate step id ${s.id}`);
      ids.add(s.id);
    }
  }
});

test('case store persists to disk, continues numbering, and survives a corrupt file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cases-'));
  const file = path.join(dir, 'cases.json');
  const input = {
    language: 'en' as const,
    student: { email: 'a@d.test', displayName: 'A', school: 'S', room: 'R', onRoster: false },
    reported: { issueId: 'wifi' as const },
    attempts: [],
    outcome: 'open' as const,
    history: [],
  };
  const one = new CaseStore(file).create(input);
  const reopened = new CaseStore(file);
  assert.equal(reopened.get(one.id)?.caseNumber, 'DEMO-CASE-0001');
  assert.equal(reopened.create(input).caseNumber, 'DEMO-CASE-0002');

  fs.writeFileSync(file, '{not json');
  const recovered = new CaseStore(file);
  assert.equal(recovered.size, 0);
  assert.ok(fs.readdirSync(dir).some(f => f.startsWith('cases.json.corrupt-')));
});
