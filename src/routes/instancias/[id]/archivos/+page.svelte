<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/state';
  import { formatBytes, formatDateTime } from '$lib/format';
  import { checkFilePath, isTextFile, joinPath, listDir, normalizeDir, normalizePath, parentDir } from '$lib/instance-paths';

  let { data, form } = $props();

  const base = $derived(`/instancias/${data.instance.id}/archivos`);
  const dir = $derived(normalizeDir(page.url.searchParams.get('dir') ?? '') ?? '');
  const listing = $derived(listDir(data.files, dir));
  const crumbs = $derived(dir ? dir.split('/').map((name, i, all) => ({ name, path: all.slice(0, i + 1).join('/') })) : []);
  const locked = $derived(data.instance.lockedDirs.includes(dir.split('/')[0]));
  const usedPct = $derived(Math.min(100, (data.used / data.instance.quotaBytes) * 100));

  type Job = { path: string; file: File; progress: number; error?: string; done?: boolean };
  let jobs = $state<Job[]>([]);
  let uploading = $state(false);
  let dragging = $state(false);
  let renaming = $state<string | null>(null);
  let confirmDelete = $state<string | null>(null);

  function open(path: string) {
    goto(`${base}?dir=${encodeURIComponent(path)}`, { keepFocus: true, noScroll: true });
  }

  function newFolder() {
    const name = prompt('Nombre de la carpeta');
    if (!name) return;
    const path = normalizePath(joinPath(dir, name.trim()));
    if (!path) return alert('Nombre no válido.');
    // Folders only exist through their files: open the empty folder so the next upload goes there.
    open(path);
  }

  function newTextFile() {
    const name = prompt('Nombre del archivo (p. ej. config/evento.json)');
    if (!name) return;
    const path = joinPath(dir, name.trim());
    const problem = checkFilePath(path);
    if (problem) return alert(problem);
    if (!isTextFile(path)) return alert('Solo se pueden crear archivos de texto (.json, .toml, .txt, .properties…).');
    goto(`${base}/editar?path=${encodeURIComponent(normalizePath(path)!)}`);
  }

  function enqueue(items: { path: string; file: File }[]) {
    const fresh: Job[] = items.map(({ path, file }) => {
      const full = joinPath(dir, path);
      return { path: normalizePath(full) ?? full, file, progress: 0, error: checkFilePath(full) ?? undefined };
    });
    jobs = [...jobs.filter((j) => !j.done && !j.error), ...fresh];
    void run();
  }

  async function run() {
    if (uploading) return;
    uploading = true;
    for (const job of jobs) {
      if (job.done || job.error) continue;
      try {
        await upload(job);
        job.done = true;
      } catch (err) {
        job.error = (err as Error).message;
      }
    }
    uploading = false;
    await invalidateAll();
  }

  function upload(job: Job) {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', `${base}/subir?path=${encodeURIComponent(job.path)}`);
      xhr.setRequestHeader('content-type', 'application/octet-stream');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) job.progress = e.loaded / e.total;
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) return resolve();
        let message = `Error ${xhr.status}`;
        try {
          message = JSON.parse(xhr.responseText).error ?? message;
        } catch {
          /* not JSON */
        }
        reject(new Error(message));
      };
      xhr.onerror = () => reject(new Error('Se ha cortado la conexión.'));
      xhr.send(job.file);
    });
  }

  function pickFiles(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = [...(input.files ?? [])];
    // A folder pick keeps the folder name: "pack/assets/…".
    enqueue(files.map((file) => ({ path: file.webkitRelativePath || file.name, file })));
    input.value = '';
  }

  async function drop(event: DragEvent) {
    event.preventDefault();
    dragging = false;
    const entries = [...(event.dataTransfer?.items ?? [])]
      .map((item) => item.webkitGetAsEntry?.())
      .filter((entry): entry is FileSystemEntry => !!entry);
    const found: { path: string; file: File }[] = [];
    await Promise.all(entries.map((entry) => walk(entry, '', found)));
    enqueue(found);
  }

  async function walk(entry: FileSystemEntry, prefix: string, out: { path: string; file: File }[]): Promise<void> {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
      out.push({ path: prefix + entry.name, file });
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
        if (!batch.length) break;
        await Promise.all(batch.map((child) => walk(child, `${prefix}${entry.name}/`, out)));
      }
    }
  }

  const pendingJobs = $derived(jobs.filter((j) => !j.done && !j.error).length);
  const failedJobs = $derived(jobs.filter((j) => j.error));
</script>

<div class="toolbar row">
  <nav class="crumbs row">
    <a href={base} onclick={(e) => (e.preventDefault(), open(''))}>raíz</a>
    {#each crumbs as crumb}
      <span class="muted">/</span>
      <a href="{base}?dir={encodeURIComponent(crumb.path)}" onclick={(e) => (e.preventDefault(), open(crumb.path))}>{crumb.name}</a>
    {/each}
    {#if locked}<span class="badge warning" title="El launcher elimina lo que no esté aquí">Bloqueada</span>{/if}
  </nav>
  <span class="spacer"></span>
  <button onclick={newFolder}>Nueva carpeta</button>
  <button onclick={newTextFile}>Nuevo archivo</button>
  <label class="btn">
    Subir carpeta
    <input type="file" webkitdirectory multiple hidden onchange={pickFiles} />
  </label>
  <label class="btn primary">
    Subir archivos
    <input type="file" multiple hidden onchange={pickFiles} />
  </label>
</div>

<div class="quota small muted">
  <div class="bar"><div style="width: {usedPct}%"></div></div>
  {formatBytes(data.used) || '0 B'} de {formatBytes(data.instance.quotaBytes)} · {data.files.length} archivos
</div>

{#if form?.error}<div class="alert error">{form.error}</div>{/if}
{#if form?.success}<div class="alert success">{form.success} Recuerda publicar para que llegue a los jugadores.</div>{/if}

{#if jobs.length}
  <div class="card uploads small">
    <div class="row">
      <strong>{pendingJobs ? `Subiendo ${pendingJobs} archivos…` : 'Subida terminada'}</strong>
      <span class="spacer"></span>
      {#if !pendingJobs}<button class="ghost" onclick={() => (jobs = [])}>Cerrar</button>{/if}
    </div>
    {#each failedJobs as job}
      <div class="alert error">{job.path}: {job.error}</div>
    {/each}
    {#each jobs.filter((j) => !j.done && !j.error).slice(0, 8) as job}
      <div class="job row">
        <span class="name">{job.path}</span>
        <span class="spacer"></span>
        <div class="bar small-bar"><div style="width: {job.progress * 100}%"></div></div>
      </div>
    {/each}
  </div>
{/if}

<div
  class="card drop"
  class:dragging
  role="region"
  aria-label="Archivos de la instancia"
  ondragover={(e) => {
    e.preventDefault();
    dragging = true;
  }}
  ondragleave={() => (dragging = false)}
  ondrop={drop}
>
  {#if listing.folders.length || listing.files.length}
    <table>
      <thead>
        <tr><th>Nombre</th><th>Tamaño</th><th>Al actualizar</th><th>Modificado</th><th></th></tr>
      </thead>
      <tbody>
        {#if dir}
          <tr>
            <td colspan="5"><button class="link" onclick={() => open(parentDir(dir))}>↑ Subir un nivel</button></td>
          </tr>
        {/if}
        {#each listing.folders as folder (folder.path)}
          <tr>
            <td>
              <button class="link name-btn" onclick={() => open(folder.path)}>📁 {folder.name}</button>
              {#if !dir && data.instance.lockedDirs.includes(folder.name)}<span class="badge warning">Bloqueada</span>{/if}
            </td>
            <td class="muted">{folder.count} elem.</td>
            <td></td>
            <td></td>
            <td class="actions">{@render rowActions(folder.path, folder.name)}</td>
          </tr>
        {/each}
        {#each listing.files as file (file.path)}
          <tr>
            <td>
              {#if isTextFile(file.path)}
                <a href="{base}/editar?path={encodeURIComponent(file.path)}">📄 {file.name}</a>
              {:else}
                <span>📦 {file.name}</span>
              {/if}
            </td>
            <td class="muted">{formatBytes(file.size)}</td>
            <td>
              <form method="POST" action="?/policy" use:enhance>
                <input type="hidden" name="path" value={file.path} />
                <select
                  name="policy"
                  value={file.policy}
                  onchange={(e) => (e.currentTarget as HTMLSelectElement).form?.requestSubmit()}
                  title="Sobrescribir: siempre igual al de la instancia. Solo si falta: el jugador puede cambiarlo."
                >
                  <option value="enforced">Sobrescribir</option>
                  <option value="default">Solo si falta</option>
                </select>
              </form>
            </td>
            <td class="muted small">{formatDateTime(file.updatedAt)}</td>
            <td class="actions">
              <a class="btn ghost" href="{base}/descargar?path={encodeURIComponent(file.path)}" title="Descargar">⭳</a>
              {@render rowActions(file.path, file.name)}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p class="empty muted">
      {dir ? 'Carpeta vacía.' : 'La instancia está vacía.'} Arrastra aquí archivos o carpetas (por ejemplo tu carpeta
      <code>mods</code>) o usa los botones de arriba.
    </p>
  {/if}
</div>

{#snippet rowActions(path: string, name: string)}
  {#if renaming === path}
    <form method="POST" action="?/move" class="row inline" use:enhance={() => async ({ update }) => {
      await update();
      renaming = null;
    }}>
      <input type="hidden" name="from" value={path} />
      <input name="to" value={path} class="rename" />
      <button>Mover</button>
      <button type="button" class="ghost" onclick={() => (renaming = null)}>✕</button>
    </form>
  {:else if confirmDelete === path}
    <form method="POST" action="?/delete" class="row inline" use:enhance={() => async ({ update }) => {
      await update();
      confirmDelete = null;
    }}>
      <input type="hidden" name="path" value={path} />
      <button class="danger solid">Borrar {name}</button>
      <button type="button" class="ghost" onclick={() => (confirmDelete = null)}>✕</button>
    </form>
  {:else}
    <button class="ghost" onclick={() => (renaming = path)} title="Renombrar o mover">✎</button>
    <button class="ghost danger" onclick={() => (confirmDelete = path)} title="Borrar">🗑</button>
  {/if}
{/snippet}

<style>
  .toolbar {
    gap: 8px;
    margin-bottom: 10px;
  }

  .crumbs {
    gap: 6px;
    font-family: ui-monospace, monospace;
    font-size: 14px;
  }

  .quota {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }

  .bar {
    width: 160px;
    height: 6px;
    border-radius: 3px;
    background: var(--surface-2);
    overflow: hidden;
  }

  .bar > div {
    height: 100%;
    background: var(--accent);
  }

  .small-bar {
    width: 120px;
  }

  .alert {
    margin-bottom: 12px;
  }

  .uploads {
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .uploads .alert {
    margin: 0;
  }

  .job .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .drop {
    padding: 0;
    overflow-x: auto;
  }

  .drop.dragging {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  table {
    width: 100%;
  }

  .name-btn {
    font-weight: 500;
  }

  .actions {
    text-align: right;
    white-space: nowrap;
  }

  .actions :global(.btn),
  .actions button {
    padding: 4px 8px;
  }

  .inline {
    flex-wrap: nowrap;
    gap: 6px;
    justify-content: flex-end;
  }

  .rename {
    min-width: 260px;
  }

  td select {
    padding: 4px 8px;
    font-size: 13px;
  }

  .empty {
    padding: 40px 20px;
    text-align: center;
  }
</style>
