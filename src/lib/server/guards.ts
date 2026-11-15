import { error, json, redirect, type RequestEvent } from '@sveltejs/kit';
import type { Role } from './db/schema';
import { hasRole, publicUser, validateSession } from './auth';

/** Page/action guard: redirects to login when signed out, 403 when the role is too low. */
export function requireUser(event: Pick<RequestEvent, 'locals' | 'url'>, role: Role = 'user') {
  const user = event.locals.user;
  if (!user) redirect(303, `/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
  if (!hasRole(user, role)) error(403, 'No tienes permiso para ver esta página.');
  return user;
}

export function bearerToken(request: Request) {
  const header = request.headers.get('authorization') ?? '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;
}

export const SESSION_EXPIRED = 'La sesión ha caducado. Vuelve a iniciar sesión.';

/** Resolve the launcher's Bearer token; null when missing, expired, revoked or the user is banned. */
export async function launcherUser(request: Request) {
  const token = bearerToken(request);
  const result = token ? await validateSession(token, 'launcher') : null;
  return result && publicUser(result.user);
}

/** JSON error body used by every API endpoint: `{ "error": "…" }`. */
export function apiError(status: number, message: string) {
  return json({ error: message }, { status });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  } catch {
    return {};
  }
}

export const str = (value: unknown) => (typeof value === 'string' ? value : '');

export function clientKey(event: Pick<RequestEvent, 'getClientAddress'>) {
  try {
    return event.getClientAddress();
  } catch {
    return 'unknown';
  }
}

/** Only same-site paths, to avoid open redirects. */
export function safeNext(value: string | null) {
  return value && /^\/(?![/\\])/.test(value) ? value : '/';
}
