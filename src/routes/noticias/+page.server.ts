import { listPublishedPosts } from '$lib/server/content';
import type { PostCategory } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

const PER_PAGE = 12;
const CATEGORIES: PostCategory[] = ['news', 'update', 'blog'];

export const load: PageServerLoad = async ({ url }) => {
  const raw = url.searchParams.get('categoria');
  const category = CATEGORIES.includes(raw as PostCategory) ? (raw as PostCategory) : undefined;
  const page = Math.max(1, Number(url.searchParams.get('pagina')) || 1);
  const { posts, total } = await listPublishedPosts({ category, limit: PER_PAGE, offset: (page - 1) * PER_PAGE });
  return { posts, category: category ?? null, page, pages: Math.max(1, Math.ceil(total / PER_PAGE)) };
};
