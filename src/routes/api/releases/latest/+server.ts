import { json } from '@sveltejs/kit';
import { latestRelease } from '$lib/server/content';
import { apiError } from '$lib/server/guards';
import type { RequestHandler } from './$types';

/**
 * GET /api/releases/latest?channel=stable|beta
 * -> { version, channel, notes, published_at, download_url, page_url, sha256, file_size } or 404.
 * The launcher compares `version` with its own to show the update notice.
 */
export const GET: RequestHandler = async ({ url, setHeaders }) => {
  const channel = url.searchParams.get('channel') === 'beta' ? 'beta' : 'stable';
  const release = await latestRelease(channel);
  if (!release) return apiError(404, 'Todavía no hay ninguna versión publicada.');

  setHeaders({ 'cache-control': 'public, max-age=60' });
  return json({
    version: release.version,
    channel: release.channel,
    notes: release.notes,
    published_at: release.publishedAt?.toISOString() ?? null,
    download_url: new URL(`/descargas/${release.version}/descargar`, url.origin).href,
    page_url: new URL('/descargas', url.origin).href,
    sha256: release.sha256,
    file_size: release.fileSize,
  });
};
