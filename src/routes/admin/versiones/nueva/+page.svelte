<script lang="ts">
  import ReleaseForm from '$lib/components/ReleaseForm.svelte';

  let { form } = $props();

  const empty = {
    version: '',
    channel: 'stable' as const,
    notes: '',
    downloadUrl: '',
    fileName: null,
    fileSize: null,
    sha256: null,
    githubUrl: null,
    publish: true,
  };
</script>

<div class="page-head">
  <a class="small muted" href="/admin/versiones">← Versiones</a>
  <h1>Nueva versión</h1>
</div>

<div class="card">
  <ReleaseForm initial={form?.values ?? empty} error={form?.error} submitLabel="Crear versión" />
</div>
