import type { Ticket, TicketStatus } from './types';

/**
 * Status changes on a person's own requests since they last looked, remembered per account in this
 * browser. Nothing is sent anywhere: the app shows the change and a preview of the message it would send.
 */

export type SeenStatuses = Record<string, TicketStatus>;

export interface StatusChange {
  ticket: Ticket;
  from: TicketStatus;
}

const key = (email: string) => `casper.seen-status.v1.${email.toLowerCase()}`;

export function loadSeen(email: string): SeenStatuses | null {
  try {
    const raw = localStorage.getItem(key(email));
    return raw ? (JSON.parse(raw) as SeenStatuses) : null;
  } catch {
    return null;
  }
}

export function saveSeen(email: string, seen: SeenStatuses) {
  try {
    localStorage.setItem(key(email), JSON.stringify(seen));
  } catch {
    // Storage blocked: updates show again next time, which is harmless.
  }
}

/**
 * Compares the person's tickets with what they last saw. The first time (no record yet) nothing counts
 * as a change. Tickets the record has never seen are added silently: creating a ticket is not an update.
 * Returns the changes and the record to keep (changes stay "unseen" until dismissed).
 */
export function diffStatuses(seen: SeenStatuses | null, tickets: Ticket[]): { changes: StatusChange[]; seen: SeenStatuses } {
  const next: SeenStatuses = { ...(seen ?? {}) };
  const changes: StatusChange[] = [];
  for (const t of tickets) {
    const before = seen?.[t.id];
    if (before === undefined) next[t.id] = t.status;
    else if (before !== t.status) changes.push({ ticket: t, from: before });
  }
  return { changes, seen: next };
}

/** Marks one change as seen. */
export const acknowledge = (seen: SeenStatuses, ticket: Ticket): SeenStatuses => ({ ...seen, [ticket.id]: ticket.status });
