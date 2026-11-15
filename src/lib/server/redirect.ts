const BASE = 'http://local.invalid';

/**
 * Only same-site paths, to avoid open redirects.
 *
 * The value is checked as the browser will resolve it, not as a raw prefix: browsers drop tabs and
 * newlines and treat `\` like `/`, so `/\t/evil.example` would otherwise become `//evil.example`.
 */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || /[\x00-\x20\x7f\\]/.test(value)) return '/';
  try {
    const url = new URL(value, BASE);
    // Dot segments are resolved here, so `/..//evil.example` comes back as the path `//evil.example`,
    // which a browser would read as another host again.
    if (url.origin !== BASE || url.pathname.startsWith('//')) return '/';
    return url.pathname + url.search + url.hash;
  } catch {
    return '/';
  }
}
