<script lang="ts">
  import { page } from '$app/state';
  import { LOADER_LABELS } from '$lib/instance-paths';

  let { data, children } = $props();
  const base = $derived(`/instancias/${data.instance.id}`);
  const tabs = $derived([
    { href: base, label: 'Resumen', exact: true },
    ...(data.canManage
      ? [
          { href: `${base}/archivos`, label: 'Archivos' },
          { href: `${base}/miembros`, label: 'Miembros' },
          { href: `${base}/ajustes`, label: 'Ajustes' },
        ]
      : []),
  ]);
  const ROLE = { owner: 'Propietario', manager: 'Gestor', member: 'Miembro' } as const;
</script>

<svelte:head>
  <title>{data.instance.name} · Instancias · Takumi</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="container page">
  <div class="page-head">
    <a class="small muted" href="/instancias">← Instancias</a>
    <div class="row title">
      <h1>{data.instance.name}</h1>
      <span class="badge accent">{ROLE[data.role]}</span>
      {#if !data.memberRole}<span class="badge warning">Acceso de administrador</span>{/if}
      {#if data.instance.currentVersion}
        <span class="badge success">v{data.instance.currentVersion}</span>
      {:else}
        <span class="badge">Sin publicar</span>
      {/if}
      {#if data.instance.dirty && data.canManage}<span class="badge warning">Cambios sin publicar</span>{/if}
    </div>
    <p class="muted small">
      {LOADER_LABELS[data.instance.loader]}
      {data.instance.minecraftVersion}{#if data.instance.loaderVersion}&nbsp;· loader {data.instance.loaderVersion}{/if}
      {#if data.instance.serverAddress}&nbsp;· servidor <code>{data.instance.serverAddress}</code>{/if}
    </p>
  </div>

  {#if tabs.length > 1}
    <nav class="tabs">
      {#each tabs as tab}
        <a
          href={tab.href}
          class:current={tab.exact ? page.url.pathname === tab.href : page.url.pathname.startsWith(tab.href)}
        >
          {tab.label}
        </a>
      {/each}
    </nav>
  {/if}

  {@render children()}
</div>

<style>
  .title {
    margin-top: 6px;
    gap: 10px;
  }

  .tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 20px;
    overflow-x: auto;
  }

  .tabs a {
    padding: 9px 14px;
    color: var(--muted);
    border-bottom: 2px solid transparent;
    font-weight: 500;
    white-space: nowrap;
  }

  .tabs a:hover {
    color: var(--text);
    text-decoration: none;
  }

  .tabs a.current {
    color: var(--text);
    border-bottom-color: var(--accent);
  }
</style>
