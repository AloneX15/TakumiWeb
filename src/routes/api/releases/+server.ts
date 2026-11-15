import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { secretMatches } from '$lib/server/auth';
import { apiError, bearerToken, readJson, str } from '$lib/server/guards';
import { changesPublishedInstaller, upsertRelease, validateRelease } from '$lib/server/releases';
import type { RequestHandler } from './$types';

/**
 * POST /api/releases  (Authorization: Bearer $RELEASE_API_TOKEN) — used by GitHub Actions.
 * Body: { version, channel?, notes?, download_url, file_name?, file_size?, sha256?, github_url?, publish? }
 * Creates the release or updates the one with the same version. A published version keeps its
 * installer: a different download_url or sha256 for it is refused with 409.
 */
export const POST: RequestHandler = async ({ request }) => {
  if (!env.RELEASE_API_TOKEN) return apiError(503, 'RELEASE_API_TOKEN no está configurado en el servidor.');
  if (!secretMatches(bearerToken(request), env.RELEASE_API_TOKEN)) return apiError(401, 'Token no válido.');

  const body = await readJson(request);
  const size = body.file_size;
  const input = {
    version: str(body.version).trim().replace(/^v/, ''),
    channel: body.channel === 'beta' ? ('beta' as const) : ('stable' as const),
    notes: str(body.notes),
    downloadUrl: str(body.download_url).trim(),
    fileName: str(body.file_name).trim() || null,
    fileSize: typeof size === 'number' ? size : typeof size === 'string' && size ? Number(size) : null,
    sha256: str(body.sha256).trim() || null,
    githubUrl: str(body.github_url).trim() || null,
    publish: body.publish !== false,
  };
  const problem = validateRelease(input);
  if (problem) return apiError(400, problem);
  // Re-running the workflow for the same build is fine; swapping the file behind a published
  // version is not (an editor can still correct it from the admin panel).
  if (await changesPublishedInstaller(input)) {
    return apiError(409, `La versión ${input.version} ya está publicada con otro instalador. Publica una versión nueva.`);
  }

  const { release, created } = await upsertRelease(input);
  return json(
    { id: release.id, version: release.version, published: release.publishedAt !== null },
    { status: created ? 201 : 200 },
  );
};
