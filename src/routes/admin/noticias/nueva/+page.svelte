<script lang="ts">
  import PostForm from '$lib/components/PostForm.svelte';

  let { form } = $props();

  const empty = {
    title: '',
    slug: '',
    category: 'news' as const,
    excerpt: '',
    coverUrl: '',
    body: '',
    published: false,
  };
</script>

<div class="page-head">
  <a class="small muted" href="/admin/noticias">← Noticias</a>
  <h1>Nueva publicación</h1>
</div>

<div class="card">
  <PostForm initial={form?.values ?? empty} error={form?.error} submitLabel="Crear publicación" />
</div>
