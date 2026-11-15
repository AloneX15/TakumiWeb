<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import AuthCard from '$lib/components/AuthCard.svelte';

  let { form } = $props();
  let busy = $state(false);
  const registerHref = $derived(`/registro${page.url.search}`);
</script>

<svelte:head>
  <title>Iniciar sesión · Takumi Launcher</title>
</svelte:head>

<AuthCard title="Iniciar sesión" subtitle="Usa la misma cuenta que en el launcher.">
  <form
    method="POST"
    class="stack"
    use:enhance={() => {
      busy = true;
      return async ({ update }) => {
        await update({ reset: false });
        busy = false;
      };
    }}
  >
    {#if form?.error}<div class="alert error">{form.error}</div>{/if}
    <label class="field">
      <span>Usuario o correo</span>
      <input name="login" value={form?.login ?? ''} autocomplete="username" required />
    </label>
    <label class="field">
      <span>Contraseña</span>
      <input name="password" type="password" autocomplete="current-password" required />
    </label>
    <button class="primary wide" disabled={busy}>{busy ? 'Entrando…' : 'Iniciar sesión'}</button>
  </form>
  <p class="muted center">¿No tienes cuenta? <a href={registerHref}>Regístrate</a></p>
</AuthCard>

<style>
  .wide {
    width: 100%;
    padding: 11px;
  }

  .center {
    text-align: center;
    margin-top: 20px;
  }
</style>
