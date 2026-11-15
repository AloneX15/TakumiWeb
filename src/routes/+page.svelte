<script lang="ts">
  import { onMount } from 'svelte';
  import Logo from '$lib/components/Logo.svelte';
  import PostCard from '$lib/components/PostCard.svelte';
  import { formatBytes, formatDate } from '$lib/format';

  let { data } = $props();
  let home: HTMLDivElement;
  let sceneHost: HTMLDivElement;

  onMount(() => {
    let disposed = false;
    let cleanup = () => {};
    // Keep animation libraries out of the server render and load them on demand.
    async function animate() {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'), import('gsap/ScrollTrigger'),
      ]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);
      const media = gsap.matchMedia();
      cleanup = () => media.revert();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const intro = gsap.timeline({ defaults: { duration: 0.85, ease: 'power3.out' } });
        intro.from('.copy > *', { y: 28, autoAlpha: 0, stagger: 0.1 })
          .from('.fox', { scale: 0.8, rotation: -9, autoAlpha: 0, duration: 1.3 }, 0.15)
          .from('.orbit-ring', { scale: 0.7, autoAlpha: 0, stagger: 0.15 }, 0.3);
        gsap.to('.art-depth', {
          y: 110, rotation: 8, ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.2 },
        });
        gsap.to('.glow', { scale: 1.3, opacity: 0.4, duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        gsap.utils.toArray<HTMLElement>('[data-reveal]', home).forEach((element) => {
          gsap.from(element, {
            y: 36, autoAlpha: 0, duration: 0.8, ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 94%', once: true },
          });
        });
        gsap.fromTo('.scroll-progress', { scaleX: 0 }, {
          scaleX: 1, ease: 'none',
          scrollTrigger: { trigger: home, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
        });
      }, home);
      // Three.js is only needed for the desktop hero, which is hidden on mobile.
      const { createHeroScene } = await import('$lib/components/hero-scene');
      if (disposed) return;
      media.add('(min-width: 821px) and (prefers-reduced-motion: no-preference)', () => {
        const progress = { value: 0 };
        const destroy = createHeroScene(sceneHost, progress);
        gsap.to(progress, {
          value: 1, ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 },
        });
        return destroy;
      }, home);
    }
    void animate().catch((error) => console.warn('No se pudieron cargar las animaciones', error));
    return () => { disposed = true; cleanup(); };
  });

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

<div class="home" bind:this={home}>
<div class="scroll-progress" aria-hidden="true"></div>
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
      <div class="scene" bind:this={sceneHost}></div>
      <div class="art-depth">
      <div class="glow"></div>
      <div class="orbit-ring"></div>
      <div class="orbit-ring secondary"></div>
      <div class="fox"><Logo size={260} /></div>
      </div>
    </div>
  </div>
</section>

<section class="container features">
  {#each FEATURES as feature, index}
    <div class="feature-reveal" data-reveal>
    <div class="card feature">
      <span class="feature-number" aria-hidden="true">0{index + 1}</span>
      <h3>{feature.title}</h3>
      <p class="muted">{feature.text}</p>
    </div>
    </div>
  {/each}
</section>

<section class="container news">
  <div class="row head" data-reveal>
    <h2>Últimas noticias</h2>
    <div class="spacer"></div>
    <a href="/noticias">Ver todas →</a>
  </div>
  {#if data.posts.length}
    <div class="posts">
      {#each data.posts as post (post.id)}
        <div data-reveal><PostCard {post} /></div>
      {/each}
    </div>
  {:else}
    <div class="card empty" data-reveal>Todavía no hay noticias publicadas.</div>
  {/if}
</section>
</div>

<style>
  .home { overflow: clip; }
  .scroll-progress {
    position: fixed;
    top: 64px;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, var(--accent-deep), var(--accent-hover));
    transform: scaleX(0);
    transform-origin: left;
    z-index: 21;
    pointer-events: none;
  }
  .scene { position: absolute; inset: -70px; pointer-events: none; }
  .scene :global(canvas) { display: block; }
  .art-depth { position: relative; display: grid; place-items: center; width: 100%; height: 360px; }
  .fox { position: relative; filter: drop-shadow(0 20px 35px rgba(220, 20, 60, 0.2)); }
  .orbit-ring {
    position: absolute;
    width: 340px;
    height: 340px;
    border: 1px solid rgba(240, 42, 82, 0.25);
    border-radius: 50%;
    transform: rotateX(55deg) rotate(-25deg);
  }
  .orbit-ring.secondary { width: 420px; height: 420px; transform: rotateY(55deg) rotate(30deg); opacity: 0.5; }
  .feature-reveal { min-width: 0; }
  .feature { position: relative; height: 100%; overflow: hidden; }
  .feature-number { display: block; margin-bottom: 18px; color: var(--accent-hover); font: 12px monospace; letter-spacing: 0.15em; }
  @media (prefers-reduced-motion: no-preference) {
    .feature { transition: border-color 0.3s, background 0.3s, transform 0.3s, box-shadow 0.3s; }
    .feature:hover { transform: translateY(-6px); border-color: var(--accent-deep); background: linear-gradient(145deg, var(--surface), var(--accent-soft)); box-shadow: 0 18px 36px #0003; }
    .actions .btn { transition: transform 0.25s, box-shadow 0.25s; }
    .actions .btn:hover { transform: translateY(-3px); box-shadow: 0 8px 30px var(--accent-soft); }
  }
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
