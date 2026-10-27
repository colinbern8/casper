import type { Ticket } from '../src/types';

/**
 * Best-effort alert to a Slack/Teams-style incoming webhook for urgent
 * tickets. Never includes student data; never blocks or fails ticket creation.
 */
export async function notifyUrgentTicket(url: string | undefined, ticket: Ticket, retryDelayMs = 2000): Promise<void> {
  if (!url) return;
  if (ticket.priority !== 'critical' && ticket.priority !== 'high') return;
  if (ticket.userRole === 'student') return;

  const label = ticket.priority === 'critical' ? 'PRIORITY 1' : 'Priority 2';
  const text = `${label} ${ticket.ticketNumber}: ${ticket.title}\n${ticket.school}, ${ticket.room}${
    ticket.phoneOrExt ? ` (${ticket.phoneOrExt})` : ''
  }\nRouted to: ${ticket.assignedTech ?? 'unassigned'}`;

  // One retry after a short pause: a brief network blip should not swallow a Priority 1 alert.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return;
      console.error(`Notify webhook returned ${res.status} (attempt ${attempt} of 2)`);
    } catch (err) {
      console.error(`Notify webhook failed (attempt ${attempt} of 2):`, (err as Error).message);
    }
    if (attempt < 2) await new Promise(r => setTimeout(r, retryDelayMs));
  }
}
