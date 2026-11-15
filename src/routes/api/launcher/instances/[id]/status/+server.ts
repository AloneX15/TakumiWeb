import { json } from '@sveltejs/kit';
import { SESSION_EXPIRED, apiError, launcherUser } from '$lib/server/guards';
import { releaseStatus } from '$lib/server/instances/gate';
import { isMember } from '$lib/server/instances/service';
import type { RequestHandler } from './$types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/launcher/instances/:id/status?since=<installed version> (Bearer token, members only)
 * -> 200 { version, restart_required, grace_minutes, notes, published_at }
 *    Cheap check the launcher polls while the game runs. `restart_required` is true when any release after
 *    `since` changed something other than resource packs.
 */
export const GET: RequestHandler = async ({ request, params, url }) => {
  const user = await launcherUser(request);
  if (!user) return apiError(401, SESSION_EXPIRED);
  if (!UUID.test(params.id) || !(await isMember(params.id, user.id))) {
    return apiError(404, 'Esta instancia no existe o ya no eres miembro.');
  }
  const since = Math.max(0, Math.floor(Number(url.searchParams.get('since') ?? 0)) || 0);
  const status = await releaseStatus(params.id, since);
  return json(
    {
      version: status.version,
      restart_required: status.restartRequired,
      grace_minutes: status.graceMinutes,
      notes: status.notes,
      published_at: status.publishedAt,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
};
