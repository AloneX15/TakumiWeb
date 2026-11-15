import { json } from '@sveltejs/kit';
import { hasRole } from '$lib/server/auth';
import { apiError, readJson, str } from '$lib/server/guards';
import { renderMarkdown } from '$lib/server/markdown';
import type { RequestHandler } from './$types';

/** Markdown preview for the admin editors (same renderer as the public pages). */
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!hasRole(locals.user, 'editor')) return apiError(403, 'Sin permiso.');
  const body = await readJson(request);
  return json({ html: renderMarkdown(str(body.markdown)) });
};
