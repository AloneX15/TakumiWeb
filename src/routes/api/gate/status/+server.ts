import { json } from '@sveltejs/kit';
import { apiError, bearerToken } from '$lib/server/guards';
import { instanceByGateKey, recentReleases } from '$lib/server/instances/gate';
import type { RequestHandler } from './$types';

/**
 * GET /api/gate/status (Bearer <Takumi Gate server key>)
 * -> 200 { instance, name, version, releases: [{ version, restart_required, grace_minutes, notes, published_at }] }
 *    The Gate server polls this to warn players running an old version and kick them after the grace period.
 */
export const GET: RequestHandler = async ({ request }) => {
  const instance = await instanceByGateKey(bearerToken(request));
  if (!instance) return apiError(401, 'Clave de servidor de Takumi Gate no válida.');
  return json(
    {
      instance: instance.id,
      name: instance.name,
      version: instance.currentVersion,
      releases: await recentReleases(instance.id),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
};
