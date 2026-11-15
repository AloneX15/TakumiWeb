<script lang="ts">
  import Logo from '$lib/components/Logo.svelte';
  import PostCard from '$lib/components/PostCard.svelte';
  import { formatBytes, formatDate } from '$lib/format';

  let { data } = $props();

  const FEATURES = [
    {
      title: 'Instancias independientes',
      text: 'Cada instancia con sus mundos, mods, memoria, Java y argumentos propios. Duplícalas en un clic.',
    },
    {
      title: 'Todos los loaders',
      text: 'Vanilla (incluidas las versiones antiguas), Fabric, Quilt, Forge y NeoForge.',
    },
    {
      title: 'Mods de Modrinth',
      text: 'Busca e instala mods, resource packs y shaders con sus dependencias. Actualízalos desde el launcher.',
    },
    {
      title: 'Modpacks',
      text: 'Instala modpacks de Modrinth desde el buscador integrado o importa un archivo .mrpack.',
    },
    {
      title: 'Java automático',
      text: 'Descarga el Java exacto que necesita cada versión. Sin instalar nada a mano.',
    },
    {
      title: 'Rápido y seguro',
      text: 'Hecho en Rust. Descargas en paralelo verificadas y credenciales guardadas en el sistema.',
    },
  ];
</script>

<svelte:head>
  <title>Takumi Launcher · Launcher de Minecraft</title>
</svelte:head>

<section class="hero">
  <div class="container hero-inner">
    <div class="copy">
      <span class="badge accent">Launcher de Minecraft</span>
      <h1>Juega a Minecraft a tu manera, <span class="hl">sin complicaciones.</span></h1>
      <p class="lead muted">
        Takumi Launcher instala versiones, loaders, mods y modpacks por ti. Rápido, ligero y pensado para que solo
        tengas que darle a jugar.
      </p>
      <div class="row actions">
        {#if data.release}
          <a class="btn primary large" href="/descargas/{data.release.version}/descargar" data-sveltekit-reload>
            Descargar para Windows
          </a>
          <span class="muted small">
            v{data.release.version} · {formatDate(data.release.publishedAt)}
            {#if data.release.fileSize}· {formatBytes(data.release.fileSize)}{/if}
          </span>
        {:else}
          <a class="btn primary large" href="/descargas">Descargas</a>
          <span class="muted small">Muy pronto disponible.</span>
        {/if}
      </div>
      <p class="muted small account-hint">
        Necesitas una cuenta de Takumi para usar el launcher. <a href="/registro">Crea la tuya gratis</a>.
      </p>
    </div>
    <div class="art" aria-hidden="true">
      <div class="glow"></div>
      <Logo size={300} />
    </div>
  </div>
</section>

<section class="container features">
  {#each FEATURES as feature}
    <div class="card feature">
      <h3>{feature.title}</h3>
      <p class="muted">{feature.text}</p>
    </div>
  {/each}
</section>

<section class="container news">
  <div class="row head">
    <h2>Últimas noticias</h2>
    <div class="spacer"></div>
    <a href="/noticias">Ver todas →</a>
  </div>
  {#if data.posts.length}
    <div class="posts">
      {#each data.posts as post (post.id)}
        <PostCard {post} />
      {/each}
    </div>
  {:else}
    <div class="card empty">Todavía no hay noticias publicadas.</div>
  {/if}
</section>

<style>
  .hero {
    position: relative;
    overflow: hidden;
    border-bottom: 1px solid var(--border);
    background: radial-gradient(ellipse at 75% 30%, var(--accent-soft), transparent 55%);
  }

  .hero-inner {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    align-items: center;
    gap: 40px;
    padding-top: 72px;
    padding-bottom: 72px;
  }

  h1 {
    font-size: clamp(32px, 5vw, 50px);
    margin: 16px 0;
  }

  .hl {
    background: linear-gradient(90deg, var(--accent-hover), var(--accent));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .lead {
    font-size: 18px;
    max-width: 540px;
  }

  .actions {
    margin-top: 28px;
    gap: 16px;
  }

  .account-hint {
    margin-top: 18px;
  }

  .art {
    position: relative;
    display: grid;
    place-items: center;
  }

  .glow {
    position: absolute;
    width: 320px;
    height: 320px;
    border-radius: 50%;
    background: var(--accent);
    filter: blur(110px);
    opacity: 0.25;
  }

  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
    padding-top: 56px;
  }

  .feature h3 {
    margin-bottom: 6px;
  }

  .feature p {
    font-size: 14px;
  }

  .news {
    padding-top: 56px;
  }

  .head {
    margin-bottom: 18px;
  }

  .posts {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 18px;
  }

  @media (max-width: 820px) {
    .hero-inner {
      grid-template-columns: 1fr;
      padding-top: 48px;
      padding-bottom: 48px;
    }

    .art {
      display: none;
    }
  }
</style>
