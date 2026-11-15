import { describe, expect, it } from 'vitest';
import { RateLimiter, takeLoginAttempt } from './rate-limit';

describe('RateLimiter', () => {
  it('allows max attempts per key and window', () => {
    const limiter = new RateLimiter(3, 60_000);
    expect([1, 2, 3, 4].map(() => limiter.take('a'))).toEqual([true, true, true, false]);
    expect(limiter.take('b')).toBe(true);
  });
});

describe('takeLoginAttempt', () => {
  it('limits one account even when the address changes on every attempt', () => {
    const results = Array.from({ length: 60 }, (_, i) => takeLoginAttempt(`10.0.${i >> 8}.${i & 255}`, 'Victim'));
    expect(results.filter(Boolean)).toHaveLength(50);
  });

  it('limits one address trying many accounts', () => {
    const results = Array.from({ length: 70 }, (_, i) => takeLoginAttempt('203.0.113.7', `user${i}`));
    expect(results.filter(Boolean)).toHaveLength(60);
  });

  it('treats the login case-insensitively', () => {
    const results = Array.from({ length: 12 }, (_, i) => takeLoginAttempt('198.51.100.1', i % 2 ? 'Alice' : 'alice'));
    expect(results.filter(Boolean)).toHaveLength(10);
  });
});
