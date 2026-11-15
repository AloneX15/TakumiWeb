<script lang="ts">
  import { LOADER_LABELS } from '$lib/instance-paths';

  let { data } = $props();
  const ROLE = { owner: 'Propietario', manager: 'Gestor', member: 'Miembro' } as const;
</script>

<svelte:head><title>Instancias privadas · Takumi</title></svelte:head>

<div class="container page">
  <div class="page-head row">
    <div>
      <h1>Instancias privadas</h1>
      <p class="muted">
        Instancias para eventos: solo los miembros pueden jugarlas, y el launcher mantiene sus archivos siempre al día.
      </p>
    </div>
    <div class="spacer"></div>
    {#if data.canCreate}<a class="btn primary" href="/instancias/nueva">Crear instancia</a>{/if}
  </div>

  {#if data.own.length}
    <div class="grid">
      {#each data.own as instance (instance.id)}
        <a class="card item" href="/instancias/{instance.id}">
          <div class="row">
            <h3>{instance.name}</h3>
            <span class="spacer"></span>
            <span class="badge" class:accent={instance.role !== 'member'}>{ROLE[instance.role]}</span>
          </div>
          {#if instance.description}<p class="muted small desc">{instance.description}</p>{/if}
          <div class="row small muted meta">
            <span>{LOADER_LABELS[instance.loader]} {instance.minecraftVersion}</span>
            <span>·</span>
            <span>{instance.members} miembros</span>
            <span>·</span>
            {#if instance.currentVersion}<span>v{instance.currentVersion}</span>{:else}<span>Sin publicar</span>{/if}
            {#if instance.dirty && instance.role !== 'member'}<span class="badge warning">Cambios sin publicar</span>{/if}
          </div>
        </a>
      {/each}
    </div>
  {:else}
    <div class="card empty">
      <p>No eres miembro de ninguna instancia privada.</p>
      <p class="muted small">
        Pide al organizador del evento un enlace de invitación.{#if data.canCreate}&nbsp;O crea la tuya.{/if}
      </p>
    </div>
  {/if}

  {#if data.others.length}
    <h2 class="others">Todas las instancias (administración)</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nombre</th><th>Juego</th><th>Propietario</th><th>Versión</th></tr></thead>
        <tbody>
          {#each data.others as instance (instance.id)}
            <tr>
              <td><a href="/instancias/{instance.id}">{instance.name}</a></td>
              <td class="muted">{LOADER_LABELS[instance.loader]} {instance.minecraftVersion}</td>
              <td class="muted">{instance.owner ?? '—'}</td>
              <td>{instance.currentVersion ? `v${instance.currentVersion}` : '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .page-head {
    align-items: flex-end;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px;
  }

  .item {
    color: var(--text);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .item:hover {
    text-decoration: none;
    border-color: var(--accent);
  }

  .desc {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .meta {
    gap: 6px;
  }

  .empty p + p {
    margin-top: 6px;
  }

  .others {
    margin: 36px 0 12px;
  }
</style>
