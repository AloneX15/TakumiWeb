import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { invalidateContent } from '$lib/server/cache';
import { db } from '$lib/server/db';
import { releases } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/guards';
import { readReleaseForm } from '$lib/server/release-form';
import { upsertRelease, validateRelease } from '$lib/server/releases';
import type { Actions, PageServerLoad } from './$types';

const UUID = /^[0-9a-f-]{36}$/i;

async function find(id: string) {
  if (!UUID.test(id)) return null;
  const [row] = await db.select().from(releases).where(eq(releases.id, id)).limit(1);
  return row ?? null;
}

export const load: PageServerLoad = async (event) => {
  requireUser(event, 'editor');
  const release = await find(event.params.id);
  if (!release) error(404, 'Esta versión no existe.');
  return {
    release: {
      id: release.id,
      version: release.version,
      channel: release.channel,
      notes: release.notes,
      downloadUrl: release.downloadUrl,
      fileName: release.fileName,
      fileSize: release.fileSize,
      sha256: release.sha256,
      githubUrl: release.githubUrl,
      publish: release.publishedAt !== null,
      downloads: release.downloads,
    },
    saved: event.url.searchParams.has('guardada'),
  };
};

export const actions: Actions = {
  save: async (event) => {
    requireUser(event, 'editor');
    const release = await find(event.params.id);
    if (!release) error(404, 'Esta versión no existe.');
    // The version is the key used by GitHub Actions and download links; it cannot change.
    const values = { ...readReleaseForm(await event.request.formData()), version: release.version };
    const problem = validateRelease(values);
    if (problem) return fail(400, { values, error: problem });
    await upsertRelease(values);
    return { success: 'Cambios guardados.' };
  },

  delete: async (event) => {
    requireUser(event, 'editor');
    if (UUID.test(event.params.id)) await db.delete(releases).where(eq(releases.id, event.params.id));
    invalidateContent();
    redirect(303, '/admin/versiones');
  },
};
