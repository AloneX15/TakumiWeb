import { and, desc, eq, isNotNull, lte, sql } from 'drizzle-orm';
import { compareVersions } from '$lib/validation';
import { CONTENT_TTL, cached, memoize } from './cache';
import { db } from './db';
import { posts, releases, users, type PostCategory, type ReleaseChannel } from './db/schema';
import { renderMarkdown } from './markdown';

// Everything here is public content read on almost every request (web pages,
// launcher news and update checks), so it is cached briefly in memory.
// Results are shared between requests: do not mutate them.

/** Markdown rendering for public pages; the same source always gives the same HTML. */
export const renderPublicMarkdown = memoize(renderMarkdown);

const isPublished = () => and(isNotNull(posts.publishedAt), lte(posts.publishedAt, new Date()));

export const postSummary = {
  id: posts.id,
  slug: posts.slug,
  title: posts.title,
  excerpt: posts.excerpt,
  category: posts.category,
  coverUrl: posts.coverUrl,
  publishedAt: posts.publishedAt,
};

export function listPublishedPosts({
  category,
  limit = 12,
  offset = 0,
}: { category?: PostCategory; limit?: number; offset?: number } = {}) {
  return cached(`posts:${category ?? ''}:${limit}:${offset}`, CONTENT_TTL, async () => {
    const where = category ? and(isPublished(), eq(posts.category, category)) : isPublished();
    const [rows, [{ total }]] = await Promise.all([
      db.select(postSummary).from(posts).where(where).orderBy(desc(posts.publishedAt)).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(posts).where(where),
    ]);
    return { posts: rows, total };
  });
}

export function getPublishedPost(slug: string) {
  return cached(`post:${slug}`, CONTENT_TTL, async () => {
    const [row] = await db
      .select({ post: posts, author: users.username })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(and(eq(posts.slug, slug), isPublished()))
      .limit(1);
    return row ?? null;
  });
}

/** Published releases, newest version first. */
export function listPublishedReleases(channel?: ReleaseChannel) {
  return cached(`releases:${channel ?? ''}`, CONTENT_TTL, async () => {
    const where = channel
      ? and(isNotNull(releases.publishedAt), eq(releases.channel, channel))
      : isNotNull(releases.publishedAt);
    const rows = await db.select().from(releases).where(where);
    return rows.sort((a, b) => compareVersions(b.version, a.version));
  });
}

/** Latest stable release, or the latest of any channel when `channel` is "beta". */
export async function latestRelease(channel: ReleaseChannel = 'stable') {
  const rows = await listPublishedReleases(channel === 'stable' ? 'stable' : undefined);
  return rows[0] ?? null;
}
