<script lang="ts">
  import { page } from '$app/state';
  import Logo from '$lib/components/Logo.svelte';
</script>

<svelte:head>
  <title>{page.status} · Takumi Launcher</title>
</svelte:head>

<div class="container page error">
  <Logo size={80} />
  <h1>{page.status === 404 ? 'Página no encontrada' : `Error ${page.status}`}</h1>
  <p class="muted">
    {#if page.status === 404 && (!page.error?.message || page.error.message === 'Not Found')}
      La página que buscas no existe o se ha movido.
    {:else if page.status >= 500}
      Ha ocurrido un error inesperado. Inténtalo de nuevo en unos minutos.
    {:else}
      {page.error?.message}
    {/if}
  </p>
  <a class="btn primary" href="/">Volver al inicio</a>
</div>

<style>
  .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 14px;
    padding-top: 80px;
  }
</style>
