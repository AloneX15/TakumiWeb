<script lang="ts">
  import { enhance } from '$app/forms';
  import ReleaseForm from '$lib/components/ReleaseForm.svelte';

  let { data, form } = $props();
  let confirmDelete = $state(false);

  const success = $derived(
    form && 'success' in form ? form.success : data.saved && !form ? 'Versión creada.' : null,
  );
</script>

<div class="page-head row">
  <div>
    <a class="small muted" href="/admin/versiones">← Versiones</a>
    <h1>Versión {data.release.version}</h1>
    <p class="muted small">{new Intl.NumberFormat('es-ES').format(data.release.downloads)} descargas</p>
  </div>
</div>

{#if success}<div class="alert success">{success}</div>{/if}

<div class="card">
  <ReleaseForm
    initial={form && 'values' in form && form.values ? form.values : data.release}
    error={form && 'error' in form ? form.error : null}
    submitLabel="Guardar cambios"
    lockVersion
  />
</div>

<section class="card danger-zone">
  <div>
    <h3>Eliminar versión</h3>
    <p class="muted small">Desaparece de Descargas y el contador se pierde. El archivo en GitHub no se toca.</p>
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
