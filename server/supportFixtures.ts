/**
 * FICTIONAL demo data for the student-support prototype. Nothing here comes from,
 * or connects to, a district system. Emails are `<key>@<DISTRICT_DOMAIN>`.
 */

export const DEMO_SCHOOL = 'Demo Middle School';

export interface DemoStudent {
  displayName: string;
  school: string;
  room: string;
}

/** Keyed by the part of the email before the @. */
export const DEMO_STUDENTS: Record<string, DemoStudent> = {
  'demo.student': { displayName: 'Alex Sample', school: DEMO_SCHOOL, room: 'Room 114' },
  'demo.estudiante': { displayName: 'Sofía Muestra', school: DEMO_SCHOOL, room: 'Room 115' },
  'demo.student2': { displayName: 'Jordan Sample', school: DEMO_SCHOOL, room: 'Room 114' },
};

export function studentFor(email: string, domain: string): DemoStudent | undefined {
  const e = email.toLowerCase();
  const suffix = `@${domain}`;
  if (!e.endsWith(suffix)) return undefined;
  return DEMO_STUDENTS[e.slice(0, -suffix.length)];
}
