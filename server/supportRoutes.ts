import express, { type Response } from 'express';
import type { Config } from './config';
import { requireRole } from './auth';
import type { SlidingWindowLimiter } from './rateLimit';
import type { TicketStore } from './store';
import type { CaseStore } from './cases';
import { clean, cleanMultiline, openTicketLimitBody, parseTicketInput } from './tickets';
import { DEMO_SCHOOL, studentFor } from './supportFixtures';
import { buildDraft, buildTicketBody, toStudentView } from './support';
import { findSupportIssue } from '../src/data/supportContent';
import { DISPOSITION_VALUES, LANGUAGES, MAX_REPORTED_ISSUES, SUPPORT_ISSUE_IDS, type SupportCase } from '../src/types';
import { HELP_DESK } from '../src/data/schools';

export interface SupportDeps {
  config: Config;
  store: TicketStore;
  cases: CaseStore;
  limiter: SlidingWindowLimiter;
}

const FIFTEEN_MIN = 15 * 60_000;
const bad = (res: Response, error: string, message: string, status = 400) => res.status(status).json({ error, message });

/**
 * Bilingual student-support PROTOTYPE routes. Demo mode only; every route is a 404
 * otherwise. Nothing here contacts an outside system or sends a message.
 */
export function createSupportRouter({ config, store, cases, limiter }: SupportDeps) {
  const router = express.Router();

  router.use((_req, res, next) => {
    if (!config.demoMode) return bad(res, 'NOT_FOUND', 'Unknown API route.', 404);
    next();
  });
  router.use(requireRole('student'));

  const limited = (res: Response, key: string, limit: number): boolean => {
    if (limiter.hit(key, limit, FIFTEEN_MIN).allowed) return false;
    bad(res, 'RATE_LIMITED', 'Too many requests. Please wait a few minutes.', 429);
    return true;
  };

  /** The student's own open case, or a response explaining why not. */
  const ownOpenCase = (req: express.Request, res: Response): SupportCase | undefined => {
    const found = cases.get(req.params.id);
    if (!found || found.student.email !== req.user!.email) {
      bad(res, 'NOT_FOUND', 'Case not found.', 404);
      return undefined;
    }
    if (found.outcome !== 'open') {
      bad(res, 'CASE_CLOSED', 'This case is already finished.', 409);
      return undefined;
    }
    return found;
  };

  // Asked as soon as the student picks a language, so a student who is at the request limit is told
  // straight away, instead of after walking through the whole conversation.
  router.get('/limit', (req, res) => {
    const open = store.openStudentTickets(req.user!.email);
    res.json({ atLimit: open.length >= config.studentOpenTicketLimit, openTicketNumbers: open.map(t => t.ticketNumber) });
  });

  router.post('/cases', (req, res) => {
    const user = req.user!;
    const { language, issueId } = req.body ?? {};
    if (!LANGUAGES.includes(language)) return bad(res, 'INVALID_LANGUAGE', 'Choose English or Spanish.');
    if (!SUPPORT_ISSUE_IDS.includes(issueId)) return bad(res, 'INVALID_ISSUE', 'Choose an issue from the list.');
    if (limited(res, `support-create:${user.email}`, 10)) return;

    const fixture = studentFor(user.email, config.domain);
    const description = cleanMultiline(req.body?.description, 500) || undefined;
    const now = new Date().toISOString();
    const created = cases.create({
      language,
      student: {
        email: user.email,
        displayName: fixture?.displayName ?? user.name,
        school: fixture?.school ?? DEMO_SCHOOL,
        room: fixture?.room ?? 'Not on demo roster',
        onRoster: Boolean(fixture),
      },
      reported: { issueId, description },
      attempts: [],
      outcome: 'open',
      history: [{ at: now, by: user.name, action: 'case_started', detail: `${issueId}, ${language}` }],
    });
    res.status(201).json(toStudentView(created));
  });

  // Technicians and admins see everything; a student only ever sees their own, without technician fields.
  router.get('/cases/:id', (req, res) => {
    const found = cases.get(req.params.id);
    if (!found) return bad(res, 'NOT_FOUND', 'Case not found.', 404);
    const user = req.user!;
    if (user.role === 'tech' || user.role === 'admin') return res.json(found);
    if (found.student.email !== user.email) return bad(res, 'NOT_FOUND', 'Case not found.', 404);
    res.json(toStudentView(found));
  });

  // The red tag is recorded exactly as typed, for the technician to read. It is never looked up.
  router.post('/cases/:id/red-tag', (req, res) => {
    const found = ownOpenCase(req, res);
    if (!found) return;
    if (limited(res, `support-act:${req.user!.email}`, 60)) return;
    const value = clean(req.body?.tag, 40);
    if (!value) return bad(res, 'INVALID_TAG', 'Enter the number on the red tag.');

    const at = new Date().toISOString();
    const saved = cases.save({
      ...found,
      redTag: { value, recordedAt: at },
      history: [...found.history, { at, by: req.user!.name, action: 'tag_recorded' }],
    });
    res.json(toStudentView(saved));
  });

  // Lets a student list another problem in the same request. Only the first problem gets troubleshooting steps.
  router.post('/cases/:id/issues', (req, res) => {
    const found = ownOpenCase(req, res);
    if (!found) return;
    if (limited(res, `support-act:${req.user!.email}`, 60)) return;
    const { issueId } = req.body ?? {};
    if (!SUPPORT_ISSUE_IDS.includes(issueId)) return bad(res, 'INVALID_ISSUE', 'Choose an issue from the list.');

    const extras = found.additionalIssues ?? [];
    if (1 + extras.length >= MAX_REPORTED_ISSUES) {
      return bad(res, 'TOO_MANY_ISSUES', `One request can list at most ${MAX_REPORTED_ISSUES} problems.`, 409);
    }
    // "Something else" may be listed more than once (each has its own words); the rest only once.
    if (issueId !== 'other' && [found.reported, ...extras].some(r => r.issueId === issueId)) {
      return bad(res, 'ALREADY_LISTED', 'That problem is already on this request.', 409);
    }
    const description = cleanMultiline(req.body?.description, 500) || undefined;
    if (issueId === 'other' && !description) return bad(res, 'DESCRIPTION_REQUIRED', 'Say what is wrong.');

    const at = new Date().toISOString();
    const saved = cases.save({
      ...found,
      additionalIssues: [...extras, { issueId, description }],
      history: [...found.history, { at, by: req.user!.name, action: 'issue_added', detail: issueId }],
    });
    res.json(toStudentView(saved));
  });

  router.post('/cases/:id/attempts', (req, res) => {
    const found = ownOpenCase(req, res);
    if (!found) return;
    if (limited(res, `support-act:${req.user!.email}`, 60)) return;
    const issue = findSupportIssue(found.reported.issueId)!;
    const { stepId, result } = req.body ?? {};
    if (!issue.steps.some(s => s.id === stepId)) return bad(res, 'INVALID_STEP', 'Unknown step for this issue.');
    if (result !== 'worked' && result !== 'not_worked') return bad(res, 'INVALID_RESULT', 'Result must be worked or not_worked.');

    const now = new Date().toISOString();
    const attempts = [...found.attempts.filter(a => a.stepId !== stepId), { stepId, result, at: now }];
    const next: SupportCase = { ...found, attempts };
    if (result === 'worked') {
      next.outcome = 'resolved';
      next.history = [...found.history, { at: now, by: req.user!.name, action: 'resolved', detail: `student reported fixed at ${stepId}` }];
    }
    res.json(toStudentView(cases.save(next)));
  });

  router.post('/cases/:id/escalate', (req, res) => {
    const found = ownOpenCase(req, res);
    if (!found) return;
    const user = req.user!;
    const parsed = parseTicketInput(buildTicketBody(found), user);
    if (!parsed.ok) return bad(res, parsed.error, parsed.message);
    const v = parsed.value;
    // Same policy as POST /api/tickets, checked first so a blocked attempt does not use up the allowance.
    if (v.userRole === 'student') {
      const open = store.openStudentTickets(user.email);
      if (open.length >= config.studentOpenTicketLimit) {
        // No ticket is created. Close the case as `blocked` so it is not left open forever.
        const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 40) : 'not given';
        const body = openTicketLimitBody(open);
        cases.save({
          ...found,
          outcome: 'blocked',
          history: [...found.history, { at: new Date().toISOString(), by: user.name, action: 'blocked', detail: `at request limit (${body.openTicketNumbers.join(', ')}); reason: ${reason}` }],
        });
        return res.status(429).json(body);
      }
    }
    // Same limits as POST /api/tickets, so this path cannot be used to get around them.
    const perUser = limiter.hit(`ticket-user:${user.email}`, v.userRole === 'student' ? 2 : 3, FIFTEEN_MIN);
    const perIp = limiter.hit(`ticket-ip:${req.ip || 'unknown'}`, 60, FIFTEEN_MIN);
    if (!perUser.allowed || !perIp.allowed) {
      return bad(
        res,
        'TICKET_LIMIT_EXCEEDED',
        v.userRole === 'student'
          ? 'You already sent a request recently. Please take your Chromebook to the Media Center Tech Desk.'
          : `You have sent several requests recently. For something urgent, call the help desk at ${HELP_DESK.ext}.`,
        429,
      );
    }

    // No webhook call: this prototype takes no external action.
    const ticket = store.create({ ...v, caseId: found.id });
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 40) : 'not given';
    const saved = cases.save({
      ...found,
      outcome: 'escalated',
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      history: [...found.history, { at: new Date().toISOString(), by: user.name, action: 'escalated', detail: `${ticket.ticketNumber}; reason: ${reason}` }],
    });
    res.status(201).json({ case: toStudentView(saved), ticket });
  });

  // A technician's demo decision. It only records the decision and drafts a message; it does nothing else.
  router.post('/cases/:id/disposition', requireRole('tech'), (req, res) => {
    const found = cases.get(req.params.id);
    if (!found) return bad(res, 'NOT_FOUND', 'Case not found.', 404);
    if (found.outcome !== 'escalated') return bad(res, 'NOT_ESCALATED', 'Only escalated cases take a disposition.', 409);
    const value = req.body?.value;
    if (!DISPOSITION_VALUES.includes(value)) return bad(res, 'INVALID_DISPOSITION', 'Unknown disposition.');

    const now = new Date();
    const note = cleanMultiline(req.body?.note, 300) || undefined;
    const by = req.user!.name;
    const saved = cases.save({
      ...found,
      disposition: { demo: true, value, note, by, at: now.toISOString() },
      notificationDraft: buildDraft(found, value, now),
      history: [...found.history, { at: now.toISOString(), by, action: 'disposition_recorded', detail: value }],
    });
    res.json(saved);
  });

  return router;
}
