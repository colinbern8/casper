import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acknowledge, diffStatuses } from '../src/statusUpdates';
import { requesterUpdate, studentAlert, studentDigest, STATUS_FOR_REQUESTER } from '../src/data/messagePreviews';
import { TICKET_STATUSES, type Ticket } from '../src/types';

const t = (id: string, status: Ticket['status'], over: Partial<Ticket> = {}): Ticket => ({
  id, ticketNumber: `HTSD-${id}`, createdAt: '2026-11-02T13:00:00Z', userRole: 'student', userName: 'Alex Sample', userEmail: 'a@d.test',
  school: 'Demo Middle School', room: 'Room 114', category: 'network', title: 'Wi-Fi', description: 'x', troubleshootStepsAttempted: ['a'],
  priority: 'medium', priorityReason: '', status, assetTag: '482193', assignedTech: 'Media Center Tech Desk', ...over,
});

test('status changes: nothing on first look, new tickets are silent, a changed status shows until acknowledged', () => {
  const first = diffStatuses(null, [t('1', 'open')]);
  assert.deepEqual(first.changes, []);
  assert.deepEqual(first.seen, { 1: 'open' });

  const later = diffStatuses(first.seen, [t('1', 'dispatched'), t('2', 'open')]);
  assert.deepEqual(later.changes.map(c => [c.ticket.id, c.from, c.ticket.status]), [['1', 'open', 'dispatched']]);
  assert.deepEqual(later.seen, { 1: 'open', 2: 'open' }, 'the change stays unseen until dismissed');

  const done = acknowledge(later.seen, t('1', 'dispatched'));
  assert.deepEqual(diffStatuses(done, [t('1', 'dispatched'), t('2', 'open')]).changes, []);
});

test('message previews: every status has requester text in both languages; staff get English', () => {
  for (const s of TICKET_STATUSES) assert.ok(STATUS_FOR_REQUESTER[s].en && STATUS_FOR_REQUESTER[s].es, s);
  const es = requesterUpdate(t('1', 'hardware_swap'), 'es');
  assert.equal(es.language, 'es');
  assert.match(es.subject, /Actualización de tu solicitud HTSD-1/);
  assert.match(es.body, /Hola Alex Sample/);
  assert.match(es.body, /Media Center Tech Desk/);
  const staff = requesterUpdate(t('2', 'dispatched', { userRole: 'teacher_prep', userName: 'Jamie Rivera' }), 'es');
  assert.equal(staff.language, 'en', 'staff text stays English');
  assert.match(staff.body, /is now: Technician on the way/);
});

test('technician alert and digest: student tickets only, grouped by school, red tag shown', () => {
  const alert = studentAlert(t('1', 'open'));
  assert.match(alert.subject, /New student request HTSD-1 at Demo Middle School/);
  assert.match(alert.body, /Red tag: 482193/);
  const digest = studentDigest([t('1', 'open'), t('2', 'resolved'), t('3', 'open', { school: 'Yardville Elementary School' }), t('4', 'open', { userRole: 'teacher_prep' })]);
  assert.match(digest.subject, /still open: 2/);
  assert.match(digest.body, /Demo Middle School \(1\)/);
  assert.match(digest.body, /Yardville Elementary School \(1\)/);
  assert.doesNotMatch(digest.body, /HTSD-2|HTSD-4/);
  assert.equal(studentDigest([]).body, 'No student requests are open.');
});
