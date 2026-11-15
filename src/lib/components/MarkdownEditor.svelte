<script lang="ts">
  let {
    name,
    value = $bindable(''),
    rows = 18,
    placeholder = '',
  }: { name: string; value?: string; rows?: number; placeholder?: string } = $props();

  let tab = $state<'write' | 'preview'>('write');
  let html = $state('');
  let loading = $state(false);

  async function showPreview() {
    tab = 'preview';
    loading = true;
    try {
      const response = await fetch('/admin/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ markdown: value }),
      });
      html = response.ok ? (await response.json()).html : '<p>No se pudo generar la vista previa.</p>';
    } finally {
      loading = false;
    }
  }
</script>

<div class="editor">
  <div class="tabs">
    <button type="button" class:active={tab === 'write'} onclick={() => (tab = 'write')}>Escribir</button>
    <button type="button" class:active={tab === 'preview'} onclick={showPreview}>Vista previa</button>
    <span class="spacer"></span>
    <span class="muted small hint">Markdown: **negrita**, ## título, - lista, [enlace](url), ![imagen](url)</span>
  </div>
  <textarea {name} bind:value {rows} {placeholder} hidden={tab !== 'write'}></textarea>
  {#if tab === 'preview'}
    <div class="preview prose">
      {#if loading}
        <p class="muted">Generando…</p>
      {:else if value.trim()}
        {@html html}
      {:else}
        <p class="muted">Nada que mostrar todavía.</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .editor {
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    background: var(--bg);
  }

  .tabs {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 6px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  .tabs button {
    background: transparent;
    border-color: transparent;
    padding: 5px 12px;
    font-size: 13px;
    color: var(--muted);
  }

  .tabs button.active {
    background: var(--surface-3);
    color: var(--text);
  }

  .hint {
    font-size: 12px;
    padding-right: 6px;
  }

  textarea {
    border: none;
    border-radius: 0;
    font-family: 'Cascadia Mono', Consolas, monospace;
    font-size: 14px;
    display: block;
  }

  textarea[hidden] {
    display: none;
  }

  .preview {
    padding: 16px;
    min-height: 200px;
  }

  @media (max-width: 640px) {
    .hint {
      display: none;
    }
  }
</style>
