import { fail, redirect } from '@sveltejs/kit';
import { requireInstance } from '$lib/server/instances/access';
import { createGateKey, revokeGateKey } from '$lib/server/instances/gate';
import { audit, deleteInstance, settingsFromForm, updateInstance } from '$lib/server/instances/service';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const { instance } = await requireInstance(event, 'manager');
  return { gate: { configured: !!instance.gateKeyHash, hint: instance.gateKeyHint }, apiOrigin: event.url.origin };
};

export const actions: Actions = {
  save: async (event) => {
    const { instance, user } = await requireInstance(event, 'manager');
    const input = settingsFromForm(await event.request.formData());
    const result = await updateInstance(instance, user.id, input);
    if (!result.ok) return fail(400, { action: 'save', error: result.error });
    return { action: 'save', success: 'Ajustes guardados. Se aplican a los jugadores al publicar.' };
  },

  gateKey: async (event) => {
    const { instance, user } = await requireInstance(event, 'manager');
    const key = await createGateKey(instance.id, user.id);
    return { action: 'gate', gateKey: key };
  },

  gateRevoke: async (event) => {
    const { instance, user } = await requireInstance(event, 'manager');
    await revokeGateKey(instance.id, user.id);
    return { action: 'gate', success: 'Clave revocada. El servidor dejará de aceptar jugadores hasta que pongas una nueva.' };
  },

  delete: async (event) => {
    const { instance, user } = await requireInstance(event, 'owner');
    const confirm = String((await event.request.formData()).get('confirm') ?? '').trim();
    if (confirm !== instance.name) {
      return fail(400, { action: 'delete', error: 'Escribe el nombre exacto de la instancia para confirmar.' });
    }
    await audit(instance.id, user.id, 'delete', instance.name);
    await deleteInstance(instance.id);
    redirect(303, '/instancias');
  },
};
