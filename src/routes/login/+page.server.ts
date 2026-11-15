import { fail, redirect } from '@sveltejs/kit';
import { SESSION_COOKIE, checkCredentials, cookieOptions, createSession } from '$lib/server/auth';
import { clientKey, safeNext } from '$lib/server/guards';
import { RATE_LIMIT_MESSAGE, loginLimiter } from '$lib/server/rate-limit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
  if (locals.user) redirect(303, safeNext(url.searchParams.get('next')));
};

export const actions: Actions = {
  default: async (event) => {
    const form = await event.request.formData();
    const login = String(form.get('login') ?? '').trim();
    const password = String(form.get('password') ?? '');

    if (!login || !password) return fail(400, { login, error: 'Escribe tu usuario o correo y tu contraseña.' });
    if (!loginLimiter.take(`${clientKey(event)}:${login.toLowerCase()}`)) {
      return fail(429, { login, error: RATE_LIMIT_MESSAGE });
    }

    const result = await checkCredentials(login, password);
    if (!result.ok) return fail(result.status, { login, error: result.message });

    const { token, expiresAt } = await createSession(
      result.user.id,
      'web',
      event.request.headers.get('user-agent'),
    );
    event.cookies.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
    redirect(303, safeNext(event.url.searchParams.get('next')));
  },
};
