<script lang="ts">
  import { enhance } from '$app/forms';
  import { CATEGORY_LABELS } from '$lib/format';
  import { slugify } from '$lib/validation';
  import MarkdownEditor from './MarkdownEditor.svelte';

  type Values = {
    title: string;
    slug: string;
    category: keyof typeof CATEGORY_LABELS;
    excerpt: string;
    coverUrl: string;
    body: string;
    published: boolean;
  };

  let { initial, error, submitLabel }: { initial: Values; error?: string | null; submitLabel: string } = $props();

  // Form state starts from the server values and is then owned by the form.
  // svelte-ignore state_referenced_locally
  let values = $state({ ...initial });
  // svelte-ignore state_referenced_locally
  let slugTouched = $state(!!initial.slug);
  let busy = $state(false);

  const autoSlug = $derived(slugify(values.title));
</script>

<form
  method="POST"
  action="?/save"
  class="stack"
  use:enhance={() => {
    busy = true;
    return async ({ update }) => {
      await update({ reset: false });
      busy = false;
    };
  }}
>
  {#if error}<div class="alert error">{error}</div>{/if}

  <label class="field">
    <span>Título</span>
    <input name="title" bind:value={values.title} maxlength="160" required />
  </label>

  <div class="grid-2">
    <label class="field">
      <span>Slug (dirección: /noticias/…)</span>
      <input
        name="slug"
        value={slugTouched ? values.slug : autoSlug}
        oninput={(e) => {
          slugTouched = true;
          values.slug = e.currentTarget.value;
        }}
        placeholder={autoSlug}
      />
    </label>
    <label class="field">
      <span>Tipo</span>
      <select name="category" bind:value={values.category}>
        {#each Object.entries(CATEGORY_LABELS) as [value, label]}
          <option {value}>{label}</option>
        {/each}
      </select>
    </label>
  </div>

  <label class="field">
    <span>Resumen (se muestra en las tarjetas y en el launcher)</span>
    <textarea name="excerpt" bind:value={values.excerpt} rows="2" maxlength="300"></textarea>
  </label>

  <label class="field">
    <span>Imagen de portada (URL, opcional)</span>
    <input name="coverUrl" type="url" bind:value={values.coverUrl} placeholder="https://…" />
  </label>

  <div class="field">
    <span class="muted small">Contenido</span>
    <MarkdownEditor name="body" bind:value={values.body} placeholder="Escribe aquí en Markdown…" />
  </div>

  <div class="row actions">
    <label class="check">
      <input type="checkbox" name="published" bind:checked={values.published} />
      <span>Publicada (visible para todos)</span>
    </label>
    <div class="spacer"></div>
    <button class="primary" disabled={busy}>{busy ? 'Guardando…' : submitLabel}</button>
  </div>
</form>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .actions {
    padding-top: 8px;
  }
</style>
