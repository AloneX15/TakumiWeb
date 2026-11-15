import { fail, redirect } from '@sveltejs/kit';
import { SESSION_COOKIE, cookieOptions, createSession } from '$lib/server/auth';
import { clientKey, safeNext } from '$lib/server/guards';
import { RATE_LIMIT_MESSAGE, registerLimiter } from '$lib/server/rate-limit';
import { createUser } from '$lib/server/users';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
  if (locals.user) redirect(303, safeNext(url.searchParams.get('next')));
};

export const actions: Actions = {
  default: async (event) => {
    const form = await event.request.formData();
    const username = String(form.get('username') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');
    const values = { username, email };

    if (form.get('terms') !== 'on') return fail(400, { ...values, error: 'Debes aceptar las condiciones de uso.' });
    if (password !== confirm) return fail(400, { ...values, error: 'Las contraseñas no coinciden.' });
    if (!registerLimiter.take(clientKey(event))) return fail(429, { ...values, error: RATE_LIMIT_MESSAGE });

    const result = await createUser({ username, email, password, selfService: true });
    if (!result.ok) return fail(400, { ...values, error: result.error });

    const { token, expiresAt } = await createSession(result.id, 'web', event.request.headers.get('user-agent'));
    event.cookies.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
    redirect(303, `/cuenta?bienvenida=1`);
  },
};
