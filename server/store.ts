import crypto from 'crypto';
import type { Ticket } from '../src/types';
import { isRecord, readJsonFile, writeJsonFile } from './jsonFile';

export type NewTicket = Omit<Ticket, 'id' | 'ticketNumber' | 'createdAt'>;

interface StoreFile {
  counter: number;
  tickets: Ticket[];
}

const isStoreFile = (v: unknown): v is StoreFile =>
  isRecord(v) && Number.isInteger(v.counter) && Array.isArray(v.tickets) && v.tickets.every(t => isRecord(t) && typeof t.id === 'string');

/**
 * Tickets in a JSON file, written atomically after every change. Good for a
 * single-instance MVP (hundreds of tickets). Swap for SQLite/Postgres when you
 * need multiple instances or reporting. Pass `null` for a purely in-memory store.
 */
export class TicketStore {
  private data: StoreFile = { counter: 0, tickets: [] };

  constructor(private file: string | null, private ticketPrefix = 'HTSD') {
    this.data = readJsonFile(file, isStoreFile, 'Ticket') ?? this.data;
  }

  get size(): number {
    return this.data.tickets.length;
  }

  list(): Ticket[] {
    return [...this.data.tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(id: string): Ticket | undefined {
    return this.data.tickets.find(t => t.id === id);
  }

  /** A student's requests that still count toward their limit: unresolved, and not released by a technician. */
  openStudentTickets(email: string): Ticket[] {
    const e = email.toLowerCase();
    return this.data.tickets.filter(t => t.userEmail === e && t.userRole === 'student' && t.status !== 'resolved' && !t.allowsAnother);
  }

  listByEmail(email: string): Ticket[] {
    const e = email.toLowerCase();
    return this.list().filter(t => t.userEmail === e);
  }

  create(input: NewTicket, createdAt = new Date()): Ticket {
    this.data.counter += 1;
    const seq = String(this.data.counter).padStart(4, '0');
    const ticket: Ticket = {
      ...input,
      id: crypto.randomUUID(),
      ticketNumber: input.userRole === 'student' ? `${this.ticketPrefix}-STU-${seq}` : `${this.ticketPrefix}-${createdAt.getFullYear()}-${seq}`,
      createdAt: createdAt.toISOString(),
    };
    this.data.tickets.push(ticket);
    this.persist();
    return ticket;
  }

  update(id: string, patch: Partial<Ticket>): Ticket | undefined {
    const idx = this.data.tickets.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    const merged: Ticket = { ...this.data.tickets[idx], ...patch };
    if (merged.status === 'resolved') {
      merged.resolvedAt = this.data.tickets[idx].resolvedAt || new Date().toISOString();
    } else {
      delete merged.resolvedAt;
    }
    this.data.tickets[idx] = merged;
    this.persist();
    return merged;
  }

  private persist() {
    writeJsonFile(this.file, this.data);
  }
}
