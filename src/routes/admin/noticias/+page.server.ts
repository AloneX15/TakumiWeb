import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { posts, users } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/guards';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  requireUser(event, 'editor');
  const list = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      category: posts.category,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      author: users.username,
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .orderBy(desc(posts.updatedAt));
  return { posts: list };
};
