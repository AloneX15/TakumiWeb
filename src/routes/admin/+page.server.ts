import { and, desc, eq, gt, isNotNull, sql } from 'drizzle-orm';
import { latestRelease } from '$lib/server/content';
import { db } from '$lib/server/db';
import { posts, releases, sessions, users } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

const count = sql<number>`count(*)::int`;

export const load: PageServerLoad = async (event) => {
  requireUser(event, 'editor');
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [[userStats], [postStats], [downloadStats], [launcherStats], latest, recentUsers] = await Promise.all([
    db
      .select({ total: count, week: sql<number>`count(*) filter (where ${users.createdAt} > ${weekAgo})::int` })
      .from(users),
    db.select({ published: count }).from(posts).where(isNotNull(posts.publishedAt)),
    db.select({ total: sql<number>`coalesce(sum(${releases.downloads}), 0)::int` }).from(releases),
    db
      .select({ active: sql<number>`count(distinct ${sessions.userId})::int` })
      .from(sessions)
      .where(and(eq(sessions.kind, 'launcher'), gt(sessions.lastUsedAt, weekAgo))),
    latestRelease(),
    db
      .select({ id: users.id, username: users.username, email: users.email, createdAt: users.createdAt })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(6),
  ]);

  return {
    stats: {
      users: userStats.total,
      newUsers: userStats.week,
      posts: postStats.published,
      downloads: downloadStats.total,
      launcherUsers: launcherStats.active,
    },
    latest: latest && { version: latest.version, downloads: latest.downloads, publishedAt: latest.publishedAt },
    recentUsers: event.locals.user?.role === 'admin' ? recentUsers : [],
  };
};
