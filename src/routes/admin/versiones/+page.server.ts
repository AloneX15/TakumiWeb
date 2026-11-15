import { db } from '$lib/server/db';
import { releases } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/guards';
import { compareVersions } from '$lib/validation';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  requireUser(event, 'editor');
  const list = await db.select().from(releases);
  list.sort((a, b) => compareVersions(b.version, a.version));
  return {
    releases: list.map((r) => ({
      id: r.id,
      version: r.version,
      channel: r.channel,
      downloads: r.downloads,
      publishedAt: r.publishedAt,
      fromGithub: !!r.githubUrl,
    })),
  };
};
