import { after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { loadConfig } from '../server/config';
import { createApp } from '../server/app';
import { TicketStore } from '../server/store';
import { CaseStore } from '../server/cases';
import { UserStore } from '../server/users';
import { SlidingWindowLimiter } from '../server/rateLimit';
import { SpamGuard } from '../server/spamGuard';
import { PresenceStore } from '../server/presence';
import type { GoogleVerifier } from '../server/google';

const servers: Server[] = [];
after(() => servers.forEach(s => s.close()));

export interface StartOptions {
  env?: Record<string, string>;
  verifyGoogle?: GoogleVerifier;
  /** A fake clock for rate limits and the spam guard. */
  now?: () => number;
}

/** Starts the real app on a random port with in-memory stores, dev sign-in on and domain d.test. */
export async function startServer({ env = {}, verifyGoogle, now = Date.now }: StartOptions = {}) {
  const config = loadConfig({ DEV_LOGIN: 'true', SESSION_SECRET: 'test-secret', DISTRICT_DOMAIN: 'd.test', ADMIN_EMAILS: 'boss@d.test', ...env } as NodeJS.ProcessEnv);
  const users = new UserStore(null, config.adminEmails);
  const store = new TicketStore(null);
  const cases = new CaseStore(null);
  const presence = new PresenceStore(null);
  const app = createApp({ config, store, users, cases, presence, verifyGoogle, limiter: new SlidingWindowLimiter(now), spamGuard: new SpamGuard(now) });
  const server: Server = await new Promise(resolve => {
    const s = app.listen(0, () => resolve(s));
  });
  servers.push(server);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  /** Response bodies are loose in tests on purpose: each test asserts the fields it cares about. */
  type Body = any; // test-only
  const raw = async (method: string, path: string, body?: unknown, cookie?: string, extra: Record<string, string> = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extra },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json().catch(() => null)) as Body, setCookie: res.headers.get('set-cookie') };
  };
  const call = (method: string, path: string, body?: unknown, cookie?: string) => raw(method, path, body, cookie);
  const login = async (email: string, name?: string) => {
    const r = await raw('POST', '/api/auth/dev', { email, name });
    assert.equal(r.status, 200, `dev login failed for ${email}`);
    return r.setCookie!.split(';')[0];
  };
  return { call, raw, login, users, store, cases, presence, base, config };
}
