/**
 * Small in-memory cache for public content (news, releases). Per process:
 * other instances pick up a change when their entry expires, so keep TTLs short.
 * Cached values are shared between requests and must not be mutated.
 */
const MAX_ENTRIES = 500;
const store = new Map<string, { expires: number; value: Promise<unknown> }>();

/** Public content may be this stale on instances that did not handle the edit. */
export const CONTENT_TTL = 15_000;

export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as Promise<T>;

  // The promise itself is stored, so concurrent requests share one query.
  const value = load();
  if (store.size >= MAX_ENTRIES) store.clear();
  store.set(key, { expires: now + ttlMs, value });
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key);
  });
  return value;
}

/** Call after any change to posts or releases so this instance shows it at once. */
export function invalidateContent() {
  store.clear();
}

/** Memoize a pure string -> string function (bounded, oldest entries dropped first). */
export function memoize(fn: (input: string) => string, maxEntries = 300) {
  const results = new Map<string, string>();
  return (input: string) => {
    let output = results.get(input);
    if (output === undefined) {
      output = fn(input);
      if (results.size >= maxEntries) results.delete(results.keys().next().value!);
      results.set(input, output);
    }
    return output;
  };
}
