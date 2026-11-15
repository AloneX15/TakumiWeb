<script lang="ts">
  import { enhance } from '$app/forms';
  import PostForm from '$lib/components/PostForm.svelte';

  let { data, form } = $props();
  let confirmDelete = $state(false);

  const success = $derived(
    form && 'success' in form ? form.success : data.saved && !form ? 'Publicación creada.' : null,
  );
</script>

<div class="page-head row">
  <div>
    <a class="small muted" href="/admin/noticias">← Noticias</a>
    <h1>Editar publicación</h1>
  </div>
  <div class="spacer"></div>
  {#if data.post.published}
    <a class="btn" href="/noticias/{data.post.slug}" target="_blank">Ver en la web ↗</a>
  {/if}
</div>

{#if success}<div class="alert success">{success}</div>{/if}

<div class="card">
  {#key data.post.id}
    <PostForm
      initial={form && 'values' in form && form.values ? form.values : data.post}
      error={form && 'error' in form ? form.error : null}
      submitLabel="Guardar cambios"
    />
  {/key}
</div>

<section class="card danger-zone">
  <div>
    <h3>Eliminar publicación</h3>
    <p class="muted small">Se borra para siempre. Si solo quieres ocultarla, desmarca «Publicada».</p>
  </div>
  <div class="spacer"></div>
  {#if confirmDelete}
    <form method="POST" action="?/delete" use:enhance>
      <button class="danger solid">Sí, eliminar</button>
    </form>
    <button onclick={() => (confirmDelete = false)}>Cancelar</button>
  {:else}
    <button class="danger" onclick={() => (confirmDelete = true)}>Eliminar</button>
  {/if}
</section>

<style>
  .page-head {
    align-items: flex-end;
  }

  .alert {
    margin-bottom: 16px;
  }

  .danger-zone {
    margin-top: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    border-color: rgba(255, 92, 108, 0.3);
  }
</style>
