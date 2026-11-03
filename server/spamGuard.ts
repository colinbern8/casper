import crypto from 'crypto';
import { LIMITS } from './config';

/**
 * Student spam guard. Counts "bad messages" (strikes) per student: a message the abuse or off-topic
 * screen blocks, the same message sent again, or messages sent too fast. At `warnAt` strikes the
 * student is warned; at `signOutAt` they are signed out and locked out for `lockoutMs`.
 *
 * Everything is kept in memory (a restart clears it) and no message text is stored: only a hash of
 * the student's last message, to spot a repeat. The clock is injected so tests can move time.
 */

export type StrikeReason = 'blocked' | 'repeated' | 'too_fast';

export interface StrikeResult {
  strikes: number;
  /** `warn` from warnAt up to signOutAt - 1; `sign_out` at signOutAt, which also starts the lockout. */
  action: 'none' | 'warn' | 'sign_out';
  /** Strikes left before sign-out. */
  remaining: number;
}

type SpamLimits = { [K in keyof typeof LIMITS.spam]: number };

const hash = (text: string) => crypto.createHash('sha256').update(text.toLowerCase().replace(/\s+/g, ' ').trim()).digest('base64url');

export class SpamGuard {
  private strikes = new Map<string, number[]>();
  private lockouts = new Map<string, number>();
  private last = new Map<string, { hash: string; at: number }>();
  private lastPrune = 0;

  constructor(private now: () => number = Date.now, readonly limits: SpamLimits = LIMITS.spam) {}

  /** When the student's lockout ends (ms since epoch), or null if they are not locked out. */
  lockedUntil(email: string): number | null {
    const key = email.toLowerCase();
    const until = this.lockouts.get(key);
    if (until === undefined) return null;
    if (until <= this.now()) {
      this.lockouts.delete(key);
      return null;
    }
    return until;
  }

  /** Seconds left on the lockout, rounded up; 0 when not locked out. */
  retryAfterSeconds(email: string): number {
    const until = this.lockedUntil(email);
    return until === null ? 0 : Math.ceil((until - this.now()) / 1000);
  }

  /** Records `text` as the student's latest message and says whether it repeats the one before. */
  isRepeat(email: string, text: string): boolean {
    const key = email.toLowerCase();
    const t = this.now();
    this.prune(t);
    const h = hash(text);
    const prev = this.last.get(key);
    this.last.set(key, { hash: h, at: t });
    return !!prev && prev.hash === h && t - prev.at < this.limits.repeatWindowMs;
  }

  /** Counts one bad message. Strikes older than the strike window are forgotten. */
  strike(email: string): StrikeResult {
    const key = email.toLowerCase();
    const t = this.now();
    this.prune(t);
    const recent = (this.strikes.get(key) ?? []).filter(at => t - at < this.limits.strikeWindowMs);
    recent.push(t);
    const { warnAt, signOutAt, lockoutMs } = this.limits;
    if (recent.length >= signOutAt) {
      this.strikes.delete(key);
      this.last.delete(key);
      this.lockouts.set(key, t + lockoutMs);
      return { strikes: recent.length, action: 'sign_out', remaining: 0 };
    }
    this.strikes.set(key, recent);
    return { strikes: recent.length, action: recent.length >= warnAt ? 'warn' : 'none', remaining: signOutAt - recent.length };
  }

  /** Drops expired entries once a minute so memory stays small. */
  private prune(t: number) {
    if (t - this.lastPrune < 60_000) return;
    this.lastPrune = t;
    for (const [k, list] of this.strikes) if (list.every(at => t - at >= this.limits.strikeWindowMs)) this.strikes.delete(k);
    for (const [k, v] of this.last) if (t - v.at >= this.limits.repeatWindowMs) this.last.delete(k);
    for (const [k, until] of this.lockouts) if (until <= t) this.lockouts.delete(k);
  }
}

/** Shown on the signed-out page and in API errors. Both languages, because the language is not known there. */
export function lockoutMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return (
    `You were signed out because of too many messages that were not about a technology problem. You can sign in again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.` +
    ` · Se cerró tu sesión por enviar demasiados mensajes que no eran sobre un problema de tecnología. Puedes volver a iniciar sesión en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`
  );
}
