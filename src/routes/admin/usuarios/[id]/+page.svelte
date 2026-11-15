<script lang="ts">
  import { enhance } from '$app/forms';
  import { ROLE_LABELS, formatDate, formatDateTime } from '$lib/format';
  import { USERNAME_RULE } from '$lib/validation';

  let { data, form } = $props();
  const user = $derived(data.target);
  let confirmDelete = $state(false);

  function message(action: string) {
    if (form?.action !== action) return null;
    return 'error' in form && form.error
      ? { kind: 'error', text: form.error }
      : { kind: 'success', text: 'success' in form ? form.success : '' };
  }

  const keep = () => ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
</script>

<div class="page-head">
  <a class="small muted" href="/admin/usuarios">← Usuarios</a>
  <div class="row title">
    <h1>{user.username}</h1>
    <span class="badge" class:accent={user.role !== 'user'}>{ROLE_LABELS[user.role]}</span>
    {#if user.bannedAt}<span class="badge danger">Suspendido</span>{/if}
    {#if data.self}<span class="badge">Tú</span>{/if}
  </div>
  <p class="muted small">
    Registrado el {formatDate(user.createdAt)} · Último acceso: {formatDateTime(user.lastLoginAt)} · {data.postCount}
    publicaciones
  </p>
</div>

{#if data.created && !form}<div class="alert success top">Usuario creado.</div>{/if}

<div class="grid-2">
  <section class="card">
    <h3>Datos de la cuenta</h3>
    <form method="POST" action="?/profile" class="stack" use:enhance={keep}>
      {#if message('profile')}<div class="alert {message('profile')?.kind}">{message('profile')?.text}</div>{/if}
      <label class="field">
        <span>Nombre de usuario</span>
        <input name="username" value={user.username} maxlength="16" title={USERNAME_RULE} required />
      </label>
      <label class="field">
        <span>Correo electrónico</span>
        <input name="email" type="email" value={user.email} required />
      </label>
      <label class="field">
        <span>Rol</span>
        <select name="role" value={user.role} disabled={data.self}>
          {#each Object.entries(ROLE_LABELS) as [value, label]}
            <option {value}>{label}</option>
          {/each}
        </select>
        <small class="muted">Editor: noticias y versiones. Administrador: además, usuarios.</small>
      </label>
      <button>Guardar</button>
    </form>
  </section>

  <section class="card">
    <h3>Restablecer contraseña</h3>
    <form method="POST" action="?/password" class="stack" use:enhance>
      {#if message('password')}<div class="alert {message('password')?.kind}">{message('password')?.text}</div>{/if}
      <label class="field">
        <span>Nueva contraseña</span>
        <input name="password" type="password" autocomplete="new-password" minlength="8" required />
      </label>
      <label class="check small">
        <input type="checkbox" name="logout" checked />
        <span>Cerrar todas sus sesiones (web y launcher)</span>
      </label>
      <button>Cambiar contraseña</button>
    </form>
  </section>
</div>

<section class="card block">
  <h3>Sesiones abiertas ({data.sessions.length})</h3>
  {#if message('sessions')}<div class="alert {message('sessions')?.kind}">{message('sessions')?.text}</div>{/if}
  {#if data.sessions.length}
    <ul>
      {#each data.sessions as session (session.id)}
        <li class="row">
          <span class="badge" class:accent={session.kind === 'launcher'}>
            {session.kind === 'launcher' ? 'Launcher' : 'Web'}
          </span>
          <span class="label">{session.label ?? '—'}</span>
          <span class="spacer"></span>
          <span class="muted small">{formatDateTime(session.lastUsedAt)}</span>
          <form method="POST" action="?/revoke" use:enhance>
            <input type="hidden" name="id" value={session.id} />
            <button class="ghost danger">Cerrar</button>
          </form>
        </li>
      {/each}
    </ul>
    {#if !data.self}
      <form method="POST" action="?/revokeAll" use:enhance>
        <button class="danger">Cerrar todas</button>
      </form>
    {/if}
  {:else}
    <p class="muted">Sin sesiones abiertas.</p>
  {/if}
</section>

{#if !data.self}
  <section class="card block danger-zone">
    <h3>Suspensión</h3>
    {#if message('ban')}<div class="alert {message('ban')?.kind}">{message('ban')?.text}</div>{/if}
    {#if user.bannedAt}
      <p class="muted">
        Suspendida desde el {formatDateTime(user.bannedAt)}.{#if user.banReason}&nbsp;Motivo: {user.banReason}{/if}
      </p>
      <form method="POST" action="?/unban" use:enhance>
        <button>Retirar suspensión</button>
      </form>
    {:else}
      <p class="muted small">La cuenta no podrá entrar en la web ni en el launcher. Se cierran todas sus sesiones.</p>
      <form method="POST" action="?/ban" class="row" use:enhance>
        <input name="reason" placeholder="Motivo (se le muestra al intentar entrar)" maxlength="300" class="reason" />
        <button class="danger">Suspender</button>
      </form>
    {/if}
  </section>

  <section class="card block danger-zone">
    <h3>Eliminar cuenta</h3>
    {#if message('delete')}<div class="alert {message('delete')?.kind}">{message('delete')?.text}</div>{/if}
    <div class="row">
      <p class="muted small">Se borra la cuenta y sus sesiones. Sus publicaciones se conservan sin autor.</p>
      <div class="spacer"></div>
      {#if confirmDelete}
        <form method="POST" action="?/delete" use:enhance>
          <button class="danger solid">Sí, eliminar {user.username}</button>
        </form>
        <button onclick={() => (confirmDelete = false)}>Cancelar</button>
      {:else}
        <button class="danger" onclick={() => (confirmDelete = true)}>Eliminar cuenta</button>
      {/if}
    </div>
  </section>
{/if}

<style>
  .title {
    margin-top: 6px;
  }

  .top {
    margin-bottom: 16px;
  }

  section h3 {
    margin-bottom: 14px;
  }

  .block {
    margin-top: 16px;
  }

  .block > .alert,
  .block > p {
    margin-bottom: 12px;
  }

  small {
    font-size: 12px;
  }

  ul {
    list-style: none;
    padding: 0;
    margin-bottom: 14px;
  }

  li {
    padding: 8px 0;
    border-top: 1px solid var(--border);
    flex-wrap: nowrap;
  }

  .label {
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .danger-zone {
    border-color: rgba(255, 92, 108, 0.3);
  }

  .reason {
    flex: 1;
    min-width: 220px;
  }
</style>
