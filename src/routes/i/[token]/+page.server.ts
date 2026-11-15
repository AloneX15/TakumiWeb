import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/guards';
import { acceptInvite, findInvite, inviteProblem, isMember } from '$lib/server/instances/service';
import type { Actions, PageServerLoad } from './$types';

/** /i/:token — invitation link. Signed-out visitors go to the login page and come back here. */
export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const found = await findInvite(event.params.token);
  if (!found) error(404, 'Esta invitación no existe.');
  const { invite, instance, owner } = found;
  const member = await isMember(instance.id, user.id);
  return {
    instance: {
      id: instance.id,
      name: instance.name,
      description: instance.description,
      minecraftVersion: instance.minecraftVersion,
      loader: instance.loader,
      owner,
    },
    role: invite.role,
    member,
    problem: member ? null : inviteProblem(invite),
  };
};

export const actions: Actions = {
  default: async (event) => {
    const user = requireUser(event);
    const result = await acceptInvite(event.params.token, user);
    if (!result.ok) return fail(400, { error: result.error });
    redirect(303, `/instancias/${result.instanceId}`);
  },
};
