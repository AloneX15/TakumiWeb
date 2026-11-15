import { SESSION_EXPIRED, apiError, launcherUser } from '$lib/server/guards';
import { hashesOf, isMember, latestRelease } from '$lib/server/instances/service';
import { openRead } from '$lib/server/instances/storage';
import type { RequestHandler } from './$types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;

/**
 * GET /api/launcher/instances/:id/files/:sha256 (Bearer token, members only)
 * Streams one file of the latest published version. Files of the draft or of other instances are refused,
 * so membership of one instance never gives access to another's files. The launcher checks the SHA-256.
 */
export const GET: RequestHandler = async ({ request, params }) => {
  const user = await launcherUser(request);
  if (!user) return apiError(401, SESSION_EXPIRED);
  if (!UUID.test(params.id) || !SHA256.test(params.sha256) || !(await isMember(params.id, user.id))) {
    return apiError(404, 'Archivo no encontrado.');
  }
  const release = await latestRelease(params.id);
  if (!release || !hashesOf(release).has(params.sha256)) return apiError(404, 'Archivo no encontrado.');
  const body = await openRead(params.sha256);
  if (!body) return apiError(410, 'El archivo ya no está en el servidor. Avisa al organizador.');
  return new Response(body, {
    headers: {
      'content-type': 'application/octet-stream',
      'cache-control': 'private, no-store',
      'x-content-sha256': params.sha256,
    },
  });
};
