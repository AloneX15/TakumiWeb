<script lang="ts">
  import { enhance } from '$app/forms';
  import { ROLE_LABELS } from '$lib/format';
  import { USERNAME_RULE } from '$lib/validation';

  let { form } = $props();
</script>

<div class="page-head">
  <a class="small muted" href="/admin/usuarios">← Usuarios</a>
  <h1>Crear usuario</h1>
  <p class="muted">La cuenta podrá iniciar sesión en la web y en el launcher de inmediato.</p>
</div>

<form method="POST" class="card stack narrow" use:enhance={() => ({ update }) => update({ reset: false })}>
  {#if form?.error}<div class="alert error">{form.error}</div>{/if}
  <label class="field">
    <span>Nombre de usuario</span>
    <input name="username" value={form?.values?.username ?? ''} maxlength="16" required />
    <small class="muted">{USERNAME_RULE}</small>
  </label>
  <label class="field">
    <span>Correo electrónico</span>
    <input name="email" type="email" value={form?.values?.email ?? ''} required />
  </label>
  <label class="field">
    <span>Contraseña inicial</span>
    <input name="password" type="password" autocomplete="new-password" minlength="8" required />
    <small class="muted">Compártela con la persona por un canal seguro; podrá cambiarla en «Mi cuenta».</small>
  </label>
  <label class="field">
    <span>Rol</span>
    <select name="role" value={form?.values?.role ?? 'user'}>
      {#each Object.entries(ROLE_LABELS) as [value, label]}
        <option {value}>{label}</option>
      {/each}
    </select>
  </label>
  <div class="row">
    <div class="spacer"></div>
    <button class="primary">Crear usuario</button>
  </div>
</form>

<style>
  .narrow {
    max-width: 560px;
  }

  small {
    font-size: 12px;
  }
</style>
