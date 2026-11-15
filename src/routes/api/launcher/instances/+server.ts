import { json } from '@sveltejs/kit';
import { SESSION_EXPIRED, apiError, launcherUser } from '$lib/server/guards';
import { launcherInstances } from '$lib/server/instances/service';
import type { RequestHandler } from './$types';

/**
 * GET /api/launcher/instances (Bearer token)
 * -> 200 { instances: [{ id, name, description, minecraft, loader, loader_version, server, version, role }] }
 * `version` is the published version (0 = nothing published yet, cannot be played).
 */
export const GET: RequestHandler = async ({ request }) => {
  const user = await launcherUser(request);
  if (!user) return apiError(401, SESSION_EXPIRED);
  return json({ instances: await launcherInstances(user.id) }, { headers: { 'cache-control': 'no-store' } });
};
