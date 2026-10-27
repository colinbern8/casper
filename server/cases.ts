import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { SupportCase } from '../src/types';

export type NewCase = Omit<SupportCase, 'id' | 'caseNumber' | 'createdAt' | 'updatedAt'>;

interface CaseFile {
  counter: number;
  cases: SupportCase[];
}

/**
 * Student-support demo cases in a JSON file, written atomically after every change.
 * Same approach and limits as TicketStore. Pass `null` for a purely in-memory store.
 */
export class CaseStore {
  private data: CaseFile = { counter: 0, cases: [] };

  constructor(private file: string | null) {
    if (file && fs.existsSync(file)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as CaseFile;
        if (Array.isArray(parsed.cases) && typeof parsed.counter === 'number') this.data = parsed;
      } catch (err) {
        const backup = `${file}.corrupt-${Date.now()}`;
        fs.renameSync(file, backup);
        console.error(`Case file was unreadable; moved to ${backup}. Starting empty.`, err);
      }
    }
  }

  get size(): number {
    return this.data.cases.length;
  }

  get(id: string): SupportCase | undefined {
    return this.data.cases.find(c => c.id === id);
  }

  create(input: NewCase, now = new Date()): SupportCase {
    this.data.counter += 1;
    const created: SupportCase = {
      ...input,
      id: crypto.randomUUID(),
      caseNumber: `DEMO-CASE-${String(this.data.counter).padStart(4, '0')}`,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    this.data.cases.push(created);
    this.persist();
    return created;
  }

  /** Replaces a case with `next`, stamping updatedAt. */
  save(next: SupportCase, now = new Date()): SupportCase {
    const idx = this.data.cases.findIndex(c => c.id === next.id);
    if (idx === -1) throw new Error(`Unknown case ${next.id}`);
    const saved = { ...next, updatedAt: now.toISOString() };
    this.data.cases[idx] = saved;
    this.persist();
    return saved;
  }

  private persist() {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }
}
