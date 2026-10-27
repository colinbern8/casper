import {
  ISSUE_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type IssueCategory,
  type TicketPriority,
  type TicketUpdateInput,
  type Role,
  type UserRole,
} from '../src/types';
import { MEDIA_CENTER_DESK, findSchool, allTechs } from '../src/data/schools';
import type { NewTicket } from './store';

export const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

export const cleanMultiline = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max) : '';

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string; message: string };
const fail = (error: string, message: string): { ok: false; error: string; message: string } => ({ ok: false, error, message });

/**
 * Students are always students. Everyone else may say whether they are in a
 * class right now or on a planning period (self-reported by nature), and
 * defaults to the planning-period level when they say nothing sensible.
 */
export function ticketRoleFor(sessionRole: Role, requested: unknown): UserRole {
  if (sessionRole === 'student') return 'student';
  return requested === 'teacher_active' || requested === 'teacher_prep' || requested === 'staff' ? requested : 'teacher_prep';
}

export function triage(role: UserRole): { priority: TicketPriority; reason: string } {
  switch (role) {
    case 'teacher_active':
      return { priority: 'critical', reason: 'Priority 1: teacher reports a class in session (self-reported)' };
    case 'teacher_prep':
      return { priority: 'high', reason: 'Priority 2: teacher on planning period; fix before next class' };
    case 'student':
      return { priority: 'medium', reason: 'Student device request (Media Center loaner desk)' };
    default:
      return { priority: 'medium', reason: 'Staff / administrative request' };
  }
}

export function parseTicketInput(body: any, who: { name: string; email: string; role: Role }): ParseResult<NewTicket> {
  if (!body || typeof body !== 'object') return fail('INVALID_BODY', 'Request body must be JSON.');

  const role = ticketRoleFor(who.role, body.userRole);
  const userName = clean(who.name, 80) || who.email.split('@')[0];
  const userEmail = who.email.toLowerCase();

  const school = findSchool(clean(body.school, 120));
  if (!school) return fail('INVALID_SCHOOL', 'Choose a school from the list.');

  const room = clean(body.room, 80);
  if (!room) return fail('INVALID_ROOM', 'Room or location is required.');

  const title = clean(body.title, 120);
  const description = cleanMultiline(body.description, 1000);
  if (title.length < 3) return fail('INVALID_TITLE', 'A short title is required.');
  if (!description) return fail('INVALID_DESCRIPTION', 'A description is required.');

  const category: IssueCategory = ISSUE_CATEGORIES.includes(body.category) ? body.category : 'other';
  const steps = Array.isArray(body.troubleshootStepsAttempted)
    ? body.troubleshootStepsAttempted.slice(0, 20).map((s: unknown) => clean(s, 200)).filter(Boolean)
    : [];

  const { priority, reason } = triage(role);

  return {
    ok: true,
    value: {
      userRole: role,
      userName,
      userEmail,
      school: school.name,
      room,
      phoneOrExt: clean(body.phoneOrExt, 40) || undefined,
      category,
      deviceModel: clean(body.deviceModel, 80) || undefined,
      assetTag: clean(body.assetTag, 40) || undefined,
      title,
      description,
      troubleshootStepsAttempted: steps,
      priority,
      priorityReason: reason,
      // "open" = logged, not yet acknowledged by a technician. Nobody is paged by the app itself.
      status: 'open',
      assignedTech: role === 'student' ? MEDIA_CENTER_DESK : school.leadTech,
      teacherAvailability: clean(body.teacherAvailability, 200) || undefined,
    },
  };
}

export function parseTicketUpdate(body: any): ParseResult<TicketUpdateInput> {
  if (!body || typeof body !== 'object') return fail('INVALID_BODY', 'Request body must be JSON.');
  const out: TicketUpdateInput = {};

  if (body.status !== undefined) {
    if (!TICKET_STATUSES.includes(body.status)) return fail('INVALID_STATUS', 'Unknown status.');
    out.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!TICKET_PRIORITIES.includes(body.priority)) return fail('INVALID_PRIORITY', 'Unknown priority.');
    out.priority = body.priority;
  }
  if (body.assignedTech !== undefined) {
    const tech = clean(body.assignedTech, 80);
    if (tech && !allTechs().includes(tech)) return fail('INVALID_TECH', 'Unknown technician.');
    out.assignedTech = tech;
  }
  if (body.addNote !== undefined) {
    const note = cleanMultiline(body.addNote, 1000);
    if (!note) return fail('INVALID_NOTE', 'Note cannot be empty.');
    out.addNote = note;
  }
  if (Object.keys(out).length === 0) return fail('NO_CHANGES', 'Nothing to update.');
  return { ok: true, value: out };
}
