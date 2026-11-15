<script lang="ts">
  import { page } from '$app/state';

  let { data, children } = $props();

  const items = $derived([
    { href: '/admin', label: 'Resumen', exact: true },
    { href: '/admin/noticias', label: 'Noticias' },
    { href: '/admin/versiones', label: 'Versiones' },
    ...(data.user?.role === 'admin' ? [{ href: '/admin/usuarios', label: 'Usuarios' }] : []),
  ]);

  function current(item: { href: string; exact?: boolean }) {
    return item.exact ? page.url.pathname === item.href : page.url.pathname.startsWith(item.href);
  }
</script>

<svelte:head>
  <title>Administración · Takumi</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="container admin">
  <aside>
    <div class="title muted small">ADMINISTRACIÓN</div>
    <nav>
      {#each items as item}
        <a href={item.href} class:current={current(item)}>{item.label}</a>
      {/each}
    </nav>
  </aside>
  <div class="content">
    {@render children()}
  </div>
</div>

<style>
  .admin {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 32px;
    padding-top: 32px;
    padding-bottom: 64px;
    max-width: 1280px;
  }

  aside {
    position: sticky;
    top: 96px;
    align-self: start;
  }

  .title {
    letter-spacing: 0.08em;
    font-weight: 600;
    padding: 0 12px 10px;
  }

  nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  nav a {
    color: var(--muted);
    padding: 8px 12px;
    border-radius: 8px;
    font-weight: 500;
  }

  nav a:hover {
    color: var(--text);
    background: var(--surface-2);
    text-decoration: none;
  }

  nav a.current {
    color: var(--text);
    background: var(--accent-soft);
    box-shadow: inset 3px 0 0 var(--accent);
  }

  .content {
    min-width: 0;
  }

  @media (max-width: 760px) {
    .admin {
      grid-template-columns: 1fr;
      gap: 18px;
    }

    aside {
      position: static;
    }

    nav {
      flex-direction: row;
      flex-wrap: wrap;
    }
  }
</style>
