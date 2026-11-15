import { json } from '@sveltejs/kit';
import { listPublishedPosts } from '$lib/server/content';
import type { PostCategory } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

const CATEGORIES: PostCategory[] = ['news', 'update', 'blog'];

/** GET /api/news?limit=10&category=news -> { posts: [{ slug, title, excerpt, category, cover_url, published_at, url }] } */
export const GET: RequestHandler = async ({ url, setHeaders }) => {
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 10));
  const raw = url.searchParams.get('category');
  const category = CATEGORIES.includes(raw as PostCategory) ? (raw as PostCategory) : undefined;
  const { posts } = await listPublishedPosts({ category, limit });

  setHeaders({ 'cache-control': 'public, max-age=60' });
  return json({
    posts: posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      category: p.category,
      cover_url: p.coverUrl,
      published_at: p.publishedAt?.toISOString() ?? null,
      url: new URL(`/noticias/${p.slug}`, url.origin).href,
    })),
  });
};
