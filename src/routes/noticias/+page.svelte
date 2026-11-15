<script lang="ts">
  import PostCard from '$lib/components/PostCard.svelte';
  import { CATEGORY_LABELS } from '$lib/format';

  let { data } = $props();

  const FILTERS = [
    { value: null, label: 'Todo' },
    ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
  ];

  function href(category: string | null, page = 1) {
    const params = new URLSearchParams();
    if (category) params.set('categoria', category);
    if (page > 1) params.set('pagina', String(page));
    const query = params.toString();
    return query ? `/noticias?${query}` : '/noticias';
  }
</script>

<svelte:head>
  <title>Noticias · Takumi Launcher</title>
</svelte:head>

<div class="container page">
  <div class="page-head">
    <h1>Noticias</h1>
    <p class="muted">Novedades, actualizaciones del launcher y artículos del equipo de Takumi.</p>
  </div>

  <div class="row filters">
    {#each FILTERS as filter}
      <a class="btn" class:primary={data.category === filter.value} href={href(filter.value)}>{filter.label}</a>
    {/each}
  </div>

  {#if data.posts.length}
    <div class="posts">
      {#each data.posts as post (post.id)}
        <PostCard {post} />
      {/each}
    </div>
  {:else}
    <div class="card empty">No hay publicaciones en esta sección todavía.</div>
  {/if}

  {#if data.pages > 1}
    <div class="row pager">
      {#if data.page > 1}<a class="btn" href={href(data.category, data.page - 1)}>← Anteriores</a>{/if}
      <span class="spacer"></span>
      <span class="muted small">Página {data.page} de {data.pages}</span>
      <span class="spacer"></span>
      {#if data.page < data.pages}<a class="btn" href={href(data.category, data.page + 1)}>Siguientes →</a>{/if}
    </div>
  {/if}
</div>

<style>
  .filters {
    margin-bottom: 24px;
  }

  .posts {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 18px;
  }

  .pager {
    margin-top: 32px;
  }
</style>
