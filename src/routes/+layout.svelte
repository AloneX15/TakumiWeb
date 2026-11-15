<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import Logo from '$lib/components/Logo.svelte';

  let { data, children } = $props();

  const NAV = [
    { href: '/noticias', label: 'Noticias' },
    { href: '/descargas', label: 'Descargas' },
  ];

  let menuOpen = $state(false);
  const staff = $derived(data.user && data.user.role !== 'user');

  $effect(() => {
    void page.url.pathname;
    menuOpen = false;
  });
</script>

<svelte:head>
  <title>Takumi Launcher</title>
  <meta name="description" content="Takumi Launcher: el launcher de Minecraft rápido, seguro y con mods de Modrinth." />
</svelte:head>

<header>
  <div class="container bar">
    <a class="brand" href="/">
      <Logo size={34} />
      <span>
        <span class="name">TAKUMI</span>
        <span class="sub">Launcher</span>
      </span>
    </a>

    <nav class="links">
      {#each NAV as item}
        <a href={item.href} class:current={page.url.pathname.startsWith(item.href)}>{item.label}</a>
      {/each}
    </nav>

    <div class="spacer"></div>

    {#if data.user}
      <div class="user">
        <button class="ghost who" onclick={() => (menuOpen = !menuOpen)} aria-expanded={menuOpen}>
          <span class="avatar">{data.user.username[0].toUpperCase()}</span>
          <span class="uname">{data.user.username}</span>
        </button>
        {#if menuOpen}
          <div class="menu card">
            <a href="/cuenta">Mi cuenta</a>
            {#if staff}<a href="/admin">Panel de administración</a>{/if}
            <form method="POST" action="/logout">
              <button class="ghost">Cerrar sesión</button>
            </form>
          </div>
        {/if}
      </div>
    {:else}
      <a class="btn ghost" href="/login">Iniciar sesión</a>
      <a class="btn primary hide-xs" href="/registro">Crear cuenta</a>
    {/if}
  </div>
</header>

<main>
  {@render children()}
</main>

<footer>
  <div class="container foot">
    <div class="row">
      <Logo size={22} />
      <span class="muted small">© {new Date().getFullYear()} TakumiLabs · Creado por TakumiStudios</span>
    </div>
    <div class="spacer"></div>
    <nav class="row small">
      <a href="/noticias">Noticias</a>
      <a href="/descargas">Descargas</a>
      <a href="https://github.com/AloneX15/TakumiLauncher" target="_blank" rel="noopener noreferrer">GitHub</a>
    </nav>
  </div>
  <p class="container muted small disclaimer">
    Takumi Launcher no es un producto oficial de Minecraft. No está aprobado ni asociado con Mojang o Microsoft.
  </p>
</footer>

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 20;
    background: rgba(13, 13, 17, 0.85);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border);
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 18px;
    height: 64px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text);
  }

  .brand:hover {
    text-decoration: none;
  }

  .brand > span {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
  }

  .name {
    font-weight: 750;
    letter-spacing: 0.14em;
  }

  .sub {
    font-size: 12px;
    color: var(--muted);
  }

  .links {
    display: flex;
    gap: 4px;
    margin-left: 12px;
  }

  .links a {
    color: var(--muted);
    padding: 6px 12px;
    border-radius: 8px;
    font-weight: 500;
  }

  .links a:hover {
    color: var(--text);
    text-decoration: none;
    background: var(--surface-2);
  }

  .links a.current {
    color: var(--text);
    background: var(--accent-soft);
  }

  .user {
    position: relative;
  }

  .who {
    padding: 5px 10px 5px 5px;
  }

  .avatar {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: var(--accent);
    color: #fff;
    display: grid;
    place-items: center;
    font-weight: 700;
  }

  .menu {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    min-width: 220px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  }

  .menu a,
  .menu button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 9px 12px;
    border-radius: 6px;
    color: var(--text);
    font-weight: 500;
  }

  .menu a:hover {
    background: var(--surface-2);
    text-decoration: none;
  }

  main {
    min-height: calc(100vh - 64px - 140px);
  }

  footer {
    border-top: 1px solid var(--border);
    padding: 28px 0 32px;
    margin-top: 40px;
  }

  .foot {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .foot nav {
    gap: 18px;
  }

  .foot nav a {
    color: var(--muted);
  }

  .disclaimer {
    margin-top: 14px;
  }

  @media (max-width: 640px) {
    .bar {
      gap: 8px;
    }

    .links {
      margin-left: 0;
    }

    .links a {
      padding: 6px 8px;
    }

    .brand > span,
    .uname,
    .hide-xs {
      display: none;
    }
  }
</style>
