import express, { type NextFunction, type Request, type Response } from 'express';
import { LIMITS, type Config } from './config';
import { attachUser, emailInDomain, lockedOutBody, requireRole, sameOriginForWrites } from './auth';
import { SpamGuard, lockoutMessage, type StrikeResult } from './spamGuard';
import { createSessions } from './session';
import type { GoogleVerifier } from './google';
import type { UserStore } from './users';
import { SlidingWindowLimiter } from './rateLimit';
import { screenMessage } from './safety';
import { TicketStore } from './store';
import { openTicketLimitBody, parseTicketInput, parseTicketUpdate } from './tickets';
import { builtInReply, normalizeHistory, type ChatContext } from './chat';
import { notifyUrgentTicket } from './notify';
import { CaseStore } from './cases';
import { createSupportRouter } from './supportRoutes';
import { HELP_DESK } from '../src/data/schools';
import type { PublicConfig } from '../src/types';

export interface AppDeps {
  config: Config;
  store: TicketStore;
  users: UserStore;
  /** Verifies a Google sign-in token. Absent when GOOGLE_CLIENT_ID is not configured. */
  verifyGoogle?: GoogleVerifier;
  /** Student-support demo cases. Defaults to an in-memory store. */
  cases?: CaseStore;
  limiter?: SlidingWindowLimiter;
  /** Student strike counter and lockouts. Tests pass one with a fake clock. */
  spamGuard?: SpamGuard;
  /** Throws if the server cannot do its job (for example, the data folder is not writable). Used by /api/health. */
  healthCheck?: () => void;
  /** Log one line per API request (method, path, status, time). No bodies, emails or query strings. */
  accessLog?: boolean;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

export function createApp({ config, store, users, verifyGoogle, cases = new CaseStore(null), limiter = new SlidingWindowLimiter(), spamGuard = new SpamGuard(), healthCheck, accessLog = false }: AppDeps) {
  const app = express();
  const sessions = createSessions(config.sessionSecret, config.isProduction);

  if (config.trustProxy) app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');
  app.use(express.json({ limit: LIMITS.bodyLimit }));
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  if (accessLog) {
    app.use('/api', (req, res, next) => {
      const started = Date.now();
      res.on('finish', () => {
        if (req.path === '/health') return;
        console.log(`${req.method} /api${req.path} ${res.statusCode} ${Date.now() - started}ms`);
      });
      next();
    });
  }
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', sameOriginForWrites);
  app.use('/api', attachUser(sessions, users, config, spamGuard));

  app.get('/api/health', (_req, res) => {
    try {
      healthCheck?.();
      res.json({ ok: true });
    } catch (err) {
      console.error('Health check failed:', (err as Error).message);
      res.status(503).json({ ok: false });
    }
  });

  app.get('/api/config', (_req, res) => {
    const body: PublicConfig = {
      googleClientId: config.googleClientId,
      devLogin: config.devLogin,
      demoMode: config.demoMode,
      domain: config.domain,
      districtName: config.districtName,
    };
    res.json(body);
  });

  // ---- Sign-in ---------------------------------------------------------
  const startSession = (res: Response, email: string, name: string) => {
    res.setHeader('Set-Cookie', sessions.setCookie(sessions.create({ email, name })));
    return { email, name, role: users.roleFor(email) };
  };
  /** A student locked out by the spam guard cannot sign in again until the lockout ends. */
  const refuseLockedOut = (res: Response, email: string): boolean => {
    const wait = users.roleFor(email) === 'student' ? spamGuard.retryAfterSeconds(email) : 0;
    if (wait > 0) res.status(403).json(lockedOutBody(wait));
    return wait > 0;
  };
  /** Counts a bad message for a student. At the limit the response also clears the sign-in cookie. */
  const countStrike = (res: Response, email: string): StrikeResult => {
    const result = spamGuard.strike(email);
    if (result.action === 'sign_out') res.setHeader('Set-Cookie', sessions.clearCookie());
    return result;
  };

  app.get('/api/auth/me', (req, res) => {
    const lockout = req.lockout && { retryAfterSeconds: req.lockout.retryAfterSeconds, message: lockoutMessage(req.lockout.retryAfterSeconds) };
    res.json({ user: req.user ?? null, ...(lockout ? { lockout } : {}) });
  });

  app.post('/api/auth/google', async (req, res) => {
    const hit = limiter.hit(`auth-ip:${req.ip || 'unknown'}`, LIMITS.signIn.perIp, LIMITS.signIn.windowMs);
    if (!hit.allowed) {
      res.status(429).json({ error: 'TOO_MANY_ATTEMPTS', message: 'Too many sign-in attempts. Try again in a few minutes.' });
      return;
    }
    if (!verifyGoogle) {
      res.status(503).json({ error: 'SIGN_IN_NOT_CONFIGURED', message: 'Google sign-in is not configured on this server.' });
      return;
    }
    const credential = req.body?.credential;
    if (typeof credential !== 'string' || credential.length > 5000) {
      res.status(400).json({ error: 'INVALID_CREDENTIAL', message: 'Missing sign-in credential.' });
      return;
    }
    try {
      const g = await verifyGoogle(credential);
      // Must be a verified Google Workspace account from OUR domain, not just any address that ends with it.
      if (!g.emailVerified || g.hostedDomain !== config.domain || !emailInDomain(g.email, config.domain)) {
        res.status(403).json({ error: 'WRONG_ACCOUNT', message: `Sign in with your @${config.domain} school account.` });
        return;
      }
      if (refuseLockedOut(res, g.email)) return;
      res.json({ user: startSession(res, g.email, g.name) });
    } catch {
      res.status(401).json({ error: 'SIGN_IN_FAILED', message: 'Sign-in failed. Please try again.' });
    }
  });

  // Development only (config refuses it in production).
  app.post('/api/auth/dev', (req, res) => {
    if (!config.devLogin) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Unknown API route.' });
      return;
    }
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const name = typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim().slice(0, 80) : email.split('@')[0];
    if (!emailInDomain(email, config.domain)) {
      res.status(400).json({ error: 'WRONG_ACCOUNT', message: `Use an @${config.domain} address.` });
      return;
    }
    if (refuseLockedOut(res, email)) return;
    res.json({ user: startSession(res, email, name) });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.setHeader('Set-Cookie', sessions.clearCookie());
    res.json({ ok: true });
  });

  // ---- Tickets ---------------------------------------------------------
  app.post('/api/tickets', requireRole('student'), (req, res) => {
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
    const { perStudent, perStaff, perIp: ipMax, windowMs } = LIMITS.tickets;
    const perUser = limiter.hit(`ticket-user:${user.email}`, v.userRole === 'student' ? perStudent : perStaff, windowMs);
    const perIp = limiter.hit(`ticket-ip:${req.ip || 'unknown'}`, ipMax, windowMs);
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
  app.get('/api/tickets/mine', requireRole('student'), (req, res) => {
    res.json(store.listByEmail(req.user!.email));
  });

  app.get('/api/tickets', requireRole('tech'), (_req, res) => {
    res.json(store.list());
  });

  app.patch('/api/tickets/:id', requireRole('tech'), (req, res) => {
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

  // ---- Admin: who has which role ----------------------------------------
  app.get('/api/admin/users', requireRole('admin'), (_req, res) => {
    res.json(users.list());
  });

  app.put('/api/admin/users/:email', requireRole('admin'), (req, res) => {
    const email = req.params.email.toLowerCase();
    const role = req.body?.role;
    if (!emailInDomain(email, config.domain)) {
      res.status(400).json({ error: 'WRONG_DOMAIN', message: `Use an @${config.domain} address.` });
      return;
    }
    if (role !== 'staff' && role !== 'tech' && role !== 'admin') {
      res.status(400).json({ error: 'INVALID_ROLE', message: 'Role must be staff, tech, or admin.' });
      return;
    }
    if (email === req.user!.email) {
      res.status(400).json({ error: 'SELF_CHANGE', message: 'You cannot change your own role.' });
      return;
    }
    const result = users.set(email, role, req.user!.email);
    if (result === 'locked') {
      res.status(400).json({ error: 'LOCKED', message: 'This admin is set in server settings and cannot be changed here.' });
      return;
    }
    res.json(result);
  });

  app.delete('/api/admin/users/:email', requireRole('admin'), (req, res) => {
    const email = req.params.email.toLowerCase();
    if (email === req.user!.email) {
      res.status(400).json({ error: 'SELF_CHANGE', message: 'You cannot remove yourself.' });
      return;
    }
    const result = users.remove(email);
    if (result === 'locked') {
      res.status(400).json({ error: 'LOCKED', message: 'This admin is set in server settings and cannot be removed here.' });
      return;
    }
    if (!result) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'That person has no role to remove.' });
      return;
    }
    res.json({ ok: true });
  });

  // Paste or upload a list of staff emails (for example a Google Admin console export).
  app.post('/api/admin/users/import', requireRole('admin'), (req, res) => {
    const text: string = typeof req.body?.text === 'string' ? req.body.text : '';
    if (!text || text.length > 500_000) {
      res.status(400).json({ error: 'INVALID_LIST', message: 'Paste a list of email addresses.' });
      return;
    }
    const found: string[] = Array.from(new Set((text.match(EMAIL_RE) || []).map((e: string) => e.toLowerCase())));
    const inDomain = found.filter(e => emailInDomain(e, config.domain));
    const result = users.importStaff(inDomain, req.user!.email);
    res.json({ ...result, ignoredOutsideDomain: found.length - inDomain.length });
  });

  // ---- Chat ------------------------------------------------------------
  // Free-text questions get a built-in answer. There is no AI behind this route.
  app.post('/api/chat', requireRole('student'), (req, res) => {
    const user = req.user!;
    const history = normalizeHistory(req.body?.messages);
    if (!history) {
      res.status(400).json({ error: 'INVALID_MESSAGES', text: 'Please send a message.' });
      return;
    }
    const uc = req.body?.userContext && typeof req.body.userContext === 'object' ? req.body.userContext : {};

    // Schools share one public IP, so the per-IP ceiling is generous; the per-user limit is the tight one.
    const ipCheck = limiter.hit(`chat-ip:${req.ip || 'unknown'}`, LIMITS.chat.perIp, LIMITS.chat.ipWindowMs);
    const userCheck = limiter.hit(`chat-user:${user.email}`, LIMITS.chat.perUser, LIMITS.chat.userWindowMs);
    if (!ipCheck.allowed || !userCheck.allowed) {
      const wait = Math.max(1, Math.ceil(Math.max(ipCheck.retryAfterMs, userCheck.retryAfterMs) / 1000));
      // Too many messages too fast counts as a bad message for a student.
      const strike = user.role === 'student' && !userCheck.allowed ? countStrike(res, user.email) : undefined;
      res.status(429).json({
        text: `Please wait ${wait} seconds before sending another message.`,
        isSafetyBlocked: true,
        cooldownSeconds: wait,
        ...strikeFields(strike, user.email),
      });
      return;
    }

    const isStudent = user.role === 'student';
    // Only the new message is screened: earlier ones were screened when they were sent.
    const latest = history[history.length - 1].content;
    const screen = screenMessage(latest);
    // A student's blocked or repeated message counts toward the spam guard (staff are never counted).
    const repeated = isStudent && spamGuard.isRepeat(user.email, latest);
    if (screen.blocked || repeated) {
      const strike = isStudent ? countStrike(res, user.email) : undefined;
      res.json({
        text: screen.blocked ? screen.message : 'You already sent that message. Please describe the problem in different words, or pick one below.',
        isSafetyBlocked: true,
        needsEscalation: false,
        suggestedActions: isStudent
          ? ['Chromebook will not turn on', 'Cannot connect to school Wi-Fi', 'Forgot account password or login']
          : ['Smartboard or display shows "No Signal"', 'Student Chromebook cannot connect to Wi-Fi', 'Audio playing from laptop instead of room speakers'],
        ...strikeFields(strike, user.email),
      });
      return;
    }

    const ctx: ChatContext = { isStudent, deviceType: typeof uc.deviceType === 'string' ? uc.deviceType : '' };
    res.json(builtInReply(ctx, history[history.length - 1].content));
  });

  /** What a chat reply says about a strike, in English (the built-in chat is English only). */
  function strikeFields(strike: StrikeResult | undefined, email: string) {
    if (!strike || strike.action === 'none') return {};
    if (strike.action === 'sign_out') return { signedOut: true, ...lockedOutBody(spamGuard.retryAfterSeconds(email)) };
    return {
      warning: `Please only send messages about a technology problem. ${strike.remaining === 1 ? 'One more' : `${strike.remaining} more`} and you will be signed out for ${Math.round(spamGuard.limits.lockoutMs / 60_000)} minutes.`,
    };
  }

  // ---- Student-support prototype (demo mode only) -------------------------
  app.use('/api/support', createSupportRouter({ config, store, cases, limiter, spamGuard, countStrike }));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Unknown API route.' });
  });

  // JSON parse errors and anything unexpected. No stack traces to clients.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const type = (err as { type?: string } | null)?.type;
    if (type === 'entity.parse.failed' || type === 'entity.too.large') {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid request body.' });
      return;
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
  });

  return app;
}
