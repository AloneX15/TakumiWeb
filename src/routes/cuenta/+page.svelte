<script lang="ts">
  import { enhance } from '$app/forms';
  import { ROLE_LABELS, formatDate, formatDateTime } from '$lib/format';

  let { data, form } = $props();
  const user = $derived(data.user!);

  function message(action: string) {
    if (form?.action !== action) return null;
    return 'error' in form && form.error
      ? { kind: 'error', text: form.error }
      : { kind: 'success', text: 'success' in form ? form.success : '' };
  }

  function deviceName(label: string | null, kind: string) {
    if (kind === 'launcher') return label || 'Takumi Launcher';
    if (!label) return 'Navegador';
    const browser = /Edg\//.test(label)
      ? 'Edge'
      : /Firefox\//.test(label)
        ? 'Firefox'
        : /Chrome\//.test(label)
          ? 'Chrome'
          : /Safari\//.test(label)
            ? 'Safari'
            : 'Navegador';
    const os = /Windows/.test(label) ? 'Windows' : /Mac OS/.test(label) ? 'macOS' : /Android/.test(label) ? 'Android' : /Linux/.test(label) ? 'Linux' : /iPhone|iPad/.test(label) ? 'iOS' : '';
    return os ? `${browser} en ${os}` : browser;
  }
</script>

<svelte:head>
  <title>Mi cuenta · Takumi Launcher</title>
</svelte:head>

<div class="container page narrow">
  {#if data.welcome}
    <div class="card welcome">
      <h2>¡Bienvenido a Takumi, {user.username}!</h2>
      <p class="muted">
        Tu cuenta está lista. Descarga el launcher e inicia sesión con tu usuario o correo y tu contraseña.
      </p>
      <a class="btn primary" href="/descargas">Ir a descargas</a>
    </div>
  {/if}

  <div class="page-head">
    <h1>Mi cuenta</h1>
  </div>

  <section class="card profile">
    <div class="avatar">{user.username[0].toUpperCase()}</div>
    <div>
      <h2>{user.username}</h2>
      <p class="muted small">{user.email}</p>
    </div>
    <div class="spacer"></div>
    <div class="meta small muted">
      <span class="badge" class:accent={user.role !== 'user'}>{ROLE_LABELS[user.role]}</span>
      <span>Miembro desde {formatDate(data.profile?.createdAt)}</span>
    </div>
  </section>

  <div class="grid-2">
    <section class="card">
      <h3>Correo electrónico</h3>
      <form method="POST" action="?/email" class="stack" use:enhance={() => ({ update }) => update({ reset: false })}>
        {#if message('email')}<div class="alert {message('email')?.kind}">{message('email')?.text}</div>{/if}
        <label class="field">
          <span>Nuevo correo</span>
          <input name="email" type="email" value={user.email} required />
        </label>
        <label class="field">
          <span>Contraseña actual</span>
          <input name="password" type="password" autocomplete="current-password" required />
        </label>
        <button>Guardar correo</button>
      </form>
    </section>

    <section class="card">
      <h3>Contraseña</h3>
      <form method="POST" action="?/password" class="stack" use:enhance>
        {#if message('password')}<div class="alert {message('password')?.kind}">{message('password')?.text}</div>{/if}
        <label class="field">
          <span>Contraseña actual</span>
          <input name="current" type="password" autocomplete="current-password" required />
        </label>
        <label class="field">
          <span>Nueva contraseña</span>
          <input name="new" type="password" autocomplete="new-password" minlength="8" required />
        </label>
        <label class="field">
          <span>Repite la nueva contraseña</span>
          <input name="confirm" type="password" autocomplete="new-password" minlength="8" required />
        </label>
        <button>Cambiar contraseña</button>
      </form>
    </section>
  </div>

  <section class="card sessions">
    <div class="row">
      <div>
        <h3>Sesiones abiertas</h3>
        <p class="muted small">Navegadores y launchers donde has iniciado sesión con esta cuenta.</p>
      </div>
      <div class="spacer"></div>
      {#if data.sessions.length > 1}
        <form method="POST" action="?/revokeOthers" use:enhance>
          <button class="danger">Cerrar las demás</button>
        </form>
      {/if}
    </div>
    {#if message('sessions')}<div class="alert {message('sessions')?.kind}">{message('sessions')?.text}</div>{/if}
    <ul>
      {#each data.sessions as session (session.id)}
        <li class="row">
          <span class="badge" class:accent={session.kind === 'launcher'}>
            {session.kind === 'launcher' ? 'Launcher' : 'Web'}
          </span>
          <div>
            <div>{deviceName(session.label, session.kind)}</div>
            <div class="muted small">Último uso: {formatDateTime(session.lastUsedAt)}</div>
          </div>
          <div class="spacer"></div>
          {#if session.current}
            <span class="badge success">Esta sesión</span>
          {:else}
            <form method="POST" action="?/revoke" use:enhance>
              <input type="hidden" name="id" value={session.id} />
              <button class="ghost danger">Cerrar</button>
            </form>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
</div>

<style>
  .narrow {
    max-width: 900px;
  }

  .welcome {
    margin-bottom: 28px;
    border-color: var(--accent);
    background: radial-gradient(ellipse at 100% 0%, var(--accent-soft), transparent 60%), var(--surface);
  }

  .welcome p {
    margin: 6px 0 16px;
  }

  .profile {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .avatar {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    background: linear-gradient(145deg, var(--accent-hover), var(--accent-deep));
    color: #fff;
    display: grid;
    place-items: center;
    font-size: 24px;
    font-weight: 800;
  }

  .meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }

  section h3 {
    margin-bottom: 14px;
  }

  .sessions {
    margin-top: 16px;
  }

  .sessions h3 {
    margin-bottom: 2px;
  }

  .sessions .alert {
    margin-top: 14px;
  }

  ul {
    list-style: none;
    padding: 0;
    margin-top: 14px;
  }

  li {
    padding: 12px 0;
    border-top: 1px solid var(--border);
    flex-wrap: nowrap;
  }
</style>
