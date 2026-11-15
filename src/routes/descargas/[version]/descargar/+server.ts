import { error, redirect } from '@sveltejs/kit';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { releases } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

/** Counts the download and sends the browser to the installer (GitHub Releases or wherever it is hosted). */
export const GET: RequestHandler = async ({ params }) => {
  const [release] = await db
    .update(releases)
    .set({ downloads: sql`${releases.downloads} + 1` })
    .where(and(eq(releases.version, params.version), isNotNull(releases.publishedAt)))
    .returning({ url: releases.downloadUrl });
  if (!release) error(404, 'Esta versión no existe.');
  redirect(302, release.url);
};
