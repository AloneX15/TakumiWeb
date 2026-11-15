import { json } from '@sveltejs/kit';
import { checkFilePath, normalizePath } from '$lib/instance-paths';
import { formatBytes } from '$lib/format';
import { requireInstance } from '$lib/server/instances/access';
import { MAX_FILE_BYTES, putFile, usedBytes } from '$lib/server/instances/service';
import { TooLargeError, putStream } from '$lib/server/instances/storage';
import type { RequestHandler } from './$types';

/**
 * PUT /instancias/:id/archivos/subir?path=mods/foo.jar  (raw file body, managers only)
 * Streams the upload to storage while hashing it, so large mods never sit in memory. A cross-site page
 * cannot call it: PUT needs a CORS preflight, which this endpoint never answers.
 * -> 200 { path, sha256, size } | 4xx { error }
 */
export const PUT: RequestHandler = async (event) => {
  const { instance, user } = await requireInstance(event, 'manager');
  const raw = event.url.searchParams.get('path') ?? '';
  const problem = checkFilePath(raw);
  if (problem) return json({ error: problem }, { status: 400 });
  const path = normalizePath(raw)!;
  if (!event.request.body) return json({ error: 'Archivo vacío.' }, { status: 400 });

  const remaining = instance.quotaBytes - (await usedBytes(instance.id, path));
  const limit = Math.min(MAX_FILE_BYTES, remaining);
  const declared = Number(event.request.headers.get('content-length') ?? 0);
  const tooBig = () =>
    json(
      {
        error:
          limit === remaining
            ? `No cabe: la instancia solo tiene ${formatBytes(Math.max(remaining, 0))} libres.`
            : `${path}: el máximo por archivo es ${formatBytes(MAX_FILE_BYTES)}.`,
      },
      { status: 413 },
    );
  if (limit <= 0 || declared > limit) return tooBig();

  let blob;
  try {
    blob = await putStream(event.request.body, limit);
  } catch (err) {
    if (err instanceof TooLargeError) return tooBig();
    throw err;
  }
  const result = await putFile(instance.id, user.id, path, blob);
  if (!result.ok) return json({ error: result.error }, { status: 409 });
  return json({ path, ...blob });
};
