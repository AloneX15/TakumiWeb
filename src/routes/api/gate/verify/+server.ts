import { json } from '@sveltejs/kit';
import { apiError, bearerToken, readJson, str } from '$lib/server/guards';
import { MC_NAME, instanceByGateKey, normalizeUuid, verifyTicket, type Joiner } from '$lib/server/instances/gate';
import type { RequestHandler } from './$types';

/**
 * POST /api/gate/verify (Bearer <Takumi Gate server key>)
 * Body { ticket, uuid } (online-mode server: the profile id Minecraft authenticated) or { ticket, name }
 * (offline-mode server: only the name means anything there).
 * -> 200 { ok: true, username, version, current_version, restart_required }
 * -> 403 { ok: false, error } the server must refuse the player with `error`
 * -> 401 unknown server key
 */
export const POST: RequestHandler = async ({ request }) => {
  const instance = await instanceByGateKey(bearerToken(request));
  if (!instance) return apiError(401, 'Clave de servidor de Takumi Gate no válida.');
  const body = await readJson(request);
  const uuid = normalizeUuid(body.uuid);
  const name = str(body.name).trim();
  const ticket = str(body.ticket).trim();
  let joiner: Joiner;
  if (uuid) joiner = { uuid };
  else if (MC_NAME.test(name)) joiner = { name };
  else return apiError(400, 'Falta uuid o name.');
  if (!ticket) {
    return json({ ok: false, error: 'Entra desde Takumi Launcher para jugar en este servidor.' }, { status: 403 });
  }
  const result = await verifyTicket(instance.id, ticket, joiner);
  if (!result.ok) return json({ ok: false, error: result.error }, { status: 403 });
  return json({
    ok: true,
    username: result.username,
    version: result.version,
    current_version: result.currentVersion,
    restart_required: result.restartRequired,
  });
};
