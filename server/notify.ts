import type { Ticket } from '../src/types';

/**
 * Best-effort alert to a Slack/Teams-style incoming webhook for urgent
 * tickets. Never includes student data; never blocks or fails ticket creation.
 */
export async function notifyUrgentTicket(url: string | undefined, ticket: Ticket): Promise<void> {
  if (!url) return;
  if (ticket.priority !== 'critical' && ticket.priority !== 'high') return;
  if (ticket.userRole === 'student') return;

  const label = ticket.priority === 'critical' ? 'PRIORITY 1' : 'Priority 2';
  const text = `${label} ${ticket.ticketNumber}: ${ticket.title}\n${ticket.school}, ${ticket.room}${
    ticket.phoneOrExt ? ` (${ticket.phoneOrExt})` : ''
  }\nRouted to: ${ticket.assignedTech ?? 'unassigned'}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`Notify webhook returned ${res.status}`);
  } catch (err) {
    console.error('Notify webhook failed:', (err as Error).message);
  }
}
