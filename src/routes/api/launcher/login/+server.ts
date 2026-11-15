import { json } from '@sveltejs/kit';
import { checkCredentials, createSession, publicUser } from '$lib/server/auth';
import { apiError, clientKey, readJson, str } from '$lib/server/guards';
import { RATE_LIMIT_MESSAGE, loginLimiter } from '$lib/server/rate-limit';
import type { RequestHandler } from './$types';

/**
 * POST /api/launcher/login  { user, password, device? }
 * -> 200 { token, expires_at, user: { id, username, email, role } }
 * -> 400/401/403/429 { error }
 */
export const POST: RequestHandler = async (event) => {
  const body = await readJson(event.request);
  const login = str(body.user).trim();
  const password = str(body.password);
  if (!login || !password) return apiError(400, 'Escribe tu usuario o correo y tu contraseña.');
  if (!loginLimiter.take(`${clientKey(event)}:${login.toLowerCase()}`)) return apiError(429, RATE_LIMIT_MESSAGE);

  const result = await checkCredentials(login, password);
  if (!result.ok) return apiError(result.status, result.message);

  const device = str(body.device).trim() || 'Takumi Launcher';
  const { token, expiresAt } = await createSession(result.user.id, 'launcher', device);
  return json({ token, expires_at: expiresAt.toISOString(), user: publicUser(result.user) });
};
