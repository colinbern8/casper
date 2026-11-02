import express from 'express';
import type { Config } from './config';
import { emailInDomain, requireRole } from './auth';
import type { UserStore } from './users';

export interface AdminDeps {
  config: Config;
  users: UserStore;
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

/** Who has which role. Admins only. */
export function createAdminRouter({ config, users }: AdminDeps) {
  const router = express.Router();
  const adminOnly = requireRole('admin');

  router.get('/users', adminOnly, (_req, res) => {
    res.json(users.list());
  });

  router.put('/users/:email', adminOnly, (req, res) => {
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

  router.delete('/users/:email', adminOnly, (req, res) => {
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
  router.post('/users/import', adminOnly, (req, res) => {
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

  return router;
}
