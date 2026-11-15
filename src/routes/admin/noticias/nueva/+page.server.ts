import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/guards';
import { readPostForm, savePost } from '$lib/server/posts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
  requireUser(event, 'editor');
};

export const actions: Actions = {
  save: async (event) => {
    const user = requireUser(event, 'editor');
    const values = readPostForm(await event.request.formData());
    const result = await savePost(values, user.id);
    if (!result.ok) return fail(400, { values, error: result.error });
    redirect(303, `/admin/noticias/${result.id}?guardada=1`);
  },
};
