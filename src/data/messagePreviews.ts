import type { Language, Ticket, TicketStatus } from '../types';
import { HELP_DESK } from './schools';

/**
 * Messages the help desk WOULD send, shown as previews only. Nothing in this prototype sends them:
 * real email or a digest is final-version work (TODO.md F2). Fixed text, no AI. Student text is in the
 * student's language; the Spanish awaits human review. Staff and technician text is English.
 */

export interface MessagePreview {
  to: string;
  subject: string;
  body: string;
  language: Language;
}

/** What a status means for the person who asked, in plain words. */
export const STATUS_FOR_REQUESTER: Record<TicketStatus, Record<Language, string>> = {
  open: { en: 'Waiting for a technician', es: 'Esperando a un técnico' },
  assigned: { en: 'Assigned to a technician', es: 'Asignada a un técnico' },
  dispatched: { en: 'Technician on the way', es: 'El técnico va en camino' },
  in_progress: { en: 'Technician working on it', es: 'El técnico está trabajando en ella' },
  hardware_swap: { en: 'Replacement or loaner in progress', es: 'Reemplazo o préstamo en curso' },
  resolved: { en: 'Resolved', es: 'Resuelta' },
};

const NEXT_STEP: Record<TicketStatus, Record<Language, string>> = {
  open: { en: 'No action is needed from you yet.', es: 'Por ahora no necesitas hacer nada.' },
  assigned: { en: 'A technician has your request and will follow up.', es: 'Un técnico tiene tu solicitud y te contactará.' },
  dispatched: { en: 'Please stay nearby if you can.', es: 'Por favor, quédate cerca si puedes.' },
  in_progress: { en: 'No action is needed from you right now.', es: 'Por ahora no necesitas hacer nada.' },
  hardware_swap: { en: 'Please bring your device to the Media Center Tech Desk.', es: 'Por favor, lleva tu dispositivo al Media Center Tech Desk.' },
  resolved: { en: 'If the problem comes back, please start a new request.', es: 'Si el problema vuelve, por favor inicia una nueva solicitud.' },
};

/** The note to the requester when their ticket's status changes. */
export function requesterUpdate(ticket: Ticket, language: Language): MessagePreview {
  const lang: Language = ticket.userRole === 'student' ? language : 'en';
  const status = STATUS_FOR_REQUESTER[ticket.status][lang];
  const greeting = lang === 'es' ? `Hola ${ticket.userName}:` : `Hi ${ticket.userName},`;
  const line = lang === 'es' ? `Tu solicitud ${ticket.ticketNumber} ("${ticket.title}") ahora está: ${status}.` : `Your request ${ticket.ticketNumber} ("${ticket.title}") is now: ${status}.`;
  const help = lang === 'es' ? `¿Es urgente? Llama al ${HELP_DESK.ext}.` : `Urgent? Call ${HELP_DESK.ext}.`;
  return {
    to: ticket.userEmail,
    subject: lang === 'es' ? `Actualización de tu solicitud ${ticket.ticketNumber}` : `Update on your request ${ticket.ticketNumber}`,
    body: [greeting, '', line, NEXT_STEP[ticket.status][lang], '', help].join('\n'),
    language: lang,
  };
}

/** The alert a technician would get when a student request arrives. No student words beyond the title. */
export function studentAlert(ticket: Ticket): MessagePreview {
  return {
    to: `${ticket.assignedTech || 'Technicians'} (${ticket.school})`,
    subject: `New student request ${ticket.ticketNumber} at ${ticket.school}`,
    body: [
      `A student request arrived at ${new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      '',
      `Ticket: ${ticket.ticketNumber}`,
      `Problem: ${ticket.title}`,
      `Where: ${ticket.school}, ${ticket.room}`,
      ticket.assetTag ? `Red tag: ${ticket.assetTag}` : 'Red tag: not given',
      `Steps the student tried: ${ticket.troubleshootStepsAttempted.length}`,
      '',
      'The student was told to bring the Chromebook to the Media Center Tech Desk.',
    ].join('\n'),
    language: 'en',
  };
}

/** A daily digest of open student requests, grouped by school: the alternative to one alert each. */
export function studentDigest(tickets: Ticket[], now = new Date()): MessagePreview {
  const open = tickets.filter(t => t.userRole === 'student' && t.status !== 'resolved');
  const bySchool = new Map<string, Ticket[]>();
  for (const t of open) bySchool.set(t.school, [...(bySchool.get(t.school) ?? []), t]);
  const sections = [...bySchool.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([school, list]) => [`${school} (${list.length})`, ...list.map(t => `  - ${t.ticketNumber}: ${t.title}${t.assetTag ? `, red tag ${t.assetTag}` : ''}`)].join('\n'));
  return {
    to: 'Media Center Tech Desk and school technicians',
    subject: `Student requests still open: ${open.length} (${now.toLocaleDateString([], { month: 'short', day: 'numeric' })})`,
    body: open.length ? [`Open student requests as of ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}:`, '', ...sections].join('\n') : 'No student requests are open.',
    language: 'en',
  };
}
