import type { TicketStore, NewTicket } from './store';
import type { UserStore } from './users';
import type { CaseStore } from './cases';
import type { PresenceStore } from './presence';
import type { Config } from './config';
import { DEMO_STUDENTS } from './supportFixtures';
import { buildTicketBody } from './support';
import { SCHOOLS, MEDIA_CENTER_DESK } from '../src/data/schools';
import { SUPPORT_ISSUES } from '../src/data/supportContent';
import type { IssueCategory, Language, SupportCase, SupportIssueId, TicketPriority, UserRole } from '../src/types';

/**
 * FICTIONAL demo data (DEMO_MODE=true only). Every person, ticket and case here is made up. The data is
 * generated from a fixed seed, so the demo looks the same every time it starts on an empty data folder.
 */

/** Staff demo accounts: the part before the @, their role and a fictional name. */
const DEMO_STAFF = {
  'demo.teacher': { role: 'staff', name: 'Jamie Rivera' },
  'demo.tech': { role: 'tech', name: 'Sam Okafor' },
  'demo.tech2': { role: 'tech', name: 'Priya Shah' },
  'demo.admin': { role: 'admin', name: 'Dana Whitfield' },
} as const;

/** The fictional name for a demo account, so the header and tickets show a person, not "demo.tech". */
export function demoNameFor(email: string, domain: string): string | undefined {
  const local = email.toLowerCase().endsWith(`@${domain}`) ? email.toLowerCase().slice(0, -(domain.length + 1)) : '';
  return (DEMO_STAFF as Record<string, { name: string }>)[local]?.name ?? DEMO_STUDENTS[local]?.displayName;
}

/** Demo accounts for the development sign-in panel. Students need no entry: everyone else is a student. */
export function seedDemoUsers(users: UserStore, cfg: Pick<Config, 'domain'>) {
  for (const [local, { role }] of Object.entries(DEMO_STAFF)) users.set(`${local}@${cfg.domain}`, role, 'demo');
}

/** Small deterministic random numbers (mulberry32), so the generated history is the same every time. */
function seeded(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    pick: <T,>(list: readonly T[]): T => list[Math.floor(next() * list.length)],
    between: (lo: number, hi: number) => lo + next() * (hi - lo),
  };
}

const TEACHERS = ['Ms. Rebecca Torres', 'Mr. David Morales', 'Ms. Hannah Brooks', 'Mr. Omar Haddad', 'Ms. Grace Kim', 'Mr. Luis Ferreira', 'Ms. Nadia Volkov', 'Mr. Ben Adler'];
const STUDENTS = ['Mia Chen', 'Noah Patel', 'Ava Johnson', 'Liam Garcia', 'Zoe Williams', 'Ethan Nguyen', 'Isabella Rossi', 'Lucas Martin', 'Camila Reyes', 'Owen Murphy', 'Valentina Cruz', 'Elijah Brown'];
const STAFF_PROBLEMS: Array<{ category: IssueCategory; title: string; model?: string }> = [
  { category: 'smartboard', title: 'Board shows "No Signal"', model: 'Promethean ActivPanel 75"' },
  { category: 'smartboard', title: 'Touch on the panel is off by a few inches', model: 'Promethean ActivPanel 75"' },
  { category: 'audio_video', title: 'Room speakers silent, laptop audio works' },
  { category: 'network', title: 'Cart Chromebooks will not join Wi-Fi' },
  { category: 'printer', title: 'Copier badge reader offline' },
  { category: 'printer', title: 'Classroom printer shows offline' },
  { category: 'account', title: 'Student locked out of Google account' },
  { category: 'chromebook', title: 'Teacher laptop will not wake from sleep' },
  { category: 'other', title: 'Document camera not detected' },
];
const STUDENT_ISSUES: SupportIssueId[] = ['wifi', 'wifi', 'wifi', 'power', 'power', 'login', 'login', 'damaged', 'other'];
const OTHER_WORDS = ['My keyboard types the wrong letters', 'The trackpad does not click anymore', 'Camera shows a black square in Meet'];

const HOUR = 3_600_000;

/** A school-day moment `daysAgo` days back (weekends moved to Friday), between 7:45 and 15:15 local time. */
function schoolTime(now: Date, daysAgo: number, r: ReturnType<typeof seeded>): Date {
  const d = new Date(now.getTime() - daysAgo * 24 * HOUR);
  d.setHours(7, 45 + Math.floor(r.between(0, 450)), 0, 0);
  if (d.getTime() > now.getTime() - HOUR) d.setDate(d.getDate() - 1); // never in the future
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d;
}

/** How long a ticket of this priority took to resolve, in hours. */
const resolveHours = (p: TicketPriority, r: ReturnType<typeof seeded>) =>
  p === 'critical' ? r.between(0.3, 2.5) : p === 'high' ? r.between(1.5, 26) : r.between(3, 70);

/**
 * Sample tickets, student-support cases and coverage for demos (DEMO_MODE=true, empty stores only):
 * four weeks of history for the analytics, plus open tickets for the technician queue, the shared
 * school queue, the teacher's own requests and the self-help case screen.
 */
export function seedDemoData({ store, cases, presence, cfg, now = new Date() }: { store: TicketStore; cases: CaseStore; presence: PresenceStore; cfg: Pick<Config, 'domain'>; now?: Date }) {
  if (presence.isEmpty()) presence.set('Leo Ortiz', true, new Date(now.getTime() - 3 * HOUR));
  if (store.size > 0 || cases.size > 0) return;
  const r = seeded(20261102);
  const email = (name: string) => `${name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@${cfg.domain}`;
  const staffSchools = SCHOOLS.filter(s => s.id !== 'dtc');

  type Planned = { at: Date; make: () => void };
  const plan: Planned[] = [];

  // ---- Four weeks of staff tickets ------------------------------------------------
  for (let i = 0; i < 46; i++) {
    const daysAgo = r.between(1, 28);
    const at = schoolTime(now, daysAgo, r);
    const school = r.next() < 0.08 ? SCHOOLS.find(s => s.id === 'dtc')! : r.pick(staffSchools);
    const problem = r.pick(STAFF_PROBLEMS);
    const roll = r.next();
    const role: UserRole = school.id === 'dtc' ? 'staff' : roll < 0.3 ? 'teacher_active' : roll < 0.8 ? 'teacher_prep' : 'staff';
    const priority: TicketPriority = role === 'teacher_active' ? 'critical' : role === 'teacher_prep' ? 'high' : 'medium';
    const resolvedAt = new Date(Math.min(at.getTime() + resolveHours(priority, r) * HOUR, now.getTime() - HOUR));
    const stillOpen = daysAgo < 3 && r.next() < 0.35;
    const name = school.id === 'dtc' ? 'Patricia Campbell' : r.pick(TEACHERS);
    const ticket: NewTicket = {
      userRole: role, userName: name, userEmail: email(name), school: school.name, room: r.pick(school.rooms),
      category: problem.category, deviceModel: problem.model, title: problem.title,
      description: `${problem.title}. Tried the guided steps first.`, troubleshootStepsAttempted: ['Restarted the device', 'Checked the cables'],
      priority, priorityReason: priority === 'critical' ? 'Priority 1: teacher reports a class in session (self-reported)' : priority === 'high' ? 'Priority 2: teacher on planning period; fix before next class' : 'Staff / administrative request',
      status: stillOpen ? r.pick(['assigned', 'in_progress'] as const) : 'resolved',
      assignedTech: r.next() < 0.15 && school.backupTech ? school.backupTech : school.leadTech,
      ...(stillOpen ? {} : { resolvedAt: resolvedAt.toISOString(), techNotes: '[demo] Fixed on site.' }),
    };
    plan.push({ at, make: () => void store.create(ticket, at) });
  }

  // ---- Four weeks of student self-help chats (fixed, blocked, or sent to a technician) -----------
  for (let i = 0; i < 52; i++) {
    const at = schoolTime(now, r.between(0.5, 28), r);
    const issueId = r.pick(STUDENT_ISSUES);
    const issue = SUPPORT_ISSUES.find(x => x.id === issueId)!;
    const language: Language = r.next() < 0.3 ? 'es' : 'en';
    const name = r.pick(STUDENTS);
    const school = r.pick(staffSchools);
    const roll = r.next();
    const outcome: SupportCase['outcome'] = issue.steps.length === 0 ? 'escalated' : roll < 0.62 ? 'resolved' : roll < 0.72 ? 'blocked' : 'escalated';
    plan.push({ at, make: () => seedCase({ store, cases, at, now, issueId, language, name, studentEmail: email(name), school: school.name, room: r.pick(school.rooms), outcome, r }) });
  }

  for (const p of plan.sort((a, b) => a.at.getTime() - b.at.getTime())) p.make();

  // ---- Open right now: the queue a technician sees at the start of the demo ------------------
  const ago = (mins: number) => new Date(now.getTime() - mins * 60_000);
  const hhsw = SCHOOLS.find(s => s.id === 'hhsw')!;
  const yes = SCHOOLS.find(s => s.id === 'yes')!;
  const dms = SCHOOLS.find(s => s.id === 'demo-ms')!;
  store.create({
    userRole: 'teacher_active', userName: 'Ms. Rebecca Torres', userEmail: email('Rebecca Torres'), school: hhsw.name, room: 'Room 205 (AP Chem)', phoneOrExt: 'x4205',
    category: 'smartboard', deviceModel: 'Promethean ActivPanel 75"', title: 'Board shows "No Signal" during lecture',
    description: 'Class in session. HDMI is connected at the wall plate. Power-cycled the panel; screen stays blue.',
    troubleshootStepsAttempted: ['Reseated HDMI at laptop and wall plate', 'Duplicate display mode (Win + P)', 'Power-cycled the panel'],
    priority: 'critical', priorityReason: 'Priority 1: teacher reports a class in session (self-reported)',
    status: 'in_progress', assignedTech: 'Marcus Vance', techNotes: 'On the way with a spare HDMI cable.', teacherAvailability: 'In the room until the end of the period.',
  }, ago(18));
  store.create({
    userRole: 'teacher_prep', userName: 'Mr. David Morales', userEmail: email('David Morales'), school: yes.name, room: 'Room 6 (Grade 3)', phoneOrExt: 'x1006',
    category: 'chromebook', title: '3 cart Chromebooks will not join Wi-Fi', description: 'Three student units fail to connect; the other 27 in the cart are fine.',
    troubleshootStepsAttempted: ['Forgot and re-added the network', 'Hardware refresh'],
    priority: 'high', priorityReason: 'Priority 2: teacher on planning period; fix before next class',
    status: 'open', assignedTech: 'Sam Okafor', techNotes: '[routing] Routed to backup Sam Okafor because Leo Ortiz is marked away.', teacherAvailability: 'Prep period until 12:45 PM.',
  }, ago(45));
  store.create({
    userRole: 'staff', userName: 'Patricia Campbell', userEmail: email('Patricia Campbell'), school: 'District Technology Center', room: 'Central Admin Board Room', phoneOrExt: 'x8012',
    category: 'printer', title: 'Copier badge reader offline', description: 'Reader shows "Card Reader Offline". PIN entry works as a workaround.',
    troubleshootStepsAttempted: ['Checked USB cable to the reader'], priority: 'medium', priorityReason: 'Staff / administrative request',
    status: 'open', assignedTech: 'IT Operations Desk',
  }, ago(120));
  store.create({
    userRole: 'teacher_prep', userName: 'Ms. Hannah Brooks', userEmail: email('Hannah Brooks'), school: dms.name, room: 'Room 120 (Science)', phoneOrExt: 'x2120',
    category: 'audio_video', title: 'Room speakers silent, laptop audio works', description: 'Speakers stopped after the weekend. Volume knob is up.',
    troubleshootStepsAttempted: ['Select correct audio output device', 'Check physical cable connection'],
    priority: 'high', priorityReason: 'Priority 2: teacher on planning period; fix before next class',
    status: 'open', assignedTech: '', techNotes: '[demo] Not assigned yet: waiting in the shared Demo Middle School queue for any technician to claim.',
    teacherAvailability: 'Available during planning period',
  }, ago(65));

  // The demo teacher's own requests, so "Requests" and its status updates have something to show.
  const teacher = DEMO_STAFF['demo.teacher'].name;
  store.create({
    userRole: 'teacher_prep', userName: teacher, userEmail: `demo.teacher@${cfg.domain}`, school: dms.name, room: 'Room 112', phoneOrExt: 'x2112',
    category: 'smartboard', deviceModel: 'Promethean ActivPanel 75"', title: 'Panel pen does not write (Room 112)', description: 'The pen does nothing on the panel. Touch with a finger works.',
    troubleshootStepsAttempted: ['Reseat the video cable'], priority: 'high', priorityReason: 'Priority 2: teacher on planning period; fix before next class',
    status: 'dispatched', assignedTech: 'Sam Okafor', techNotes: '[demo] Bringing a replacement pen.', teacherAvailability: 'Available during planning period',
  }, ago(150));
  store.create({
    userRole: 'staff', userName: teacher, userEmail: `demo.teacher@${cfg.domain}`, school: dms.name, room: 'Room 112', phoneOrExt: 'x2112',
    category: 'printer', title: 'Classroom printer shows offline (Room 112)', description: 'Printer shows offline on my laptop.',
    troubleshootStepsAttempted: [], priority: 'medium', priorityReason: 'Staff / administrative request',
    status: 'resolved', resolvedAt: ago(60 * 26).toISOString(), assignedTech: 'Sam Okafor', techNotes: '[demo] Re-added the printer queue.',
  }, ago(60 * 30));

  // Two students waiting at the Media Center desk right now, from the student chat.
  seedCase({ store, cases, at: ago(25), now, issueId: 'power', language: 'es', name: 'Valentina Cruz', studentEmail: email('Valentina Cruz'), school: dms.name, room: 'Room 115', outcome: 'escalated', r, keepOpen: true });
  seedCase({ store, cases, at: ago(9), now, issueId: 'damaged', language: 'en', name: 'Owen Murphy', studentEmail: email('Owen Murphy'), school: hhsw.name, room: 'Room 118 (English)', outcome: 'escalated', r, keepOpen: true });
}

/** One student chat, and its ticket if it was sent to a technician. */
function seedCase(o: {
  store: TicketStore; cases: CaseStore; at: Date; now: Date; issueId: SupportIssueId; language: Language; name: string; studentEmail: string;
  school: string; room: string; outcome: SupportCase['outcome']; r: ReturnType<typeof seeded>; keepOpen?: boolean;
}) {
  const issue = SUPPORT_ISSUES.find(x => x.id === o.issueId)!;
  const step = (min: number) => new Date(o.at.getTime() + min * 60_000).toISOString();
  const tried = o.outcome === 'resolved' ? Math.max(1, Math.ceil(o.r.next() * issue.steps.length)) : issue.steps.length;
  const attempts = issue.steps.slice(0, tried).map((s, i) => ({
    stepId: s.id, result: o.outcome === 'resolved' && i === tried - 1 ? ('worked' as const) : ('not_worked' as const), at: step(i + 1),
  }));
  const description = o.issueId === 'other' ? o.r.pick(OTHER_WORDS) : undefined;
  const created = o.cases.create({
    language: o.language,
    student: { email: o.studentEmail, displayName: o.name, school: o.school, room: o.room, onRoster: true },
    reported: { issueId: o.issueId, description },
    redTag: o.outcome === 'blocked' ? undefined : { value: String(100000 + Math.floor(o.r.next() * 899999)), recordedAt: step(0.5) },
    attempts,
    outcome: 'open',
    history: [{ at: o.at.toISOString(), by: o.name, action: 'case_started', detail: `${o.issueId}, ${o.language}` }],
  }, o.at);
  const end = step(issue.steps.length + 1);
  if (o.outcome === 'resolved' || o.outcome === 'blocked') {
    o.cases.save({
      ...created,
      outcome: o.outcome,
      history: [...created.history, { at: end, by: o.name, action: o.outcome, detail: o.outcome === 'resolved' ? 'student reported fixed' : 'at request limit (demo)' }],
    }, new Date(end));
    return;
  }
  const body = buildTicketBody(created);
  const resolved = !o.keepOpen && o.at.getTime() < o.now.getTime() - 2 * 24 * HOUR;
  const ticket = o.store.create({
    ...body,
    school: o.school,
    room: o.room,
    category: issue.category,
    troubleshootStepsAttempted: body.troubleshootStepsAttempted,
    userRole: 'student', userName: o.name, userEmail: o.studentEmail,
    priority: 'medium', priorityReason: 'Student device request (Media Center loaner desk)',
    status: resolved ? 'resolved' : 'open',
    assignedTech: MEDIA_CENTER_DESK,
    caseId: created.id,
    ...(resolved ? { resolvedAt: new Date(Math.min(o.at.getTime() + resolveHours('medium', o.r) * HOUR, o.now.getTime() - HOUR)).toISOString(), techNotes: '[demo] Loaner issued at the Media Center.' } : {}),
  }, new Date(end));
  o.cases.save({
    ...created,
    outcome: 'escalated',
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    history: [...created.history, { at: end, by: o.name, action: 'escalated', detail: ticket.ticketNumber }],
  }, new Date(end));
}
