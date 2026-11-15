import { json } from '@sveltejs/kit';
import { SESSION_EXPIRED, apiError, launcherUser } from '$lib/server/guards';
import { activeMember, vaultKey } from '$lib/server/instances/gate';
import { SigningKeyMissing } from '$lib/server/instances/signing';
import type { RequestHandler } from './$types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/launcher/instances/:id/vault-key (Bearer token, members only)
 * -> 200 { id, key }: base64 AES-256 key for this member's encrypted copy of the event files. The launcher
 *    keeps it in memory only. `id` changes when the server rotates its secret.
 */
export const GET: RequestHandler = async ({ request, params }) => {
  const user = await launcherUser(request);
  if (!user) return apiError(401, SESSION_EXPIRED);
  if (!UUID.test(params.id) || !(await activeMember(params.id, user.id))) {
    return apiError(404, 'Esta instancia no existe o ya no eres miembro.');
  }
  try {
    return json(vaultKey(params.id, user.id), { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    if (error instanceof SigningKeyMissing) return apiError(503, error.message);
    throw error;
  }
};
