<script lang="ts">
  import { enhance } from '$app/forms';
  import InstanceForm from '$lib/components/InstanceForm.svelte';

  let { data, form } = $props();

  function gateConfig(key: string) {
    return JSON.stringify({ config_version: 1, api_url: data.apiOrigin, server_key: key, enabled: true }, null, 2);
  }
</script>

<section class="card">
  <InstanceForm
    values={data.instance}
    action="?/save"
    submitLabel="Guardar ajustes"
    error={form?.action === 'save' && 'error' in form ? form.error : null}
    success={form?.action === 'save' && 'success' in form ? form.success : null}
  />
</section>

<section class="card stack gate">
  <h3>Servidor del evento (Takumi Gate)</h3>
  <p class="muted small">
    Instala el mod <strong>Takumi Gate</strong> en el servidor de Minecraft del evento y súbelo también a la carpeta
    <code>mods/</code> de esta instancia. Con la clave, el servidor solo deja entrar a miembros que lancen desde Takumi
    Launcher con la versión publicada, avisa a los conectados cuando publicas una versión que pide reiniciar y expulsa al
    acabar el tiempo de gracia a quien siga con la anterior.
  </p>
  {#if form?.action === 'gate' && form && 'gateKey' in form}
    <div class="alert success stack">
      <span>Copia ahora la configuración del servidor: la clave no se volverá a mostrar.</span>
      <pre class="config">{gateConfig(form.gateKey ?? "")}</pre>
      <span class="small">Guárdala en <code>config/takumi_gate.json</code> del servidor y reinícialo.</span>
    </div>
  {:else if form?.action === 'gate' && form && 'success' in form}
    <div class="alert success">{form.success}</div>
  {/if}
  <p class="small">
    Estado:
    {#if data.gate.configured}<span class="badge success">Clave activa …{data.gate.hint}</span>{:else}<span class="badge"
        >Sin servidor configurado</span
      >{/if}
  </p>
  <div class="row">
    <form method="POST" action="?/gateKey" use:enhance>
      <button class="solid">{data.gate.configured ? 'Generar clave nueva' : 'Generar clave de servidor'}</button>
    </form>
    {#if data.gate.configured}
      <form method="POST" action="?/gateRevoke" use:enhance>
        <button class="danger">Revocar clave</button>
      </form>
    {/if}
  </div>
  {#if data.gate.configured}
    <p class="muted small">Generar una clave nueva invalida la anterior: actualiza también el servidor.</p>
  {/if}
</section>

{#if data.isOwner}
  <section class="card danger-zone stack">
    <h3>Eliminar instancia</h3>
    <p class="muted small">
      Se borran sus archivos, versiones, miembros e invitaciones. Los jugadores dejarán de verla en el launcher. No se
      puede deshacer.
    </p>
    {#if form?.action === 'delete' && 'error' in form}<div class="alert error">{form.error}</div>{/if}
    <form method="POST" action="?/delete" class="row" use:enhance>
      <input name="confirm" placeholder="Escribe «{data.instance.name}» para confirmar" class="confirm" autocomplete="off" />
      <button class="danger solid">Eliminar para siempre</button>
    </form>
  </section>
{/if}

<style>
  .gate {
    margin-top: 16px;
  }

  .config {
    user-select: all;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
  }

  .danger-zone {
    margin-top: 16px;
    border-color: rgba(255, 92, 108, 0.3);
  }

  .confirm {
    flex: 1;
    min-width: 240px;
  }
</style>
