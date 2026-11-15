import { and, eq, ne } from 'drizzle-orm';
import { checkSlug, slugify } from '$lib/validation';
import { invalidateContent } from './cache';
import { db } from './db';
import { posts, type PostCategory } from './db/schema';
import { checkUrl } from './releases';

const CATEGORIES: PostCategory[] = ['news', 'update', 'blog'];

export type PostFormValues = {
  title: string;
  slug: string;
  category: PostCategory;
  excerpt: string;
  coverUrl: string;
  body: string;
  published: boolean;
};

export function readPostForm(form: FormData): PostFormValues {
  const category = String(form.get('category') ?? 'news') as PostCategory;
  return {
    title: String(form.get('title') ?? '').trim(),
    slug: String(form.get('slug') ?? '').trim(),
    category: CATEGORIES.includes(category) ? category : 'news',
    excerpt: String(form.get('excerpt') ?? '').trim(),
    coverUrl: String(form.get('coverUrl') ?? '').trim(),
    body: String(form.get('body') ?? ''),
    published: form.get('published') === 'on',
  };
}

/** Validates, then inserts (no id) or updates the post. Returns the id or an error message. */
export async function savePost(
  values: PostFormValues,
  authorId: string,
  id?: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!values.title) return { ok: false, error: 'El título es obligatorio.' };
  if (values.title.length > 160) return { ok: false, error: 'El título no puede pasar de 160 caracteres.' };
  if (values.excerpt.length > 300) return { ok: false, error: 'El resumen no puede pasar de 300 caracteres.' };
  const slug = values.slug || slugify(values.title);
  const problem = checkSlug(slug) ?? checkUrl(values.coverUrl || null, 'Imagen de portada');
  if (problem) return { ok: false, error: problem };

  const [clash] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(id ? and(eq(posts.slug, slug), ne(posts.id, id)) : eq(posts.slug, slug))
    .limit(1);
  if (clash) return { ok: false, error: `Ya hay otra publicación con el slug «${slug}».` };

  const [existing] = id ? await db.select().from(posts).where(eq(posts.id, id)).limit(1) : [];
  if (id && !existing) return { ok: false, error: 'La publicación ya no existe.' };

  const row = {
    title: values.title,
    slug,
    category: values.category,
    excerpt: values.excerpt,
    coverUrl: values.coverUrl || null,
    body: values.body,
    // Keep the original date when re-saving a published post.
    publishedAt: values.published ? (existing?.publishedAt ?? new Date()) : null,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(posts).set(row).where(eq(posts.id, existing.id));
    invalidateContent();
    return { ok: true, id: existing.id };
  }
  const [created] = await db
    .insert(posts)
    .values({ ...row, authorId })
    .returning({ id: posts.id });
  invalidateContent();
  return { ok: true, id: created.id };
}
