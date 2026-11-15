<script lang="ts">
  import { enhance } from '$app/forms';
  import { LOADERS, LOADER_LABELS, LOCKABLE_DIRS } from '$lib/instance-paths';

  type Values = {
    name: string;
    description: string;
    minecraftVersion: string;
    loader: string;
    loaderVersion: string | null;
    serverAddress: string | null;
    lockedDirs: string[];
  };

  let {
    values,
    action = '',
    submitLabel,
    error = null,
    success = null,
  }: { values: Values; action?: string; submitLabel: string; error?: string | null; success?: string | null } = $props();

  // svelte-ignore state_referenced_locally
  let loader = $state(values.loader);

  const DIR_HELP: Record<string, string> = {
    mods: 'Nadie puede añadir mods propios',
    resourcepacks: 'Solo los packs de texturas de la instancia',
    shaderpacks: 'Solo los shaders de la instancia',
    config: 'Se borra cualquier configuración que no esté aquí',
    datapacks: 'Solo los datapacks de la instancia',
  };
</script>

<form method="POST" {action} class="stack" use:enhance={() => ({ update }) => update({ reset: false })}>
  {#if error}<div class="alert error">{error}</div>{/if}
  {#if success}<div class="alert success">{success}</div>{/if}

  <label class="field">
    <span>Nombre</span>
    <input name="name" value={values.name} minlength="3" maxlength="60" required placeholder="Evento de Halloween" />
  </label>

  <label class="field">
    <span>Descripción</span>
    <textarea name="description" maxlength="500" rows="3" placeholder="Qué es el evento, normas, horario…">{values.description}</textarea>
  </label>

  <div class="grid-3">
    <label class="field">
      <span>Versión de Minecraft</span>
      <input name="minecraftVersion" value={values.minecraftVersion} maxlength="32" required placeholder="1.21.1" />
    </label>
    <label class="field">
      <span>Loader</span>
      <select name="loader" bind:value={loader}>
        {#each LOADERS as value}
          <option {value}>{LOADER_LABELS[value]}</option>
        {/each}
      </select>
    </label>
    <label class="field">
      <span>Versión del loader</span>
      <input
        name="loaderVersion"
        value={values.loaderVersion ?? ''}
        maxlength="64"
        disabled={loader === 'vanilla'}
        placeholder={loader === 'vanilla' ? '—' : 'Vacío = la más reciente'}
      />
    </label>
  </div>

  <label class="field">
    <span>Servidor del evento</span>
    <input name="serverAddress" value={values.serverAddress ?? ''} maxlength="255" placeholder="evento.ejemplo.com:25565" />
    <small class="muted">El launcher entra directamente a este servidor al pulsar «Jugar». Opcional.</small>
  </label>

  <fieldset>
    <legend>Carpetas bloqueadas</legend>
    <p class="muted small">
      En estas carpetas el launcher elimina cualquier archivo que no esté en la instancia, así los jugadores no pueden
      añadir los suyos.
    </p>
    {#each LOCKABLE_DIRS as dir}
      <label class="check">
        <input type="checkbox" name="lockedDirs" value={dir} checked={values.lockedDirs.includes(dir)} />
        <span><code>{dir}/</code> <span class="muted small">— {DIR_HELP[dir]}</span></span>
      </label>
    {/each}
  </fieldset>

  <div><button class="primary">{submitLabel}</button></div>
</form>

<style>
  .grid-3 {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  fieldset {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  legend {
    padding: 0 6px;
    font-weight: 600;
  }

  small {
    font-size: 12px;
  }

  @media (max-width: 640px) {
    .grid-3 {
      grid-template-columns: 1fr;
    }
  }
</style>
