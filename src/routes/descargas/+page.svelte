<script lang="ts">
  import { formatBytes, formatDate } from '$lib/format';

  let { data } = $props();

  const latest = $derived(data.releases.find((r) => r.channel === 'stable') ?? null);
  const latestBeta = $derived(
    data.releases[0] && data.releases[0].channel === 'beta' ? data.releases[0] : null,
  );
</script>

<svelte:head>
  <title>Descargas · Takumi Launcher</title>
</svelte:head>

<div class="container page">
  <div class="page-head">
    <h1>Descargas</h1>
    <p class="muted">Descarga Takumi Launcher para Windows. Al abrirlo te pedirá iniciar sesión con tu cuenta de Takumi.</p>
  </div>

  {#if latest}
    <section class="card latest">
      <div>
        <span class="badge success">Última versión</span>
        <h2>Takumi Launcher {latest.version}</h2>
        <p class="muted small">
          Publicada el {formatDate(latest.publishedAt)}
          {#if latest.fileSize}· {formatBytes(latest.fileSize)}{/if}
          {#if latest.fileName}· {latest.fileName}{/if}
        </p>
        {#if latest.sha256}
          <p class="muted small hash">SHA-256: <code>{latest.sha256}</code></p>
        {/if}
      </div>
      <div class="spacer"></div>
      <div class="dl">
        <a class="btn primary large" href="/descargas/{latest.version}/descargar" data-sveltekit-reload>Descargar para Windows</a>
        {#if latestBeta}
          <a class="small" href="/descargas/{latestBeta.version}/descargar" data-sveltekit-reload>o prueba la beta {latestBeta.version}</a>
        {/if}
      </div>
    </section>
    <p class="muted small note">
      El launcher aún no está firmado digitalmente: Windows SmartScreen puede mostrar un aviso. Pulsa «Más información» →
      «Ejecutar de todas formas».
    </p>
  {:else}
    <div class="card empty">Aún no hay ninguna versión publicada. ¡Vuelve pronto!</div>
  {/if}

  {#if data.releases.length}
    <h2 class="history-title">Historial de versiones</h2>
    <div class="history">
      {#each data.releases as release (release.version)}
        <details class="card release" open={release === data.releases[0]}>
          <summary>
            <strong>{release.version}</strong>
            {#if release.channel === 'beta'}<span class="badge warning">Beta</span>{/if}
            <span class="muted small">{formatDate(release.publishedAt)}</span>
            <span class="spacer"></span>
            <a class="btn" href="/descargas/{release.version}/descargar" data-sveltekit-reload>Descargar</a>
          </summary>
          <div class="notes">
            {#if release.notesHtml}
              <div class="prose">{@html release.notesHtml}</div>
            {:else}
              <p class="muted">Sin notas para esta versión.</p>
            {/if}
            {#if release.githubUrl}
              <p class="small"><a href={release.githubUrl} target="_blank" rel="noopener noreferrer">Ver en GitHub</a></p>
            {/if}
          </div>
        </details>
      {/each}
    </div>
  {/if}
</div>

<style>
  .latest {
    display: flex;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
    padding: 28px;
    background: radial-gradient(ellipse at 100% 0%, var(--accent-soft), transparent 60%), var(--surface);
  }

  .latest h2 {
    font-size: 26px;
    margin: 10px 0 4px;
  }

  .hash code {
    font-size: 11px;
    overflow-wrap: anywhere;
  }

  .dl {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .note {
    margin-top: 12px;
  }

  .history-title {
    margin: 44px 0 16px;
  }

  .history {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .release {
    padding: 0;
  }

  summary {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    cursor: pointer;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  .notes {
    padding: 4px 18px 18px;
    border-top: 1px solid var(--border);
  }

  .notes .prose {
    font-size: 15px;
    margin-top: 14px;
  }

  .notes p.small {
    margin-top: 12px;
  }
</style>
