import express, { type NextFunction, type Request, type Response } from 'express';
import type { Config } from './config';
import { attachUser, sameOriginForWrites } from './auth';
import { createSessions } from './session';
import type { GoogleVerifier } from './google';
import type { UserStore } from './users';
import { SlidingWindowLimiter } from './rateLimit';
import { TicketStore } from './store';
import { CaseStore } from './cases';
import { createAuthRouter } from './authRoutes';
import { createTicketRouter } from './ticketRoutes';
import { createAdminRouter } from './adminRoutes';
import { createChatRouter } from './chatRoutes';
import { createSupportRouter } from './supportRoutes';
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
  /** Throws if the server cannot do its job (for example, the data folder is not writable). Used by /api/health. */
  healthCheck?: () => void;
  /** Log one line per API request (method, path, status, time). No bodies, emails or query strings. */
  accessLog?: boolean;
}

export function createApp({ config, store, users, verifyGoogle, cases = new CaseStore(null), limiter = new SlidingWindowLimiter(), healthCheck, accessLog = false }: AppDeps) {
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
  app.use('/api', attachUser(sessions, users, config));

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

  app.use('/api/auth', createAuthRouter({ config, users, sessions, verifyGoogle, limiter }));
  app.use('/api/tickets', createTicketRouter({ config, store, limiter }));
  app.use('/api/admin', createAdminRouter({ config, users }));
  app.use('/api/chat', createChatRouter({ limiter }));

  // ---- Student-support prototype (demo mode only) -------------------------
  app.use('/api/support', createSupportRouter({ config, store, cases, limiter }));

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
