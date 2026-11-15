<script lang="ts">
  import { enhance } from '$app/forms';
  import { formatDateTime } from '$lib/format';

  let { data, form } = $props();
  const pending = $derived(data.pending);
  const changes = $derived(
    pending ? pending.diff.added.length + pending.diff.changed.length + pending.diff.removed.length : 0,
  );
  let showDiff = $state(false);
  let confirmLeave = $state(false);

  const ACTIONS: Record<string, string> = {
    create: 'creó la instancia',
    settings: 'cambió los ajustes',
    publish: 'publicó',
    'file.add': 'subió',
    'file.update': 'actualizó',
    'file.delete': 'borró',
    'file.move': 'movió',
    'file.policy': 'cambió la política de',
    'member.add': 'añadió a',
    'member.role': 'cambió el rol de',
    'member.remove': 'expulsó a',
    'member.leave': 'salió',
    'member.join': 'se unió',
    'invite.create': 'creó una invitación',
    'invite.revoke': 'revocó una invitación',
  };
</script>

{#if data.published && !form}
  <div class="alert success top">Versión {data.published} publicada. Los launchers la descargarán antes de jugar.</div>
{/if}

<div class="layout">
  <div class="stack">
    {#if data.instance.description}
      <section class="card">
        <p class="desc">{data.instance.description}</p>
      </section>
    {/if}

    <section class="card">
      <h3>Cómo jugar</h3>
      <ol class="steps">
        <li>Abre <strong>Takumi Launcher</strong> con tu cuenta Takumi.</li>
        <li>En <em>Instancias</em>, esta instancia aparece en el apartado <em>Privadas</em>.</li>
        <li>Pulsa <strong>Jugar</strong>: el launcher descarga o actualiza los archivos y abre el juego.</li>
      </ol>
      {#if !data.instance.currentVersion}
        <p class="muted small">Aún no hay ninguna versión publicada; el organizador tiene que publicarla primero.</p>
      {/if}
    </section>

    {#if pending}
      <section class="card">
        <div class="row">
          <h3>Publicar</h3>
          <span class="spacer"></span>
          {#if data.instance.dirty || !data.instance.currentVersion}
            <span class="badge warning">{changes} cambios de archivos</span>
          {:else}
            <span class="badge success">Todo publicado</span>
          {/if}
        </div>
        {#if form?.action === 'publish' && form.error}<div class="alert error">{form.error}</div>{/if}

        {#if changes}
          <button class="link small" onclick={() => (showDiff = !showDiff)}>{showDiff ? 'Ocultar' : 'Ver'} cambios</button>
          {#if showDiff}
            <ul class="diff small">
              {#each pending.diff.added as path}<li class="add">+ {path}</li>{/each}
              {#each pending.diff.changed as path}<li class="chg">~ {path}</li>{/each}
              {#each pending.diff.removed as path}<li class="del">− {path}</li>{/each}
            </ul>
          {/if}
        {/if}

        <p class="muted small">
          {#if pending.restartRequired}
            Estos cambios <strong>requieren reiniciar el juego</strong>: nadie podrá jugar sin actualizar, y a quien esté
            jugando se le avisará para que reinicie.
          {:else}
            Solo cambian packs de texturas: se pueden aplicar sin reiniciar.
          {/if}
        </p>

        <form method="POST" action="?/publish" class="stack" use:enhance>
          <label class="field">
            <span>Notas de la versión (opcional)</span>
            <input name="notes" maxlength="500" placeholder="Añadido el mapa de la segunda fase" />
          </label>
          <div class="row">
            <label class="field grace">
              <span>Período de gracia para quien esté jugando</span>
              <select name="graceMinutes">
                <option value="0">Inmediato</option>
                <option value="5" selected>5 minutos</option>
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="60">1 hora</option>
              </select>
            </label>
            <label class="check small">
              <input type="checkbox" name="forceRestart" />
              <span>Forzar reinicio aunque no haga falta</span>
            </label>
          </div>
          <div><button class="primary">Publicar versión {data.instance.currentVersion + 1}</button></div>
        </form>
      </section>
    {/if}

    <section class="card">
      <h3>Historial de versiones</h3>
      {#if data.releases.length}
        <ul class="list">
          {#each data.releases as release (release.version)}
            <li>
              <div class="row">
                <strong>v{release.version}</strong>
                {#if release.restartRequired}
                  <span class="badge warning">Reinicio</span>
                {:else}
                  <span class="badge">En caliente</span>
                {/if}
                <span class="spacer"></span>
                <span class="muted small">{formatDateTime(release.createdAt)} · {release.publishedBy ?? '—'}</span>
              </div>
              {#if release.notes}<p class="small">{release.notes}</p>{/if}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="muted">Nada publicado todavía.</p>
      {/if}
    </section>
  </div>

  <aside class="stack">
    {#if data.log.length}
      <section class="card">
        <h3>Actividad</h3>
        <ul class="log small">
          {#each data.log as entry (entry.id)}
            <li>
              <strong>{entry.username ?? '—'}</strong>
              {ACTIONS[entry.action] ?? entry.action}
              {#if entry.detail}<span class="detail">{entry.detail}</span>{/if}
              <div class="muted">{formatDateTime(entry.createdAt)}</div>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if data.memberRole}
      <section class="card">
        <h3>Salir de la instancia</h3>
        {#if form?.action === 'leave' && form.error}<div class="alert error">{form.error}</div>{/if}
        <p class="muted small">Dejarás de verla en el launcher. Necesitarás otra invitación para volver.</p>
        {#if confirmLeave}
          <form method="POST" action="?/leave" class="row" use:enhance>
            <button class="danger solid">Sí, salir</button>
            <button type="button" onclick={() => (confirmLeave = false)}>Cancelar</button>
          </form>
        {:else}
          <button class="danger" onclick={() => (confirmLeave = true)}>Salir</button>
        {/if}
      </section>
    {/if}
  </aside>
</div>

<style>
  .top {
    margin-bottom: 16px;
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 16px;
    align-items: start;
  }

  section h3 {
    margin-bottom: 10px;
  }

  section > :global(* + *) {
    margin-top: 10px;
  }

  .desc {
    white-space: pre-line;
  }

  .steps {
    padding-left: 20px;
  }

  .diff {
    list-style: none;
    padding: 8px 10px;
    background: var(--surface-2);
    border-radius: 8px;
    max-height: 260px;
    overflow: auto;
    font-family: ui-monospace, monospace;
  }

  .add {
    color: #4ade80;
  }

  .chg {
    color: #facc15;
  }

  .del {
    color: #f87171;
  }

  .grace {
    min-width: 240px;
  }

  .list,
  .log {
    list-style: none;
    padding: 0;
  }

  .list li,
  .log li {
    padding: 8px 0;
    border-top: 1px solid var(--border);
  }

  .detail {
    word-break: break-all;
  }

  @media (max-width: 900px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
</style>
