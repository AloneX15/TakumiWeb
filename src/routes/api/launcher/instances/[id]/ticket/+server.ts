import { json } from '@sveltejs/kit';
import { SESSION_EXPIRED, apiError, launcherUser, readJson } from '$lib/server/guards';
import { MC_NAME, issueTicket, normalizeUuid } from '$lib/server/instances/gate';
import { isMember, latestRelease } from '$lib/server/instances/service';
import type { RequestHandler } from './$types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/launcher/instances/:id/ticket (Bearer token, members only)
 * Body { uuid, name, version }: the Minecraft account that will play and the manifest version just installed.
 * -> 200 { ticket, expires_at }. The launcher passes the ticket to the game (TAKUMI_GATE_TICKET) and the
 *    Takumi Gate server mod checks it on join.
 */
export const POST: RequestHandler = async ({ request, params }) => {
  const user = await launcherUser(request);
  if (!user) return apiError(401, SESSION_EXPIRED);
  if (!UUID.test(params.id) || !(await isMember(params.id, user.id))) {
    return apiError(404, 'Esta instancia no existe o ya no eres miembro.');
  }
  const body = await readJson(request);
  const uuid = normalizeUuid(body.uuid);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const version = Number(body.version);
  if (!uuid || !MC_NAME.test(name)) return apiError(400, 'Cuenta de Minecraft no válida.');
  const latest = await latestRelease(params.id);
  if (!Number.isInteger(version) || version < 1 || !latest || version > latest.version) {
    return apiError(400, 'Versión de la instancia no válida.');
  }
  const { ticket, expiresAt } = await issueTicket(params.id, user.id, { uuid, name, version });
  return json({ ticket, expires_at: expiresAt.toISOString() }, { headers: { 'cache-control': 'no-store' } });
};
