import express, { type Response } from 'express';
import type { Config } from './config';
import { emailInDomain } from './auth';
import type { Sessions } from './session';
import type { GoogleVerifier } from './google';
import type { UserStore } from './users';
import type { SlidingWindowLimiter } from './rateLimit';

export interface AuthDeps {
  config: Config;
  users: UserStore;
  sessions: Sessions;
  /** Verifies a Google sign-in token. Absent when GOOGLE_CLIENT_ID is not configured. */
  verifyGoogle?: GoogleVerifier;
  limiter: SlidingWindowLimiter;
}

export function createAuthRouter({ config, users, sessions, verifyGoogle, limiter }: AuthDeps) {
  const router = express.Router();

  const startSession = (res: Response, email: string, name: string) => {
    res.setHeader('Set-Cookie', sessions.setCookie(sessions.create({ email, name })));
    return { email, name, role: users.roleFor(email) };
  };

  router.get('/me', (req, res) => {
    res.json({ user: req.user ?? null });
  });

  router.post('/google', async (req, res) => {
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
  router.post('/dev', (req, res) => {
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

  router.post('/logout', (_req, res) => {
    res.setHeader('Set-Cookie', sessions.clearCookie());
    res.json({ ok: true });
  });

  return router;
}
