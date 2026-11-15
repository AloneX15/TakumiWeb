<script lang="ts">
  import { enhance } from '$app/forms';
  import { parentDir } from '$lib/instance-paths';

  let { data, form } = $props();
  const back = $derived(`/instancias/${data.instance.id}/archivos?dir=${encodeURIComponent(parentDir(data.path))}`);
  // svelte-ignore state_referenced_locally
  let content = $state(data.content);
  let saving = $state(false);
  const jsonError = $derived.by(() => {
    if (!data.path.endsWith('.json') && !data.path.endsWith('.mcmeta')) return null;
    try {
      JSON.parse(content);
      return null;
    } catch (err) {
      return (err as Error).message;
    }
  });
</script>

<div class="row head">
  <a class="small muted" href={back}>← Archivos</a>
  <code class="path">{data.path}</code>
  {#if !data.exists}<span class="badge accent">Nuevo</span>{/if}
</div>

<form
  method="POST"
  class="stack"
  use:enhance={() => {
    saving = true;
    return async ({ update }) => {
      await update({ reset: false });
      saving = false;
    };
  }}
>
  {#if form?.error}<div class="alert error">{form.error}</div>{/if}
  {#if form?.success}<div class="alert success">{form.success}</div>{/if}
  {#if jsonError}<div class="alert error small">JSON no válido: {jsonError}</div>{/if}
  <textarea name="content" bind:value={content} spellcheck="false" rows="28"></textarea>
  <div class="row">
    <button class="primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
    <a class="btn ghost" href={back}>Volver</a>
  </div>
</form>

<style>
  .head {
    margin-bottom: 12px;
    gap: 12px;
  }

  .path {
    font-size: 14px;
    word-break: break-all;
  }

  textarea {
    font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
    font-size: 13px;
    line-height: 1.5;
    tab-size: 2;
    white-space: pre;
    min-height: 420px;
  }
</style>
