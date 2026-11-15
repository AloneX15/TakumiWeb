<script lang="ts">
  import { formatDate } from '$lib/format';

  let { data } = $props();
  const number = new Intl.NumberFormat('es-ES');
</script>

<div class="page-head row">
  <div>
    <h1>Versiones del launcher</h1>
    <p class="muted">
      Se registran solas al publicar un tag <code>v*</code> en GitHub (workflow <em>Release</em>). También puedes añadirlas a
      mano.
    </p>
  </div>
  <div class="spacer"></div>
  <a class="btn primary" href="/admin/versiones/nueva">Nueva versión</a>
</div>

{#if data.releases.length}
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Versión</th>
          <th>Canal</th>
          <th>Estado</th>
          <th>Origen</th>
          <th>Descargas</th>
          <th>Publicada</th>
        </tr>
      </thead>
      <tbody>
        {#each data.releases as release (release.id)}
          <tr>
            <td><a href="/admin/versiones/{release.id}"><strong>{release.version}</strong></a></td>
            <td>
              <span class="badge" class:warning={release.channel === 'beta'}>
                {release.channel === 'beta' ? 'Beta' : 'Estable'}
              </span>
            </td>
            <td>
              {#if release.publishedAt}
                <span class="badge success">Publicada</span>
              {:else}
                <span class="badge warning">Borrador</span>
              {/if}
            </td>
            <td class="muted">{release.fromGithub ? 'GitHub Actions' : 'Manual'}</td>
            <td>{number.format(release.downloads)}</td>
            <td class="muted">{formatDate(release.publishedAt)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <div class="card empty">
    <p>Aún no hay versiones.</p>
    <a class="btn primary" href="/admin/versiones/nueva">Añadir la primera</a>
  </div>
{/if}

<style>
  .page-head {
    align-items: flex-end;
  }

  .empty p {
    margin-bottom: 14px;
  }

  code {
    font-size: 0.9em;
  }
</style>
