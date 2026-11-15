<script lang="ts">
  import { enhance } from '$app/forms';
  import { LOADER_LABELS } from '$lib/instance-paths';

  let { data, form } = $props();
  const ROLE = { owner: 'propietario', manager: 'gestor', member: 'miembro' } as const;
</script>

<svelte:head>
  <title>Invitación · {data.instance.name} · Takumi</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="container page narrow">
  <div class="card stack">
    <p class="muted small">Invitación a una instancia privada</p>
    <h1>{data.instance.name}</h1>
    <p class="muted">
      {LOADER_LABELS[data.instance.loader]}
      {data.instance.minecraftVersion}{#if data.instance.owner}&nbsp;· organizada por <strong>{data.instance.owner}</strong>{/if}
    </p>
    {#if data.instance.description}<p class="desc">{data.instance.description}</p>{/if}

    {#if form?.error}<div class="alert error">{form.error}</div>{/if}

    {#if data.member}
      <div class="alert success">Ya eres miembro de esta instancia.</div>
      <a class="btn primary" href="/instancias/{data.instance.id}">Ir a la instancia</a>
    {:else if data.problem}
      <div class="alert error">{data.problem}</div>
      <p class="muted small">Pide al organizador un enlace nuevo.</p>
    {:else}
      <p>Te unirás como <strong>{ROLE[data.role]}</strong>. Después aparecerá en Takumi Launcher, en <em>Instancias → Privadas</em>.</p>
      <form method="POST" use:enhance>
        <button class="primary large">Unirme</button>
      </form>
    {/if}
  </div>
</div>

<style>
  .narrow {
    max-width: 560px;
  }

  .desc {
    white-space: pre-line;
  }
</style>
