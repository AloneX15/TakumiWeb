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

const MINUTE = 60 * 1000;

/** Attempts on one account from one address. */
export const loginLimiter = new RateLimiter(10, 10 * MINUTE);
/** Attempts on one account from any address (stops guessing spread over many addresses). */
export const loginAccountLimiter = new RateLimiter(50, 60 * MINUTE);
/** Attempts from one address on any account (stops password spraying). */
export const loginAddressLimiter = new RateLimiter(60, 10 * MINUTE);
export const registerLimiter = new RateLimiter(5, 60 * MINUTE);

/** Counts one sign-in attempt against every login limit; false when any of them is used up. */
export function takeLoginAttempt(address: string, login: string): boolean {
  const account = login.trim().toLowerCase();
  const results = [
    loginLimiter.take(`${address}:${account}`),
    loginAccountLimiter.take(account),
    loginAddressLimiter.take(address),
  ];
  return results.every(Boolean);
}
