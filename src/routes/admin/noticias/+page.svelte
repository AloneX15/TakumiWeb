<script lang="ts">
  import { CATEGORY_LABELS, formatDate } from '$lib/format';

  let { data } = $props();
  const now = new Date();
</script>

<div class="page-head row">
  <div>
    <h1>Noticias</h1>
    <p class="muted">Noticias, actualizaciones y entradas del blog. Las publicadas aparecen en la web y en el launcher.</p>
  </div>
  <div class="spacer"></div>
  <a class="btn primary" href="/admin/noticias/nueva">Nueva publicación</a>
</div>

{#if data.posts.length}
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Título</th>
          <th>Tipo</th>
          <th>Estado</th>
          <th>Autor</th>
          <th>Actualizada</th>
        </tr>
      </thead>
      <tbody>
        {#each data.posts as post (post.id)}
          <tr>
            <td><a href="/admin/noticias/{post.id}">{post.title}</a></td>
            <td><span class="badge">{CATEGORY_LABELS[post.category]}</span></td>
            <td>
              {#if post.publishedAt && new Date(post.publishedAt) <= now}
                <span class="badge success">Publicada</span>
              {:else}
                <span class="badge warning">Borrador</span>
              {/if}
            </td>
            <td class="muted">{post.author ?? '—'}</td>
            <td class="muted">{formatDate(post.updatedAt)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <div class="card empty">
    <p>Aún no hay publicaciones.</p>
    <a class="btn primary" href="/admin/noticias/nueva">Escribir la primera</a>
  </div>
{/if}

<style>
  .page-head {
    align-items: flex-end;
  }

  .empty p {
    margin-bottom: 14px;
  }
</style>
