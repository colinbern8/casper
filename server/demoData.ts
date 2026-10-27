import type { TicketStore } from './store';
import type { UserStore } from './users';
import type { Config } from './config';

/** Sample tickets for demos only (DEMO_MODE=true on an empty store). Fictional people. */
export function seedDemoTickets(store: TicketStore, cfg: Pick<Config, 'domain'>) {
  if (store.size > 0) return;
  const mins = (m: number) => new Date(Date.now() - m * 60_000);

  store.create(
    {
      userRole: 'teacher_active', userName: 'Ms. Rebecca Torres', userEmail: `r.torres@${cfg.domain}`,
      school: 'Hamilton High School West', room: 'Room 205 (AP Chem)', phoneOrExt: 'x4205',
      category: 'smartboard', deviceModel: 'Promethean ActivPanel 75"',
      title: 'Board shows "No Signal" during lecture',
      description: 'Class in session. HDMI is connected at the wall plate. Power-cycled the panel; screen stays blue.',
      troubleshootStepsAttempted: ['Reseated HDMI at laptop and wall plate', 'Duplicate display mode (Win + P)', 'Power-cycled the panel'],
      priority: 'critical', priorityReason: 'Priority 1: teacher reports a class in session (self-reported)',
      status: 'in_progress', assignedTech: 'Marcus Vance', techNotes: 'On the way with a spare HDMI cable.',
      teacherAvailability: 'In the room until the end of the period.',
    },
    mins(18),
  );
  store.create(
    {
      userRole: 'teacher_prep', userName: 'Mr. David Morales', userEmail: `d.morales@${cfg.domain}`,
      school: 'Yardville Elementary School', room: 'Room 6 (Grade 3)', phoneOrExt: 'x1006',
      category: 'chromebook', title: '3 cart Chromebooks will not join Wi-Fi',
      description: 'Three student units fail to connect; the other 27 in the cart are fine.',
      troubleshootStepsAttempted: ['Forgot and re-added the network', 'Hardware refresh'],
      priority: 'high', priorityReason: 'Priority 2: teacher on planning period; fix before next class',
      status: 'open', assignedTech: 'Leo Ortiz', teacherAvailability: 'Prep period until 12:45 PM.',
    },
    mins(45),
  );
  store.create(
    {
      userRole: 'staff', userName: 'Patricia Campbell', userEmail: `p.campbell@${cfg.domain}`,
      school: 'District Technology Center', room: 'Central Admin Board Room', phoneOrExt: 'x8012',
      category: 'printer', title: 'Copier badge reader offline',
      description: 'Reader shows "Card Reader Offline". PIN entry works as a workaround.',
      troubleshootStepsAttempted: ['Checked USB cable to the reader'],
      priority: 'medium', priorityReason: 'Staff / administrative request',
      status: 'open', assignedTech: 'IT Operations Desk',
    },
    mins(120),
  );
}

/** Demo accounts for the development sign-in panel. Students need no entry: everyone else is a student. */
export function seedDemoUsers(users: UserStore, cfg: Pick<Config, 'domain'>) {
  users.set(`demo.teacher@${cfg.domain}`, 'staff', 'demo');
  users.set(`demo.tech@${cfg.domain}`, 'tech', 'demo');
  users.set(`demo.admin@${cfg.domain}`, 'admin', 'demo');
}
