import { fail } from '@sveltejs/kit';
import type { FilePolicy } from '$lib/server/db/schema';
import { requireInstance } from '$lib/server/instances/access';
import { deletePath, listFiles, movePath, setPolicy } from '$lib/server/instances/service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const { instance } = await requireInstance(event, 'manager');
  const files = await listFiles(instance.id);
  return {
    files: files.map((f) => ({ path: f.path, size: f.size, policy: f.policy, updatedAt: f.updatedAt })),
    used: files.reduce((sum, f) => sum + f.size, 0),
  };
};

const text = (form: FormData, key: string) => String(form.get(key) ?? '');

export const actions: Actions = {
  delete: async (event) => {
    const { instance, user } = await requireInstance(event, 'manager');
    const result = await deletePath(instance.id, user.id, text(await event.request.formData(), 'path'));
    if (!result.ok) return fail(400, { error: result.error });
    return { success: result.count > 1 ? `${result.count} archivos borrados.` : 'Archivo borrado.' };
  },

  move: async (event) => {
    const { instance, user } = await requireInstance(event, 'manager');
    const form = await event.request.formData();
    const result = await movePath(instance.id, user.id, text(form, 'from'), text(form, 'to'));
    if (!result.ok) return fail(400, { error: result.error });
    return { success: 'Movido.' };
  },

  policy: async (event) => {
    const { instance, user } = await requireInstance(event, 'manager');
    const form = await event.request.formData();
    const result = await setPolicy(instance.id, user.id, text(form, 'path'), text(form, 'policy') as FilePolicy);
    if (!result.ok) return fail(400, { error: result.error });
    return { success: 'Política cambiada.' };
  },
};
