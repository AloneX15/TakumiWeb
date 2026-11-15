<script lang="ts">
  import { formatDate } from '$lib/format';

  let { data } = $props();

  const tiles = $derived([
    { label: 'Usuarios registrados', value: data.stats.users, note: `+${data.stats.newUsers} esta semana` },
    { label: 'Usuarios activos en el launcher', value: data.stats.launcherUsers, note: 'últimos 7 días' },
    { label: 'Descargas totales', value: data.stats.downloads, note: 'todas las versiones' },
    { label: 'Publicaciones', value: data.stats.posts, note: 'noticias, actualizaciones y blog' },
  ]);
  const number = new Intl.NumberFormat('es-ES');
</script>

<div class="page-head row">
  <div>
    <h1>Resumen</h1>
    <p class="muted">Estado de la web y del launcher.</p>
  </div>
  <div class="spacer"></div>
  <a class="btn" href="/admin/versiones/nueva">Nueva versión</a>
  <a class="btn primary" href="/admin/noticias/nueva">Nueva noticia</a>
</div>

<div class="tiles">
  {#each tiles as tile}
    <div class="card tile">
      <div class="muted small">{tile.label}</div>
      <div class="value">{number.format(tile.value)}</div>
      <div class="muted small">{tile.note}</div>
    </div>
  {/each}
</div>

<div class="grid-2 panels">
  <section class="card">
    <h3>Versión actual del launcher</h3>
    {#if data.latest}
      <p class="version">{data.latest.version}</p>
      <p class="muted small">
        Publicada el {formatDate(data.latest.publishedAt)} · {number.format(data.latest.downloads)} descargas
      </p>
    {:else}
      <p class="muted">No hay ninguna versión publicada. Publica una desde GitHub Actions o a mano.</p>
    {/if}
    <a class="small" href="/admin/versiones">Gestionar versiones →</a>
  </section>

  {#if data.recentUsers.length}
    <section class="card">
      <h3>Últimos registros</h3>
      <ul>
        {#each data.recentUsers as user (user.id)}
          <li class="row">
            <a href="/admin/usuarios/{user.id}">{user.username}</a>
            <span class="muted small">{user.email}</span>
            <span class="spacer"></span>
            <span class="muted small">{formatDate(user.createdAt)}</span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>

<style>
  .page-head {
    align-items: flex-end;
  }

  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 14px;
  }

  .value {
    font-size: 32px;
    font-weight: 750;
    margin: 4px 0;
  }

  .panels {
    margin-top: 16px;
  }

  h3 {
    margin-bottom: 12px;
  }

  .version {
    font-size: 28px;
    font-weight: 750;
    color: var(--accent-hover);
  }

  section > a {
    display: inline-block;
    margin-top: 12px;
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    padding: 8px 0;
    border-top: 1px solid var(--border);
    flex-wrap: nowrap;
  }

  li .muted {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
