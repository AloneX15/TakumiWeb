<script lang="ts">
  import InstanceForm from '$lib/components/InstanceForm.svelte';

  let { form } = $props();
  const defaults = {
    name: '',
    description: '',
    minecraftVersion: '1.21.1',
    loader: 'fabric',
    loaderVersion: null,
    serverAddress: null,
    lockedDirs: ['mods'],
  };
</script>

<svelte:head><title>Nueva instancia · Takumi</title></svelte:head>

<div class="container page narrow">
  <div class="page-head">
    <a class="small muted" href="/instancias">← Instancias</a>
    <h1>Nueva instancia privada</h1>
    <p class="muted">Después podrás subir los archivos, invitar a los jugadores y publicarla.</p>
  </div>
  <div class="card">
    <InstanceForm values={form?.values ?? defaults} error={form?.error} submitLabel="Crear instancia" />
  </div>
</div>

<style>
  .narrow {
    max-width: 760px;
  }
</style>
