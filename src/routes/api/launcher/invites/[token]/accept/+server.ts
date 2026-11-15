import { json } from '@sveltejs/kit';
import { SESSION_EXPIRED, apiError, launcherUser } from '$lib/server/guards';
import { acceptInvite } from '$lib/server/instances/service';
import type { RequestHandler } from './$types';

/**
 * POST /api/launcher/invites/:token/accept (Bearer token)
 * The launcher's "Unirse con un enlace": the user pastes an invite link and joins without the browser.
 * -> 200 { instance_id, already_member } | 400 { error }
 */
export const POST: RequestHandler = async ({ request, params }) => {
  const user = await launcherUser(request);
  if (!user) return apiError(401, SESSION_EXPIRED);
  const result = await acceptInvite(params.token, user);
  if (!result.ok) return apiError(400, result.error);
  return json({ instance_id: result.instanceId, already_member: result.already });
};
