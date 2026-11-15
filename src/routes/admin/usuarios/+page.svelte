<script lang="ts">
  import { page } from '$app/state';
  import { ROLE_LABELS, formatDate } from '$lib/format';

  let { data } = $props();

  function pageHref(n: number) {
    const params = new URLSearchParams(page.url.searchParams);
    params.set('pagina', String(n));
    return `?${params}`;
  }
</script>

<div class="page-head row">
  <div>
    <h1>Usuarios</h1>
    <p class="muted">{data.total} {data.total === 1 ? 'cuenta' : 'cuentas'}</p>
  </div>
  <div class="spacer"></div>
  <a class="btn primary" href="/admin/usuarios/nuevo">Crear usuario</a>
</div>

<form class="row filters" method="GET" data-sveltekit-keepfocus>
  <input name="q" value={data.q} placeholder="Buscar por usuario o correo…" class="search" />
  <select name="rol" value={data.role ?? ''}>
    <option value="">Todos los roles</option>
    {#each Object.entries(ROLE_LABELS) as [value, label]}
      <option {value}>{label}</option>
    {/each}
  </select>
  <select name="estado" value={data.status ?? ''}>
    <option value="">Cualquier estado</option>
    <option value="activos">Activos</option>
    <option value="suspendidos">Suspendidos</option>
  </select>
  <button>Filtrar</button>
</form>

{#if data.users.length}
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Usuario</th>
          <th>Correo</th>
          <th>Rol</th>
          <th>Estado</th>
          <th>Registro</th>
          <th>Último acceso</th>
        </tr>
      </thead>
      <tbody>
        {#each data.users as user (user.id)}
          <tr>
            <td><a href="/admin/usuarios/{user.id}"><strong>{user.username}</strong></a></td>
            <td class="muted">{user.email}</td>
            <td><span class="badge" class:accent={user.role !== 'user'}>{ROLE_LABELS[user.role]}</span></td>
            <td>
              {#if user.bannedAt}
                <span class="badge danger">Suspendido</span>
              {:else}
                <span class="badge success">Activo</span>
              {/if}
            </td>
            <td class="muted">{formatDate(user.createdAt)}</td>
            <td class="muted">{formatDate(user.lastLoginAt)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <div class="card empty">No hay usuarios que coincidan con la búsqueda.</div>
{/if}

{#if data.pages > 1}
  <div class="row pager">
    {#if data.page > 1}<a class="btn" href={pageHref(data.page - 1)}>← Anterior</a>{/if}
    <span class="spacer"></span>
    <span class="muted small">Página {data.page} de {data.pages}</span>
    <span class="spacer"></span>
    {#if data.page < data.pages}<a class="btn" href={pageHref(data.page + 1)}>Siguiente →</a>{/if}
  </div>
{/if}

<style>
  .page-head {
    align-items: flex-end;
  }

  .filters {
    margin-bottom: 16px;
    flex-wrap: nowrap;
  }

  .filters select {
    width: auto;
  }

  .search {
    flex: 1;
  }

  .pager {
    margin-top: 20px;
  }

  @media (max-width: 760px) {
    .filters {
      flex-wrap: wrap;
    }
  }
</style>
