import { describe, expect, it, vi } from 'vitest';
import { cached, invalidateContent, memoize } from './cache';

describe('cache', () => {
  it('shares one load between concurrent and repeated calls until invalidated', async () => {
    const load = vi.fn(async () => ({ n: load.mock.calls.length }));
    const [a, b] = await Promise.all([cached('k', 1000, load), cached('k', 1000, load)]);
    expect(a).toBe(b);
    expect(load).toHaveBeenCalledTimes(1);

    invalidateContent();
    await cached('k', 1000, load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('expires entries and does not keep failures', async () => {
    vi.useFakeTimers();
    const load = vi.fn(async () => 1);
    await cached('ttl', 1000, load);
    vi.advanceTimersByTime(1001);
    await cached('ttl', 1000, load);
    expect(load).toHaveBeenCalledTimes(2);
    vi.useRealTimers();

    const failing = vi.fn(async () => {
      throw new Error('db down');
    });
    await expect(cached('bad', 1000, failing)).rejects.toThrow();
    await expect(cached('bad', 1000, failing)).rejects.toThrow();
    expect(failing).toHaveBeenCalledTimes(2);
  });

  it('memoize is bounded', () => {
    const fn = vi.fn((s: string) => s.toUpperCase());
    const m = memoize(fn, 2);
    expect(m('a')).toBe('A');
    m('a');
    expect(fn).toHaveBeenCalledTimes(1);
    m('b');
    m('c'); // evicts 'a'
    m('a');
    expect(fn).toHaveBeenCalledTimes(4);
  });
});
