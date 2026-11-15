<script lang="ts">
  import { CATEGORY_LABELS, formatDate } from '$lib/format';

  type Summary = {
    slug: string;
    title: string;
    excerpt: string;
    category: keyof typeof CATEGORY_LABELS;
    coverUrl: string | null;
    publishedAt: Date | string | null;
  };

  let { post }: { post: Summary } = $props();
</script>

<a class="post card" href="/noticias/{post.slug}">
  {#if post.coverUrl}
    <img class="cover" src={post.coverUrl} alt="" loading="lazy" />
  {:else}
    <div class="cover placeholder"></div>
  {/if}
  <div class="body">
    <div class="row meta">
      <span class="badge accent">{CATEGORY_LABELS[post.category]}</span>
      <span class="muted small">{formatDate(post.publishedAt)}</span>
    </div>
    <h3>{post.title}</h3>
    {#if post.excerpt}<p class="muted">{post.excerpt}</p>{/if}
  </div>
</a>

<style>
  .post {
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
    color: var(--text);
    transition:
      border-color 0.15s,
      transform 0.15s;
  }

  .post:hover {
    text-decoration: none;
    border-color: var(--accent);
    transform: translateY(-2px);
  }

  .cover {
    width: 100%;
    aspect-ratio: 16 / 8;
    object-fit: cover;
    background: var(--surface-2);
  }

  .placeholder {
    background:
      radial-gradient(circle at 80% 20%, var(--accent-soft), transparent 60%),
      linear-gradient(135deg, var(--surface-2), var(--surface));
  }

  .body {
    padding: 16px 18px 20px;
  }

  .meta {
    margin-bottom: 8px;
  }

  h3 {
    font-size: 17px;
    line-height: 1.35;
  }

  p {
    margin-top: 6px;
    font-size: 14px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
