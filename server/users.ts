import type { Role, UserRecord } from '../src/types';
import { isRecord, readJsonFile, writeJsonFile } from './jsonFile';

export type StaffRole = Exclude<Role, 'student'>;
export const RANK: Record<Role, number> = { student: 0, staff: 1, tech: 2, admin: 3 };

const STAFF_ROLES: StaffRole[] = ['staff', 'tech', 'admin'];
const isUserFile = (v: unknown): v is UserRecord[] =>
  Array.isArray(v) && v.every(r => isRecord(r) && typeof r.email === 'string' && STAFF_ROLES.includes(r.role as StaffRole));

/**
 * Who is more than a student. Anyone in the district domain who is NOT listed
 * here is a student, so a missing entry always lands on the lowest privilege.
 */
export class UserStore {
  private records = new Map<string, UserRecord>();

  constructor(private file: string | null, private adminEmails: string[]) {
    for (const r of readJsonFile(file, isUserFile, 'User') ?? []) this.records.set(r.email.toLowerCase(), r);
  }

  isLocked(email: string): boolean {
    return this.adminEmails.includes(email.toLowerCase());
  }

  roleFor(email: string): Role {
    const e = email.toLowerCase();
    if (this.isLocked(e)) return 'admin';
    return this.records.get(e)?.role ?? 'student';
  }

  list(): UserRecord[] {
    const all = new Map(this.records);
    for (const e of this.adminEmails) {
      all.set(e, { email: e, role: 'admin', addedBy: 'ADMIN_EMAILS setting', addedAt: '', locked: true });
    }
    return [...all.values()].sort((a, b) => RANK[b.role] - RANK[a.role] || a.email.localeCompare(b.email));
  }

  set(email: string, role: StaffRole, addedBy: string): UserRecord | 'locked' {
    const e = email.toLowerCase();
    if (this.isLocked(e)) return 'locked';
    const rec: UserRecord = { email: e, role, addedBy, addedAt: new Date().toISOString() };
    this.records.set(e, rec);
    this.persist();
    return rec;
  }

  remove(email: string): boolean | 'locked' {
    const e = email.toLowerCase();
    if (this.isLocked(e)) return 'locked';
    const had = this.records.delete(e);
    if (had) this.persist();
    return had;
  }

  /** Adds people as staff. Never changes anyone who already has a role. */
  importStaff(emails: string[], addedBy: string): { added: number; skipped: number } {
    let added = 0;
    let skipped = 0;
    const now = new Date().toISOString();
    for (const raw of emails) {
      const e = raw.toLowerCase();
      if (this.isLocked(e) || this.records.has(e)) {
        skipped += 1;
        continue;
      }
      this.records.set(e, { email: e, role: 'staff', addedBy, addedAt: now });
      added += 1;
    }
    if (added) this.persist();
    return { added, skipped };
  }

  private persist() {
    writeJsonFile(this.file, [...this.records.values()]);
  }
}
