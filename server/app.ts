import express, { type NextFunction, type Request, type Response } from 'express';
import type { Config } from './config';
import { attachUser, emailInDomain, requireRole, sameOriginForWrites } from './auth';
import { createSessions } from './session';
import type { GoogleVerifier } from './google';
import type { UserStore } from './users';
import { SlidingWindowLimiter } from './rateLimit';
import { screenMessage } from './safety';
import { TicketStore } from './store';
import { parseTicketInput, parseTicketUpdate } from './tickets';
import { ChatService, fallbackReply, normalizeHistory, type ChatContext } from './chat';
import { notifyUrgentTicket } from './notify';
import { CaseStore } from './cases';
import { createSupportRouter } from './supportRoutes';
import { HELP_DESK } from '../src/data/schools';
import type { PublicConfig } from '../src/types';

export interface AppDeps {
  config: Config;
  store: TicketStore;
  users: UserStore;
  chat: ChatService;
  /** Verifies a Google sign-in token. Absent when GOOGLE_CLIENT_ID is not configured. */
  verifyGoogle?: GoogleVerifier;
  /** Student-support demo cases. Defaults to an in-memory store. */
  cases?: CaseStore;
  limiter?: SlidingWindowLimiter;
}

const FIFTEEN_MIN = 15 * 60_000;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

export function createApp({ config, store, users, chat, verifyGoogle, cases = new CaseStore(null), limiter = new SlidingWindowLimiter() }: AppDeps) {
  const app = express();
  const sessions = createSessions(config.sessionSecret, config.isProduction);

  if (config.trustProxy) app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '200kb' }));
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', sameOriginForWrites);
  app.use('/api', attachUser(sessions, users, config));

  // Daily cap on model calls so a bug or abuse cannot run up a bill.
  let daily = { day: '', count: 0 };
  const underDailyCap = (): boolean => {
    const day = new Date().toISOString().slice(0, 10);
    if (daily.day !== day) daily = { day, count: 0 };
    return daily.count < config.dailyChatLimit;
  };

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
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

  app.get('/api/auth/me', (req, res) => {
    res.json({ user: req.user ?? null });
  });

  app.post('/api/auth/google', async (req, res) => {
    const hit = limiter.hit(`auth-ip:${req.ip || 'unknown'}`, 30, 10 * 60_000);
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
    const { addNote, ...fields } = parsed.value;
    const patch: Record<string, unknown> = { ...fields };
    if (fields.priority) patch.priorityReason = `Priority changed by ${req.user!.name}`;
    if (addNote) {
      const existing = store.get(req.params.id)?.techNotes;
      const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const entry = `[${stamp} UTC, ${req.user!.name}] ${addNote}`;
      patch.techNotes = existing ? `${existing}\n${entry}` : entry;
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
  app.post('/api/chat', requireRole('student'), async (req, res, next) => {
    try {
      const user = req.user!;
      const history = normalizeHistory(req.body?.messages);
      if (!history) {
        res.status(400).json({ error: 'INVALID_MESSAGES', text: 'Please send a message.' });
        return;
      }
      const uc = req.body?.userContext && typeof req.body.userContext === 'object' ? req.body.userContext : {};

      // Schools share one public IP, so the per-IP ceiling is generous; the per-user limit is the tight one.
      const ipCheck = limiter.hit(`chat-ip:${req.ip || 'unknown'}`, 120, 60_000);
      const userCheck = limiter.hit(`chat-user:${user.email}`, 5, 30_000);
      if (!ipCheck.allowed || !userCheck.allowed) {
        const wait = Math.max(1, Math.ceil(Math.max(ipCheck.retryAfterMs, userCheck.retryAfterMs) / 1000));
        res.status(429).json({
          text: `Please wait ${wait} seconds before sending another message.`,
          isSafetyBlocked: true,
          cooldownSeconds: wait,
        });
        return;
      }

      const isStudent = user.role === 'student';
      const isActiveClass = !isStudent && uc.role === 'teacher_active';

      for (const turn of history) {
        if (turn.role !== 'user') continue;
        const screen = screenMessage(turn.content);
        if (screen.blocked) {
          res.json({
            text: screen.message,
            isSafetyBlocked: true,
            needsEscalation: false,
            suggestedActions: isStudent
              ? ['Chromebook will not turn on', 'Cannot connect to school Wi-Fi', 'Forgot account password or login']
              : ['Smartboard or display shows "No Signal"', 'Student Chromebook cannot connect to Wi-Fi', 'Audio playing from laptop instead of room speakers'],
          });
          return;
        }
      }

      const ctx: ChatContext = {
        isStudent,
        isActiveClass,
        school: uc.school,
        room: uc.room,
        deviceType: uc.deviceType,
        assetTag: uc.assetTag,
      };

      if (!chat.hasModel || !underDailyCap()) {
        res.json(fallbackReply(ctx, history[history.length - 1].content));
        return;
      }
      daily.count += 1;
      res.json(await chat.reply(history, ctx));
    } catch (err) {
      next(err);
    }
  });

  // ---- Student-support prototype (demo mode only) -------------------------
  app.use('/api/support', createSupportRouter({ config, store, cases, limiter }));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Unknown API route.' });
  });

  // JSON parse errors and anything unexpected. No stack traces to clients.
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid request body.' });
      return;
    }
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
  });

  return app;
}
