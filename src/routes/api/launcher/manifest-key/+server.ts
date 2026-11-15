import { json } from '@sveltejs/kit';
import { apiError } from '$lib/server/guards';
import { publicKeyBase64, signingAvailable } from '$lib/server/instances/signing';
import type { RequestHandler } from './$types';

/**
 * GET /api/launcher/manifest-key -> { public_key } (raw Ed25519 key, base64)
 * Release builds of the launcher embed this key at build time (TAKUMI_MANIFEST_PUBKEY) and never call this.
 * Development builds without an embedded key fetch it from a localhost website.
 */
export const GET: RequestHandler = async () => {
  if (!signingAvailable()) return apiError(503, 'El servidor no tiene clave de firma configurada.');
  return json({ public_key: publicKeyBase64() });
};
