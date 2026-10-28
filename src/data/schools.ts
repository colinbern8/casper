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
  /** Fictional campus used only when DEMO_MODE is on. Hidden from pickers and refused for tickets otherwise. */
  demoOnly?: boolean;
}

/** Students are always routed here, regardless of campus. */
export const MEDIA_CENTER_DESK = 'Media Center Tech Desk';

export const HELP_DESK = {
  ext: 'x5000',
  hours: '7:30 AM to 4:00 PM on school days',
  email: 'helpdesk@demo.example.org',
};

export const SCHOOLS: School[] = [
  {
    id: 'demo-ms',
    name: 'Demo Middle School',
    rooms: ['Room 114', 'Room 115', 'Library / Media Center'],
    leadTech: 'Demo Technician',
    demoOnly: true,
  },
  {
    id: 'hhsw',
    name: 'Hamilton High School West',
    rooms: ['Room 104', 'Room 205 (AP Chem)', 'Library / Media Center'],
    leadTech: 'Marcus Vance',
  },
  {
    id: 'yes',
    name: 'Yardville Elementary School',
    rooms: ['Room 6 (Grade 3)', 'Library / Media Center'],
    leadTech: 'Leo Ortiz',
  },
  {
    id: 'dtc',
    name: 'District Technology Center',
    rooms: ['Central Admin Board Room'],
    leadTech: 'IT Operations Desk',
  },
];

/** Schools people may pick: the real campuses, plus the fictional one in demo mode. */
export function schoolsFor(demoMode: boolean): School[] {
  return SCHOOLS.filter(s => demoMode || !s.demoOnly);
}

export function findSchool(name: string, demoMode = true): School | undefined {
  return schoolsFor(demoMode).find(s => s.name === name);
}

/** Every name a ticket can be assigned to. */
export function allTechs(): string[] {
  return Array.from(new Set([MEDIA_CENTER_DESK, ...SCHOOLS.map(s => s.leadTech)])).sort();
}
