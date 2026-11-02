/**
 * Campuses, lead technicians and help desk contact.
 *
 * RECREATED PLACEHOLDER: the original file was never committed (it was caught by
 * a `data/` rule in .gitignore). Names below are the ones the existing tests and
 * demo seed data already reference, plus one clearly fictional demo campus.
 * Replace with real district data before any real use.
 */

export interface School {
  id: string;
  name: string;
  rooms: string[];
  /** Default technician for staff tickets from this campus. */
  leadTech: string;
  /** Takes new staff tickets while the lead technician is marked away. Absent: they go to the shared queue. */
  backupTech?: string;
}

/** Students are always routed here, regardless of campus. */
export const MEDIA_CENTER_DESK = 'Media Center Tech Desk';

/** Team queues rather than people: a ticket assigned to one is waiting for any technician to claim. */
export const SHARED_DESKS = [MEDIA_CENTER_DESK, 'IT Operations Desk'];

export const HELP_DESK = {
  ext: 'x5000',
  hours: '7:30 AM to 4:00 PM on school days',
  email: 'helpdesk@demo.example.org',
};

export const SCHOOLS: School[] = [
  {
    id: 'demo-ms',
    name: 'Demo Middle School',
    rooms: ['Room 112', 'Room 114', 'Room 115', 'Room 120 (Science)', 'Main Office', 'Library / Media Center'],
    leadTech: 'Sam Okafor',
    backupTech: 'Priya Shah',
  },
  {
    id: 'hhsw',
    name: 'Hamilton High School West',
    rooms: ['Room 104', 'Room 118 (English)', 'Room 205 (AP Chem)', 'Room 230 (Computer Lab)', 'Auditorium', 'Library / Media Center'],
    leadTech: 'Marcus Vance',
    backupTech: 'Priya Shah',
  },
  {
    id: 'yes',
    name: 'Yardville Elementary School',
    rooms: ['Room 2 (Kindergarten)', 'Room 6 (Grade 3)', 'Room 9 (Grade 5)', 'Main Office', 'Library / Media Center'],
    leadTech: 'Leo Ortiz',
    backupTech: 'Sam Okafor',
  },
  {
    id: 'dtc',
    name: 'District Technology Center',
    rooms: ['Central Admin Board Room', 'Payroll Office', 'Training Lab'],
    leadTech: 'IT Operations Desk',
  },
];

export function findSchool(name: string): School | undefined {
  return SCHOOLS.find(s => s.name === name);
}

/** Every name a ticket can be assigned to. */
export function allTechs(): string[] {
  return Array.from(new Set([MEDIA_CENTER_DESK, ...SCHOOLS.flatMap(s => [s.leadTech, ...(s.backupTech ? [s.backupTech] : [])])])).sort();
}

/**
 * Who gets a new staff ticket from `school`: the lead technician, or the backup while the lead is
 * away, or nobody (the school's shared queue, where any technician can claim it) if both are away.
 */
export function routeFor(school: School, isAway: (tech: string) => boolean): { tech: string; note?: string } {
  if (!isAway(school.leadTech)) return { tech: school.leadTech };
  if (school.backupTech && !isAway(school.backupTech)) {
    return { tech: school.backupTech, note: `Routed to backup ${school.backupTech} because ${school.leadTech} is marked away.` };
  }
  return { tech: '', note: `${school.leadTech} is marked away and no backup is available, so this is in the shared ${school.name} queue.` };
}

/** Rooms whose name contains the query anywhere, case-insensitive. An empty query returns all rooms. */
export function filterRooms(rooms: string[], query: string): string[] {
  const q = query.trim().toLowerCase();
  return q ? rooms.filter(r => r.toLowerCase().includes(q)) : rooms;
}
