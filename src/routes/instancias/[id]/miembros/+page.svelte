<script lang="ts">
  import { enhance } from '$app/forms';
  import { formatDate, formatDateTime } from '$lib/format';

  let { data, form } = $props();
  const ROLE = { owner: 'Propietario', manager: 'Gestor', member: 'Miembro' } as const;
  let copied = $state(false);

  function message(action: string) {
    if (form?.action !== action) return null;
    return 'error' in form && form.error
      ? { kind: 'error', text: form.error }
      : 'success' in form && form.success
        ? { kind: 'success', text: form.success }
        : null;
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  const keep = () => ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
</script>

<div class="grid-2">
  <section class="card stack">
    <h3>Añadir miembro</h3>
    {#if message('add')}<div class="alert {message('add')?.kind}">{message('add')?.text}</div>{/if}
    <form method="POST" action="?/add" class="stack" use:enhance>
      <label class="field">
        <span>Usuario o correo de su cuenta Takumi</span>
        <input name="login" required maxlength="254" autocomplete="off" />
      </label>
      <label class="field">
        <span>Rol</span>
        <select name="role">
          <option value="member">Miembro: descargar y jugar</option>
          {#if data.isOwner}
            <option value="manager">Gestor: archivos, miembros y publicar</option>
            <option value="owner">Propietario: todo</option>
          {/if}
        </select>
      </label>
      <div><button class="primary">Añadir</button></div>
    </form>
  </section>

  <section class="card stack">
    <h3>Enlace de invitación</h3>
    <p class="muted small">
      Quien abra el enlace con su cuenta Takumi se une tras confirmar. También se puede pegar en el launcher.
    </p>
    {#if message('invite')}<div class="alert {message('invite')?.kind}">{message('invite')?.text}</div>{/if}
    {#if form?.action === 'invite' && 'link' in form && form.link}
      <div class="alert success stack">
        <span>Enlace creado. Cópialo ahora: por seguridad no se puede volver a mostrar.</span>
        <div class="row link-row">
          <input readonly value={form.link} onfocus={(e) => e.currentTarget.select()} />
          <button type="button" onclick={() => copy(String(form?.link))}>{copied ? 'Copiado' : 'Copiar'}</button>
        </div>
      </div>
    {/if}
    <form method="POST" action="?/invite" class="stack" use:enhance={keep}>
      <div class="row">
        <label class="field grow">
          <span>Rol</span>
          <select name="role">
            <option value="member">Miembro</option>
            {#if data.isOwner}<option value="manager">Gestor</option>{/if}
          </select>
        </label>
        <label class="field grow">
          <span>Usos máximos</span>
          <input name="maxUses" type="number" min="0" max="10000" placeholder="Ilimitados" />
        </label>
        <label class="field grow">
          <span>Caduca en (días)</span>
          <input name="expiresInDays" type="number" min="0" max="365" value="7" />
        </label>
      </div>
      <div><button>Crear enlace</button></div>
    </form>
  </section>
</div>

<section class="card block">
  <h3>Miembros ({data.members.length})</h3>
  {#if message('members')}<div class="alert {message('members')?.kind}">{message('members')?.text}</div>{/if}
  <div class="table-wrap">
    <table>
      <thead><tr><th>Usuario</th><th>Rol</th><th>Desde</th><th></th></tr></thead>
      <tbody>
        {#each data.members as member (member.userId)}
          {@const editable = data.isOwner || member.role === 'member'}
          <tr>
            <td>
              <strong>{member.username}</strong>
              {#if member.userId === data.me}<span class="badge">Tú</span>{/if}
              {#if member.banned}<span class="badge danger">Suspendido</span>{/if}
              <div class="muted small">{member.email}</div>
            </td>
            <td>
              {#if editable && member.userId !== data.me}
                <form method="POST" action="?/role" use:enhance>
                  <input type="hidden" name="userId" value={member.userId} />
                  <select name="role" value={member.role} onchange={(e) => e.currentTarget.form?.requestSubmit()}>
                    <option value="member">Miembro</option>
                    {#if data.isOwner}
                      <option value="manager">Gestor</option>
                      <option value="owner">Propietario</option>
                    {/if}
                  </select>
                </form>
              {:else}
                <span class="badge" class:accent={member.role !== 'member'}>{ROLE[member.role]}</span>
              {/if}
            </td>
            <td class="muted small">{formatDate(member.createdAt)}</td>
            <td class="end">
              {#if editable && member.userId !== data.me}
                <form method="POST" action="?/remove" use:enhance>
                  <input type="hidden" name="userId" value={member.userId} />
                  <button class="ghost danger">Expulsar</button>
                </form>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<section class="card block">
  <h3>Invitaciones</h3>
  {#if message('invites')}<div class="alert {message('invites')?.kind}">{message('invites')?.text}</div>{/if}
  {#if data.invites.length}
    <div class="table-wrap">
      <table>
        <thead><tr><th>Rol</th><th>Usos</th><th>Caduca</th><th>Creada</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {#each data.invites as invite (invite.id)}
            <tr>
              <td>{ROLE[invite.role]}</td>
              <td>{invite.uses} / {invite.maxUses ?? '∞'}</td>
              <td class="muted small">{invite.expiresAt ? formatDateTime(invite.expiresAt) : 'Nunca'}</td>
              <td class="muted small">{formatDate(invite.createdAt)} · {invite.createdBy ?? '—'}</td>
              <td>
                {#if invite.active}
                  <span class="badge success">Activa</span>
                {:else if invite.revokedAt}
                  <span class="badge danger">Revocada</span>
                {:else}
                  <span class="badge">Agotada o caducada</span>
                {/if}
              </td>
              <td class="end">
                {#if invite.active}
                  <form method="POST" action="?/revoke" use:enhance>
                    <input type="hidden" name="id" value={invite.id} />
                    <button class="ghost danger">Revocar</button>
                  </form>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p class="muted">No has creado ningún enlace.</p>
  {/if}
</section>

<style>
  h3 {
    margin-bottom: 4px;
  }

  .block {
    margin-top: 16px;
  }

  .block > .alert,
  .block > h3 {
    margin-bottom: 12px;
  }

  .grow {
    flex: 1;
    min-width: 120px;
  }

  .link-row {
    flex-wrap: nowrap;
  }

  .link-row input {
    flex: 1;
    font-family: ui-monospace, monospace;
    font-size: 13px;
  }

  .end {
    text-align: right;
  }

  td select {
    padding: 4px 8px;
    font-size: 13px;
  }
</style>
