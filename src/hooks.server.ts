import type { Handle, ServerInit } from '@sveltejs/kit';
import { SESSION_COOKIE, cookieOptions, publicUser, validateSession } from '$lib/server/auth';
import { bootstrap } from '$lib/server/bootstrap';

export const init: ServerInit = async () => {
  await bootstrap();
};

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get(SESSION_COOKIE);
  event.locals.user = null;
  event.locals.sessionId = null;

  if (token) {
    const result = await validateSession(token, 'web');
    if (result) {
      event.locals.user = publicUser(result.user);
      event.locals.sessionId = result.session.id;
      // Keep the cookie in step with a renewed session.
      event.cookies.set(SESSION_COOKIE, token, cookieOptions(result.session.expiresAt));
    } else {
      event.cookies.delete(SESSION_COOKIE, { path: '/' });
    }
  }

  const response = await resolve(event);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  return response;
};
