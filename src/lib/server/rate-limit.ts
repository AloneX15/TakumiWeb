/**
 * Fixed-window in-memory rate limiter. Per process: when running several
 * instances behind a load balancer, put a shared limiter (e.g. at the proxy) in front.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Returns false when the key has used up its attempts in the current window. */
  take(key: string): boolean {
    const now = Date.now();
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (this.hits.size > 10_000) this.sweep(now);
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    entry.count++;
    return entry.count <= this.max;
  }

  private sweep(now: number) {
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key);
  }
}

export const RATE_LIMIT_MESSAGE = 'Demasiados intentos. Espera unos minutos y vuelve a probar.';

export const loginLimiter = new RateLimiter(10, 10 * 60 * 1000);
export const registerLimiter = new RateLimiter(5, 60 * 60 * 1000);
