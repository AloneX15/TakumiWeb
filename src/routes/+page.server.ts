import { latestRelease, listPublishedPosts } from '$lib/server/content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const [release, news] = await Promise.all([latestRelease(), listPublishedPosts({ limit: 3 })]);
  return {
    release: release && { version: release.version, publishedAt: release.publishedAt, fileSize: release.fileSize },
    posts: news.posts,
  };
};
