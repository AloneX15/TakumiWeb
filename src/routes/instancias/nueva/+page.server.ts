import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { requireUser } from '$lib/server/guards';
import { canCreateInstances } from '$lib/server/instances/access';
import { createInstance, settingsFromForm } from '$lib/server/instances/service';
import type { Actions, PageServerLoad } from './$types';

function creator(event: Pick<RequestEvent, 'locals' | 'url'>) {
  const user = requireUser(event);
  if (!canCreateInstances(user)) error(403, 'Tu cuenta no puede crear instancias privadas. Pídeselo a un administrador.');
  return user;
}

export const load: PageServerLoad = async (event) => {
  creator(event);
};

export const actions: Actions = {
  default: async (event) => {
    const user = creator(event);
    const input = settingsFromForm(await event.request.formData());
    const result = await createInstance(user.id, input);
    if (!result.ok) return fail(400, { error: result.error, values: input });
    redirect(303, `/instancias/${result.id}/archivos`);
  },
};
