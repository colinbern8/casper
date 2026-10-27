/** In-memory sliding-window limiter. Fine for a single instance; use Redis if you scale out. */
export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();
  private lastPrune = 0;

  constructor(private now: () => number = Date.now) {}

  /** Records a hit if allowed. Returns retryAfterMs when blocked. */
  hit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs: number } {
    const t = this.now();
    this.prune(t, windowMs);
    const recent = (this.hits.get(key) || []).filter(ts => t - ts < windowMs);
    if (recent.length >= limit) {
      this.hits.set(key, recent);
      return { allowed: false, retryAfterMs: windowMs - (t - recent[0]) };
    }
    recent.push(t);
    this.hits.set(key, recent);
    return { allowed: true, retryAfterMs: 0 };
  }

  /** Counts without recording (used to check before doing work). */
  count(key: string, windowMs: number): number {
    const t = this.now();
    return (this.hits.get(key) || []).filter(ts => t - ts < windowMs).length;
  }

  private prune(t: number, windowMs: number) {
    if (t - this.lastPrune < 60_000) return;
    this.lastPrune = t;
    for (const [key, list] of this.hits) {
      const fresh = list.filter(ts => t - ts < Math.max(windowMs, 15 * 60_000));
      if (fresh.length === 0) this.hits.delete(key);
      else this.hits.set(key, fresh);
    }
  }
}

/** Blocks an IP for a while after repeated failed technician logins. */
export class LoginThrottle {
  private fails = new Map<string, { count: number; first: number; blockedUntil: number }>();

  constructor(private now: () => number = Date.now, private maxFails = 5, private windowMs = 10 * 60_000) {}

  blockedFor(key: string): number {
    const e = this.fails.get(key);
    const t = this.now();
    return e && e.blockedUntil > t ? e.blockedUntil - t : 0;
  }

  fail(key: string) {
    const t = this.now();
    let e = this.fails.get(key);
    if (!e || t - e.first > this.windowMs) e = { count: 0, first: t, blockedUntil: 0 };
    e.count += 1;
    if (e.count >= this.maxFails) e.blockedUntil = t + this.windowMs;
    this.fails.set(key, e);
  }

  success(key: string) {
    this.fails.delete(key);
  }
}
