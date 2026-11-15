import { requireUser } from '$lib/server/guards';
import { canCreateInstances } from '$lib/server/instances/access';
import { instancesForUser } from '$lib/server/instances/service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const user = requireUser(event);
  const { own, others } = await instancesForUser(user);
  return { own, others, canCreate: canCreateInstances(user) };
};
