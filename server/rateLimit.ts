import { LIMITS } from './config';

interface Entry {
  windowMs: number;
  times: number[];
}

/**
 * In-memory sliding-window limiter. Fine for a single instance; use Redis if you scale out.
 * Memory stays bounded: expired keys are pruned every minute (each against its own window),
 * and past `maxKeys` the oldest key is dropped.
 */
export class SlidingWindowLimiter {
  private hits = new Map<string, Entry>();
  private lastPrune = 0;

  constructor(private now: () => number = Date.now, private maxKeys: number = LIMITS.limiterMaxKeys) {}

  get size(): number {
    return this.hits.size;
  }

  /** Records a hit if allowed. Returns retryAfterMs when blocked. */
  hit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs: number } {
    const t = this.now();
    this.prune(t, false);
    const existing = this.hits.get(key);
    const times = (existing?.times ?? []).filter(ts => t - ts < windowMs);
    if (times.length >= limit) {
      this.hits.set(key, { windowMs, times });
      return { allowed: false, retryAfterMs: windowMs - (t - times[0]) };
    }
    times.push(t);
    if (!existing && this.hits.size >= this.maxKeys) {
      this.prune(t, true);
      if (this.hits.size >= this.maxKeys) {
        const oldest = this.hits.keys().next().value;
        if (oldest !== undefined) this.hits.delete(oldest);
      }
    }
    this.hits.set(key, { windowMs, times });
    return { allowed: true, retryAfterMs: 0 };
  }

  private prune(t: number, force: boolean) {
    if (!force && t - this.lastPrune < 60_000) return;
    this.lastPrune = t;
    for (const [key, entry] of this.hits) {
      const fresh = entry.times.filter(ts => t - ts < entry.windowMs);
      if (fresh.length === 0) this.hits.delete(key);
      else entry.times = fresh;
    }
  }
}
