import type { NextFunction, Request, Response } from 'express';
import type { Config } from './config';
import type { Role, SessionUser } from '../src/types';
import type { Sessions } from './session';
import { RANK, type UserStore } from './users';
import { lockoutMessage, type SpamGuard } from './spamGuard';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
      /** Set instead of `user` when a student with a valid session is locked out by the spam guard. */
      lockout?: { retryAfterSeconds: number };
    }
  }
}

export function emailInDomain(email: string, domain: string): boolean {
  return email.toLowerCase().endsWith(`@${domain}`) && email.split('@').length === 2;
}

/**
 * Reads the session cookie on every request and attaches the person and their current role.
 * A locked-out student is treated as signed out here, because a signed cookie cannot be revoked.
 */
export function attachUser(sessions: Sessions, users: UserStore, config: Config, spam: SpamGuard) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const id = sessions.read(req.headers.cookie);
    // Re-check the domain every time: if the domain setting changes, old cookies stop working.
    if (id && emailInDomain(id.email, config.domain)) {
      const role = users.roleFor(id.email);
      const wait = role === 'student' ? spam.retryAfterSeconds(id.email) : 0;
      if (wait > 0) req.lockout = { retryAfterSeconds: wait };
      else req.user = { email: id.email, name: id.name, role };
    }
    next();
  };
}

/** The body sent when a locked-out student tries to do anything, or to sign in again. */
export const lockedOutBody = (retryAfterSeconds: number) => ({ error: 'LOCKED_OUT', message: lockoutMessage(retryAfterSeconds), retryAfterSeconds });

export function requireRole(min: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json(req.lockout ? lockedOutBody(req.lockout.retryAfterSeconds) : { error: 'UNAUTHORIZED', message: 'Please sign in.' });
      return;
    }
    if (RANK[req.user.role] < RANK[min]) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'You do not have access to this.' });
      return;
    }
    next();
  };
}

/** Blocks cross-site requests that change data (belt and braces on top of SameSite cookies). */
export function sameOriginForWrites(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) {
        res.status(403).json({ error: 'BAD_ORIGIN', message: 'Cross-site request blocked.' });
        return;
      }
    } catch {
      res.status(403).json({ error: 'BAD_ORIGIN', message: 'Cross-site request blocked.' });
      return;
    }
  }
  next();
}
