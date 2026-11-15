import { listPublishedReleases, renderPublicMarkdown } from '$lib/server/content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const releases = await listPublishedReleases();
  return {
    releases: releases.map((r) => ({
      version: r.version,
      channel: r.channel,
      publishedAt: r.publishedAt,
      fileName: r.fileName,
      fileSize: r.fileSize,
      sha256: r.sha256,
      githubUrl: r.githubUrl,
      notesHtml: renderPublicMarkdown(r.notes),
    })),
  };
};
