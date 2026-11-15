import { fail, redirect } from '@sveltejs/kit';
import { atLeast, requireInstance } from '$lib/server/instances/access';
import { listReleases, pendingChanges, publish, recentAudit, removeMember } from '$lib/server/instances/service';
import { SigningKeyMissing } from '$lib/server/instances/signing';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const { instance, role } = await requireInstance(event, 'member');
  const manage = atLeast(role, 'manager');
  const [releases, pending, log] = await Promise.all([
    listReleases(instance.id),
    manage ? pendingChanges(instance) : null,
    manage ? recentAudit(instance.id) : [],
  ]);
  return { releases, pending, log, published: event.url.searchParams.get('publicada') };
};

export const actions: Actions = {
  publish: async (event) => {
    const { instance, user } = await requireInstance(event, 'manager');
    const form = await event.request.formData();
    let result;
    try {
      result = await publish(instance.id, user.id, {
        graceMinutes: Number(form.get('graceMinutes') ?? 5),
        notes: String(form.get('notes') ?? ''),
        forceRestart: form.get('forceRestart') === 'on',
      });
    } catch (err) {
      if (err instanceof SigningKeyMissing) return fail(500, { action: 'publish', error: err.message });
      throw err;
    }
    if (!result.ok) return fail(400, { action: 'publish', error: result.error });
    redirect(303, `/instancias/${instance.id}?publicada=${result.version}`);
  },

  leave: async (event) => {
    const { instance, user, memberRole } = await requireInstance(event, 'member');
    if (!memberRole) return fail(400, { action: 'leave', error: 'No eres miembro de esta instancia.' });
    const result = await removeMember(instance.id, { id: user.id, role: memberRole }, user.id);
    if (!result.ok) return fail(400, { action: 'leave', error: result.error });
    redirect(303, '/instancias');
  },
};
