import type { DeviceCheck, DeviceCheckResult } from '../src/types';

/**
 * FICTIONAL demo data for the student-support prototype. Nothing here comes from,
 * or connects to, a district system. Emails are `<key>@<DISTRICT_DOMAIN>`.
 */

export const DEMO_SCHOOL = 'Demo Middle School';

export interface DemoStudent {
  displayName: string;
  school: string;
  room: string;
  /** Tag the fixture says is assigned to this student. */
  assignedTag: string;
}

/** Keyed by the part of the email before the @. */
export const DEMO_STUDENTS: Record<string, DemoStudent> = {
  'demo.student': { displayName: 'Alex Sample', school: DEMO_SCHOOL, room: 'Room 114', assignedTag: 'DEMO-CB-1001' },
  'demo.estudiante': { displayName: 'Sofía Muestra', school: DEMO_SCHOOL, room: 'Room 115', assignedTag: 'DEMO-CB-1002' },
  'demo.student2': { displayName: 'Jordan Sample', school: DEMO_SCHOOL, room: 'Room 114', assignedTag: 'DEMO-CB-1003' },
};

/** Tags that exist in the fixture. DEMO-CB-1004 is a spare that nobody holds. */
export const DEMO_DEVICE_TAGS = ['DEMO-CB-1001', 'DEMO-CB-1002', 'DEMO-CB-1003', 'DEMO-CB-1004'];

export function studentFor(email: string, domain: string): DemoStudent | undefined {
  const e = email.toLowerCase();
  const suffix = `@${domain}`;
  if (!e.endsWith(suffix)) return undefined;
  return DEMO_STUDENTS[e.slice(0, -suffix.length)];
}

export const normalizeTag = (raw: unknown): string =>
  typeof raw === 'string' ? raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, '').toUpperCase().slice(0, 40) : '';

/** SIMULATED assignment check against the fixtures above. */
export function checkDevice(student: DemoStudent | undefined, rawTag: unknown, now = new Date()): DeviceCheck {
  const enteredTag = normalizeTag(rawTag);
  let result: DeviceCheckResult;
  if (!student) result = 'no_assignment';
  else if (!DEMO_DEVICE_TAGS.includes(enteredTag)) result = 'unknown_tag';
  else result = enteredTag === student.assignedTag ? 'match' : 'mismatch';
  return {
    simulated: true,
    enteredTag,
    result,
    expectedTag: student?.assignedTag,
    checkedAt: now.toISOString(),
  };
}
