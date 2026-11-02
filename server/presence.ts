import { isRecord, readJsonFile, writeJsonFile } from './jsonFile';
import type { TechPresence } from '../src/types';

type PresenceFile = Record<string, TechPresence>;
const isPresenceFile = (v: unknown): v is PresenceFile => isRecord(v) && Object.values(v).every(p => isRecord(p) && typeof p.away === 'boolean');

/**
 * Which technicians are marked away, by the name tickets are assigned to. Saved in a JSON file so it
 * survives a restart. While a school's lead technician is away, new staff tickets go to the backup or
 * to the school's shared queue (see routeFor in src/data/schools.ts).
 */
export class PresenceStore {
  private data: PresenceFile = {};

  constructor(private file: string | null) {
    this.data = readJsonFile(file, isPresenceFile, 'Presence') ?? {};
  }

  isEmpty(): boolean {
    return Object.keys(this.data).length === 0;
  }

  isAway = (name: string): boolean => this.data[name]?.away === true;

  get(name: string): TechPresence {
    return this.data[name] ?? { away: false };
  }

  set(name: string, away: boolean, now = new Date()): TechPresence {
    const next: TechPresence = { away, since: now.toISOString() };
    this.data[name] = next;
    writeJsonFile(this.file, this.data);
    return next;
  }
}
