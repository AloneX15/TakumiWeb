import { error, fail } from '@sveltejs/kit';
import { checkFilePath, isTextFile, normalizePath } from '$lib/instance-paths';
import { requireInstance } from '$lib/server/instances/access';
import { getFile, putFile, usedBytes } from '$lib/server/instances/service';
import { putBuffer, readText } from '$lib/server/instances/storage';
import type { Actions, PageServerLoad } from './$types';

const MAX_TEXT = 2 * 1024 * 1024;

function textPath(raw: string) {
  const problem = checkFilePath(raw);
  if (problem) error(400, problem);
  const path = normalizePath(raw)!;
  if (!isTextFile(path)) error(400, 'Solo se pueden editar archivos de texto (.json, .toml, .properties, .txt, .cfg…).');
  return path;
}

export const load: PageServerLoad = async (event) => {
  const { instance } = await requireInstance(event, 'manager');
  const path = textPath(event.url.searchParams.get('path') ?? '');
  const file = await getFile(instance.id, path);
  let content = '';
  if (file) {
    if (file.size > MAX_TEXT) error(400, 'El archivo es demasiado grande para editarlo en el navegador (máx. 2 MB).');
    const text = await readText(file.sha256, MAX_TEXT);
    if (text === null) error(410, 'El contenido del archivo no está en el almacenamiento.');
    content = text;
  }
  return { path, content, exists: !!file };
};

export const actions: Actions = {
  default: async (event) => {
    const { instance, user } = await requireInstance(event, 'manager');
    const path = textPath(event.url.searchParams.get('path') ?? '');
    const content = String((await event.request.formData()).get('content') ?? '').replace(/\r\n/g, '\n');
    const data = Buffer.from(content, 'utf8');
    if (data.byteLength > MAX_TEXT) return fail(400, { error: 'Máximo 2 MB.' });
    if ((await usedBytes(instance.id, path)) + data.byteLength > instance.quotaBytes) {
      return fail(400, { error: 'No cabe: la instancia ha llegado a su cuota.' });
    }
    const result = await putFile(instance.id, user.id, path, await putBuffer(data));
    if (!result.ok) return fail(400, { error: result.error });
    return { success: 'Guardado. Recuerda publicar para que llegue a los jugadores.' };
  },
};
