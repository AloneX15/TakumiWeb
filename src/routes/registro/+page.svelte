<script lang="ts">
  import { enhance } from '$app/forms';
  import AuthCard from '$lib/components/AuthCard.svelte';
  import { USERNAME_RULE } from '$lib/validation';

  let { form } = $props();
  let busy = $state(false);
</script>

<svelte:head>
  <title>Crear cuenta · Takumi Launcher</title>
</svelte:head>

<AuthCard title="Crear cuenta" subtitle="Con tu cuenta de Takumi inicias sesión en el launcher y en la web.">
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
      <span>Nombre de usuario (tu nombre en Minecraft)</span>
      <input
        name="username"
        value={form?.username ?? ''}
        autocomplete="username"
        minlength="3"
        maxlength="16"
        pattern="[A-Za-z0-9_]+"
        title={USERNAME_RULE}
        required
      />
      <small class="muted">
        {USERNAME_RULE} Si no tienes Minecraft premium, jugarás con este nombre en Takumi Launcher. No se puede cambiar
        después.
      </small>
    </label>
    <label class="field">
      <span>Correo electrónico</span>
      <input name="email" type="email" value={form?.email ?? ''} autocomplete="email" required />
    </label>
    <label class="field">
      <span>Contraseña</span>
      <input name="password" type="password" autocomplete="new-password" minlength="8" required />
    </label>
    <label class="field">
      <span>Repite la contraseña</span>
      <input name="confirm" type="password" autocomplete="new-password" minlength="8" required />
    </label>
    <label class="check small">
      <input type="checkbox" name="terms" required />
      <span>Acepto las condiciones de uso y la política de privacidad.</span>
    </label>
    <button class="primary wide" disabled={busy}>{busy ? 'Creando cuenta…' : 'Crear cuenta'}</button>
  </form>
  <p class="muted center">¿Ya tienes cuenta? <a href="/login">Inicia sesión</a></p>
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

  small {
    font-size: 12px;
  }
</style>
