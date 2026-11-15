import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { invalidateContent } from '$lib/server/cache';
import { db } from '$lib/server/db';
import { posts } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/guards';
import { readPostForm, savePost } from '$lib/server/posts';
import type { Actions, PageServerLoad } from './$types';

const UUID = /^[0-9a-f-]{36}$/i;

export const load: PageServerLoad = async (event) => {
  requireUser(event, 'editor');
  const id = event.params.id;
  const [post] = UUID.test(id) ? await db.select().from(posts).where(eq(posts.id, id)).limit(1) : [];
  if (!post) error(404, 'Esta publicación no existe.');
  return {
    post: {
      id: post.id,
      title: post.title,
      slug: post.slug,
      category: post.category,
      excerpt: post.excerpt,
      coverUrl: post.coverUrl ?? '',
      body: post.body,
      published: post.publishedAt !== null,
      publishedAt: post.publishedAt,
    },
    saved: event.url.searchParams.has('guardada'),
  };
};

export const actions: Actions = {
  save: async (event) => {
    const user = requireUser(event, 'editor');
    const values = readPostForm(await event.request.formData());
    const result = await savePost(values, user.id, event.params.id);
    if (!result.ok) return fail(400, { values, error: result.error });
    return { success: 'Cambios guardados.' };
  },

  delete: async (event) => {
    requireUser(event, 'editor');
    if (UUID.test(event.params.id)) await db.delete(posts).where(eq(posts.id, event.params.id));
    invalidateContent();
    redirect(303, '/admin/noticias');
  },
};
