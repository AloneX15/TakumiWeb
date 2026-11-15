import { error } from '@sveltejs/kit';
import { getPublishedPost, renderPublicMarkdown } from '$lib/server/content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const row = await getPublishedPost(params.slug);
  if (!row) error(404, 'No hemos encontrado esta noticia.');
  const { post, author } = row;
  return {
    post: {
      title: post.title,
      excerpt: post.excerpt,
      category: post.category,
      coverUrl: post.coverUrl,
      publishedAt: post.publishedAt,
      html: renderPublicMarkdown(post.body),
    },
    author,
  };
};
