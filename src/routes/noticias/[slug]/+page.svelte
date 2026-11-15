<script lang="ts">
  import { CATEGORY_LABELS, formatDate } from '$lib/format';

  let { data } = $props();
  const post = $derived(data.post);
</script>

<svelte:head>
  <title>{post.title} · Takumi Launcher</title>
  {#if post.excerpt}<meta name="description" content={post.excerpt} />{/if}
  <meta property="og:title" content={post.title} />
  {#if post.coverUrl}<meta property="og:image" content={post.coverUrl} />{/if}
</svelte:head>

<article class="container page">
  <a class="back small" href="/noticias">← Todas las noticias</a>
  <header>
    <div class="row">
      <span class="badge accent">{CATEGORY_LABELS[post.category]}</span>
      <span class="muted small">
        {formatDate(post.publishedAt)}{#if data.author}&nbsp;· por {data.author}{/if}
      </span>
    </div>
    <h1>{post.title}</h1>
    {#if post.excerpt}<p class="lead muted">{post.excerpt}</p>{/if}
  </header>
  {#if post.coverUrl}<img class="cover" src={post.coverUrl} alt="" />{/if}
  <div class="prose">
    {@html post.html}
  </div>
</article>

<style>
  article {
    max-width: 780px;
  }

  .back {
    color: var(--muted);
  }

  header {
    margin: 18px 0 24px;
  }

  h1 {
    margin-top: 12px;
  }

  .lead {
    font-size: 18px;
    margin-top: 10px;
  }

  .cover {
    width: 100%;
    border-radius: var(--radius);
    margin-bottom: 28px;
    border: 1px solid var(--border);
  }
</style>
