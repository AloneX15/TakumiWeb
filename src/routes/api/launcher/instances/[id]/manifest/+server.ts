import { json } from '@sveltejs/kit';
import { SESSION_EXPIRED, apiError, launcherUser } from '$lib/server/guards';
import { isMember, latestRelease } from '$lib/server/instances/service';
import type { RequestHandler } from './$types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND = 'Esta instancia no existe o ya no eres miembro.';

/**
 * GET /api/launcher/instances/:id/manifest (Bearer token, members only)
 * -> 200 { version, manifest, signature }
 *    `manifest` is the JSON text exactly as signed; `signature` is base64 Ed25519 over its UTF-8 bytes.
 *    The launcher verifies the signature before parsing it.
 * -> 404 when the instance does not exist, the user is not a member, or nothing is published yet.
 */
export const GET: RequestHandler = async ({ request, params }) => {
  const user = await launcherUser(request);
  if (!user) return apiError(401, SESSION_EXPIRED);
  if (!UUID.test(params.id) || !(await isMember(params.id, user.id))) return apiError(404, NOT_FOUND);
  const release = await latestRelease(params.id);
  if (!release) return apiError(404, 'Esta instancia aún no tiene ninguna versión publicada.');
  return json(
    { version: release.version, manifest: release.manifest, signature: release.signature },
    { headers: { 'cache-control': 'no-store' } },
  );
};
