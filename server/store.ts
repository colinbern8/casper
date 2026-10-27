import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Ticket } from '../src/types';

export type NewTicket = Omit<Ticket, 'id' | 'ticketNumber' | 'createdAt'>;

interface StoreFile {
  counter: number;
  tickets: Ticket[];
}

/**
 * Tickets in a JSON file, written atomically after every change. Good for a
 * single-instance MVP (hundreds of tickets). Swap for SQLite/Postgres when you
 * need multiple instances or reporting. Pass `null` for a purely in-memory store.
 */
export class TicketStore {
  private data: StoreFile = { counter: 0, tickets: [] };

  constructor(private file: string | null) {
    if (file && fs.existsSync(file)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as StoreFile;
        if (Array.isArray(parsed.tickets) && typeof parsed.counter === 'number') this.data = parsed;
      } catch (err) {
        // Keep the unreadable file for inspection rather than overwriting it.
        const backup = `${file}.corrupt-${Date.now()}`;
        fs.renameSync(file, backup);
        console.error(`Ticket file was unreadable; moved to ${backup}. Starting empty.`, err);
      }
    }
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

  listByEmail(email: string): Ticket[] {
    const e = email.toLowerCase();
    return this.list().filter(t => t.userEmail === e);
  }

  getMany(ids: string[]): Ticket[] {
    const wanted = new Set(ids);
    return this.list().filter(t => wanted.has(t.id));
  }

  create(input: NewTicket, createdAt = new Date()): Ticket {
    this.data.counter += 1;
    const seq = String(this.data.counter).padStart(4, '0');
    const ticket: Ticket = {
      ...input,
      id: crypto.randomUUID(),
      ticketNumber: input.userRole === 'student' ? `HTSD-STU-${seq}` : `HTSD-${createdAt.getFullYear()}-${seq}`,
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
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }
}
