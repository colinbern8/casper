import crypto from 'crypto';

const COOKIE = 'casper_session';
const TTL_MS = 8 * 60 * 60 * 1000;

export interface SessionIdentity {
  email: string;
  name: string;
}

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return undefined;
}

/**
 * Stateless signed session cookie holding only who the person is. Their role is
 * looked up on every request, so changing someone's role takes effect at once.
 */
export function createSessions(secret: string, secure: boolean) {
  const sign = (payload: string) => crypto.createHmac('sha256', secret).update(payload).digest('base64url');

  return {
    create(id: SessionIdentity, now = Date.now()): string {
      const payload = Buffer.from(JSON.stringify({ e: id.email, n: id.name.slice(0, 80), x: now + TTL_MS })).toString('base64url');
      return `${payload}.${sign(payload)}`;
    },

    read(cookieHeader: string | undefined, now = Date.now()): SessionIdentity | null {
      const raw = readCookie(cookieHeader, COOKIE);
      if (!raw) return null;
      const [payload, sig] = raw.split('.');
      if (!payload || !sig) return null;
      const expected = Buffer.from(sign(payload));
      const given = Buffer.from(sig);
      if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
      try {
        const obj = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (typeof obj.e !== 'string' || typeof obj.n !== 'string' || typeof obj.x !== 'number' || obj.x < now) return null;
        return { email: obj.e, name: obj.n };
      } catch {
        return null;
      }
    },

    setCookie(value: string): string {
      return `${COOKIE}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${TTL_MS / 1000}${secure ? '; Secure' : ''}`;
    },

    clearCookie(): string {
      return `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure ? '; Secure' : ''}`;
    },
  };
}

export type Sessions = ReturnType<typeof createSessions>;
