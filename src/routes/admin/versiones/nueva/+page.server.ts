import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { releases } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/guards';
import { readReleaseForm } from '$lib/server/release-form';
import { upsertRelease, validateRelease } from '$lib/server/releases';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
  requireUser(event, 'editor');
};

export const actions: Actions = {
  save: async (event) => {
    requireUser(event, 'editor');
    const values = readReleaseForm(await event.request.formData());
    const problem = validateRelease(values);
    if (problem) return fail(400, { values, error: problem });
    const [existing] = await db.select({ id: releases.id }).from(releases).where(eq(releases.version, values.version));
    if (existing) return fail(400, { values, error: `La versión ${values.version} ya existe.` });
    const { release } = await upsertRelease(values);
    redirect(303, `/admin/versiones/${release.id}?guardada=1`);
  },
};
