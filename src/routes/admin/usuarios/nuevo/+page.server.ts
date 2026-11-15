import { fail, redirect } from '@sveltejs/kit';
import type { Role } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/guards';
import { createUser } from '$lib/server/users';
import type { Actions, PageServerLoad } from './$types';

const ROLES: Role[] = ['user', 'editor', 'admin'];

export const load: PageServerLoad = (event) => {
  requireUser(event, 'admin');
};

export const actions: Actions = {
  default: async (event) => {
    requireUser(event, 'admin');
    const form = await event.request.formData();
    const username = String(form.get('username') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const rawRole = String(form.get('role') ?? 'user') as Role;
    const role = ROLES.includes(rawRole) ? rawRole : 'user';
    const values = { username, email, role };

    const result = await createUser({ username, email, password: String(form.get('password') ?? ''), role });
    if (!result.ok) return fail(400, { values, error: result.error });
    redirect(303, `/admin/usuarios/${result.id}?creado=1`);
  },
};
