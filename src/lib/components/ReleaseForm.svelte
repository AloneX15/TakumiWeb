<script lang="ts">
  import { enhance } from '$app/forms';
  import MarkdownEditor from './MarkdownEditor.svelte';

  type Values = {
    version: string;
    channel: 'stable' | 'beta';
    notes: string;
    downloadUrl: string;
    fileName: string | null;
    fileSize: number | null;
    sha256: string | null;
    githubUrl: string | null;
    publish: boolean;
  };

  let {
    initial,
    error,
    submitLabel,
    lockVersion = false,
  }: { initial: Values; error?: string | null; submitLabel: string; lockVersion?: boolean } = $props();

  // svelte-ignore state_referenced_locally
  let notes = $state(initial.notes);
  let busy = $state(false);
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

  <div class="grid-2">
    <label class="field">
      <span>Versión</span>
      <input name="version" value={initial.version} placeholder="1.2.0" readonly={lockVersion} required />
    </label>
    <label class="field">
      <span>Canal</span>
      <select name="channel" value={initial.channel}>
        <option value="stable">Estable</option>
        <option value="beta">Beta</option>
      </select>
    </label>
  </div>

  <label class="field">
    <span>Enlace de descarga del instalador</span>
    <input
      name="downloadUrl"
      type="url"
      value={initial.downloadUrl}
      placeholder="https://github.com/…/releases/download/v1.2.0/TakumiLauncher_1.2.0_x64-setup.exe"
      required
    />
  </label>

  <div class="grid-2">
    <label class="field">
      <span>Nombre del archivo (opcional)</span>
      <input name="fileName" value={initial.fileName ?? ''} />
    </label>
    <label class="field">
      <span>Tamaño en bytes (opcional)</span>
      <input name="fileSize" type="number" min="0" value={initial.fileSize ?? ''} />
    </label>
  </div>

  <div class="grid-2">
    <label class="field">
      <span>SHA-256 (opcional)</span>
      <input name="sha256" value={initial.sha256 ?? ''} maxlength="64" />
    </label>
    <label class="field">
      <span>Release en GitHub (opcional)</span>
      <input name="githubUrl" type="url" value={initial.githubUrl ?? ''} />
    </label>
  </div>

  <div class="field">
    <span class="muted small">Notas de la versión</span>
    <MarkdownEditor name="notes" bind:value={notes} rows={12} placeholder="- Novedad 1&#10;- Corrección 2" />
  </div>

  <div class="row">
    <label class="check">
      <input type="checkbox" name="publish" checked={initial.publish} />
      <span>Publicada (aparece en Descargas y el launcher avisa de la actualización)</span>
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
</style>
