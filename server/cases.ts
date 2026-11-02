import crypto from 'crypto';
import type { SupportCase } from '../src/types';
import { isRecord, readJsonFile, writeJsonFile } from './jsonFile';

export type NewCase = Omit<SupportCase, 'id' | 'caseNumber' | 'createdAt' | 'updatedAt'>;

interface CaseFile {
  counter: number;
  cases: SupportCase[];
}

const isCaseFile = (v: unknown): v is CaseFile =>
  isRecord(v) && Number.isInteger(v.counter) && Array.isArray(v.cases) && v.cases.every(c => isRecord(c) && typeof c.id === 'string');

/**
 * Student-support demo cases in a JSON file, written atomically after every change.
 * Same approach and limits as TicketStore. Pass `null` for a purely in-memory store.
 */
export class CaseStore {
  private data: CaseFile = { counter: 0, cases: [] };

  constructor(private file: string | null) {
    this.data = readJsonFile(file, isCaseFile, 'Case') ?? this.data;
  }

  get size(): number {
    return this.data.cases.length;
  }

  /** Newest first. */
  list(): SupportCase[] {
    return [...this.data.cases].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
    writeJsonFile(this.file, this.data);
  }
}
