import { deleteSession } from '$lib/server/auth';
import { bearerToken } from '$lib/server/guards';
import type { RequestHandler } from './$types';

/** POST /api/launcher/logout (Bearer token) -> 204. Idempotent. */
export const POST: RequestHandler = async ({ request }) => {
  const token = bearerToken(request);
  if (token) await deleteSession(token);
  return new Response(null, { status: 204 });
};
