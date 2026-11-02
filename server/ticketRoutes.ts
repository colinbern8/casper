import express from 'express';
import type { Config } from './config';
import { requireRole } from './auth';
import type { SlidingWindowLimiter } from './rateLimit';
import type { TicketStore } from './store';
import { openTicketLimitBody, parseTicketInput, parseTicketUpdate } from './tickets';
import { notifyUrgentTicket } from './notify';
import { HELP_DESK } from '../src/data/schools';

export interface TicketDeps {
  config: Config;
  store: TicketStore;
  limiter: SlidingWindowLimiter;
}

const FIFTEEN_MIN = 15 * 60_000;

export function createTicketRouter({ config, store, limiter }: TicketDeps) {
  const router = express.Router();

  router.post('/', requireRole('student'), (req, res) => {
    const user = req.user!;
    const parsed = parseTicketInput(req.body, user);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error, message: parsed.message });
      return;
    }
    const v = parsed.value;
    // Checked before the rate limit, so a blocked attempt does not use up the student's allowance.
    if (v.userRole === 'student') {
      const open = store.openStudentTickets(user.email);
      if (open.length >= config.studentOpenTicketLimit) {
        res.status(429).json(openTicketLimitBody(open));
        return;
      }
    }
    const perUser = limiter.hit(`ticket-user:${user.email}`, v.userRole === 'student' ? 2 : 3, FIFTEEN_MIN);
    const perIp = limiter.hit(`ticket-ip:${req.ip || 'unknown'}`, 60, FIFTEEN_MIN);
    if (!perUser.allowed || !perIp.allowed) {
      res.status(429).json({
        error: 'TICKET_LIMIT_EXCEEDED',
        message:
          v.userRole === 'student'
            ? 'You already sent a request recently. Please take your Chromebook to the Media Center Tech Desk.'
            : `You have sent several requests recently. For something urgent, call the help desk at ${HELP_DESK.ext}.`,
      });
      return;
    }
    const ticket = store.create(v);
    void notifyUrgentTicket(config.notifyWebhookUrl, ticket);
    res.status(201).json(ticket);
  });

  // A person's own tickets, from their account: works on any device.
  router.get('/mine', requireRole('student'), (req, res) => {
    res.json(store.listByEmail(req.user!.email));
  });

  router.get('/', requireRole('tech'), (_req, res) => {
    res.json(store.list());
  });

  router.patch('/:id', requireRole('tech'), (req, res) => {
    const parsed = parseTicketUpdate(req.body);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error, message: parsed.message });
      return;
    }
    const { addNote, allowAnother, ...fields } = parsed.value;
    const patch: Record<string, unknown> = { ...fields };
    if (fields.priority) patch.priorityReason = `Priority changed by ${req.user!.name}`;

    const target = store.get(req.params.id);
    const notes: string[] = [];
    if (allowAnother !== undefined) {
      if (target && target.userRole !== 'student') {
        res.status(400).json({ error: 'NOT_A_STUDENT_TICKET', message: 'Only a student request can be released this way.' });
        return;
      }
      patch.allowsAnother = allowAnother;
      notes.push(allowAnother ? 'Allowed the student to send another request while this one is open.' : 'Withdrew permission for another request.');
    }
    if (addNote) notes.push(addNote);
    if (notes.length) {
      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const entries = notes.map(n => `[${stamp} UTC, ${req.user!.name}] ${n}`).join('\n');
      patch.techNotes = target?.techNotes ? `${target.techNotes}\n${entries}` : entries;
    }
    const updated = store.update(req.params.id, patch);
    if (!updated) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Ticket not found.' });
      return;
    }
    res.json(updated);
  });

  return router;
}
