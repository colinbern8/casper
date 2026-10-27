import type { NextFunction, Request, Response } from 'express';
import type { Config } from './config';
import type { Role } from '../src/types';
import type { Sessions } from './session';
import { RANK, type UserStore } from './users';

export interface SessionUser {
  email: string;
  name: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export function emailInDomain(email: string, domain: string): boolean {
  return email.toLowerCase().endsWith(`@${domain}`) && email.split('@').length === 2;
}

/** Reads the session cookie on every request and attaches the person and their current role. */
export function attachUser(sessions: Sessions, users: UserStore, config: Config) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const id = sessions.read(req.headers.cookie);
    // Re-check the domain every time: if the domain setting changes, old cookies stop working.
    if (id && emailInDomain(id.email, config.domain)) {
      req.user = { email: id.email, name: id.name, role: users.roleFor(id.email) };
    }
    next();
  };
}

export function requireRole(min: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Please sign in.' });
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
