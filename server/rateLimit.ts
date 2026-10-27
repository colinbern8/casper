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
