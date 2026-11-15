import { error } from '@sveltejs/kit';
import { baseName, normalizePath } from '$lib/instance-paths';
import { requireInstance } from '$lib/server/instances/access';
import { getFile } from '$lib/server/instances/service';
import { openRead } from '$lib/server/instances/storage';
import type { RequestHandler } from './$types';

/** GET /instancias/:id/archivos/descargar?path=… (managers only): downloads one draft file. */
export const GET: RequestHandler = async (event) => {
  const { instance } = await requireInstance(event, 'manager');
  const path = normalizePath(event.url.searchParams.get('path') ?? '');
  const file = path ? await getFile(instance.id, path) : null;
  if (!file) error(404, 'Ese archivo no existe.');
  const body = await openRead(file.sha256);
  if (!body) error(410, 'El contenido del archivo no está en el almacenamiento.');
  const name = baseName(file.path);
  return new Response(body, {
    headers: {
      'content-type': 'application/octet-stream',
      'content-length': String(file.size),
      'content-disposition': `attachment; filename="${name.replace(/[^\x20-\x7e]|"/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'cache-control': 'private, no-store',
    },
  });
};
