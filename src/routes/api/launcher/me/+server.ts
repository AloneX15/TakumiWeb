import { json } from '@sveltejs/kit';
import { SESSION_EXPIRED, apiError, launcherUser } from '$lib/server/guards';
import type { RequestHandler } from './$types';

/** GET /api/launcher/me (Bearer token) -> { user } or 401 { error }. Also renews an ageing token. */
export const GET: RequestHandler = async ({ request }) => {
  const user = await launcherUser(request);
  return user ? json({ user }) : apiError(401, SESSION_EXPIRED);
};
