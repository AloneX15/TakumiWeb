/**
 * Rules for paths inside a private instance's game folder. Shared by the browser (file manager) and the
 * server, and mirrored by the launcher (`private_instances.rs`), which re-checks every path before writing.
 * Messages are user-facing (Spanish).
 */

export const MAX_PATH_LENGTH = 512;

/** Folders the organizer can lock: the launcher removes any file in them that is not in the manifest. */
export const LOCKABLE_DIRS = ['mods', 'resourcepacks', 'shaderpacks', 'config', 'datapacks'] as const;
export type LockableDir = (typeof LOCKABLE_DIRS)[number];

export const LOADERS = ['vanilla', 'fabric', 'forge', 'neoforge', 'quilt'] as const;
export const LOADER_LABELS: Record<(typeof LOADERS)[number], string> = {
  vanilla: 'Vanilla',
  fabric: 'Fabric',
  forge: 'Forge',
  neoforge: 'NeoForge',
  quilt: 'Quilt',
};

/** Programs that have no business in a Minecraft folder. Jars are allowed: mods are jars. */
const BLOCKED_EXTENSIONS = new Set(['exe', 'bat', 'cmd', 'com', 'ps1', 'psm1', 'vbs', 'vbe', 'msi', 'scr', 'lnk', 'sh', 'reg', 'hta']);

/** Files that can be edited as text in the browser. */
const TEXT_EXTENSIONS = new Set([
  'json',
  'json5',
  'toml',
  'properties',
  'txt',
  'cfg',
  'conf',
  'yml',
  'yaml',
  'ini',
  'mcmeta',
  'md',
  'snbt',
  'js',
  'zs',
  'mcfunction',
]);

const RESERVED_NAMES = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
// eslint-disable-next-line no-control-regex
const BAD_CHARS = /[<>:"|?*\u0000-\u001f]/;

/**
 * Normalizes a relative path ("mods\\a.jar", "./mods/a.jar" → "mods/a.jar"). Returns null when it is not a
 * safe relative path on every OS: absolute, "..", empty segments, characters Windows rejects, reserved
 * device names, or segments ending in a dot or a space.
 */
export function normalizePath(raw: string): string | null {
  let value = raw.replace(/\\/g, '/').trim();
  while (value.startsWith('./')) value = value.slice(2);
  if (!value || value.length > MAX_PATH_LENGTH || value.startsWith('/') || /^[a-z]:/i.test(value)) return null;
  const segments = value.split('/');
  for (const segment of segments) {
    if (!segment || segment === '.' || segment === '..' || segment.length > 255) return null;
    if (BAD_CHARS.test(segment) || RESERVED_NAMES.test(segment) || /[. ]$/.test(segment)) return null;
  }
  return segments.join('/');
}

/** Normalizes a folder path; "" is the root. */
export function normalizeDir(raw: string): string | null {
  const trimmed = raw.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  return trimmed === '' ? '' : normalizePath(trimmed);
}

export function extension(path: string) {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** Error message when the file cannot be stored in an instance, null when it can. */
export function checkFilePath(raw: string): string | null {
  const path = normalizePath(raw);
  if (!path) return `Ruta no válida: «${raw.slice(0, 80)}».`;
  if (BLOCKED_EXTENSIONS.has(extension(path))) return `No se permiten archivos .${extension(path)} (${path}).`;
  return null;
}

export function isTextFile(path: string) {
  return TEXT_EXTENSIONS.has(extension(path));
}

/**
 * Player settings are only copied the first time, so players keep their own keybinds and video options.
 * Everything else is enforced (overwritten when it differs).
 */
export function defaultPolicy(path: string): 'enforced' | 'default' {
  return /^(options|optionsof|optionsshaders)\.txt$/i.test(path) ? 'default' : 'enforced';
}

/** Resource packs can be swapped while playing; anything else (mods, configs, loader) needs a restart. */
export function needsRestart(path: string) {
  return !path.startsWith('resourcepacks/');
}

/** Top folder of a path ("mods/a.jar" → "mods", "options.txt" → ""). */
export function topDir(path: string) {
  const slash = path.indexOf('/');
  return slash === -1 ? '' : path.slice(0, slash);
}

export function parentDir(path: string) {
  const slash = path.lastIndexOf('/');
  return slash === -1 ? '' : path.slice(0, slash);
}

export function baseName(path: string) {
  return path.slice(path.lastIndexOf('/') + 1);
}

export function joinPath(dir: string, name: string) {
  return dir ? `${dir}/${name}` : name;
}

/** The folders and files directly inside `dir`, given every file path of the instance. Folders first. */
export function listDir<T extends { path: string }>(files: T[], dir: string) {
  const prefix = dir ? `${dir}/` : '';
  const dirs = new Map<string, number>();
  const entries: (T & { name: string })[] = [];
  for (const file of files) {
    if (!file.path.startsWith(prefix)) continue;
    const rest = file.path.slice(prefix.length);
    const slash = rest.indexOf('/');
    if (slash === -1) entries.push({ ...file, name: rest });
    else {
      const name = rest.slice(0, slash);
      dirs.set(name, (dirs.get(name) ?? 0) + 1);
    }
  }
  const folders = [...dirs.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, path: joinPath(dir, name), count }));
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return { folders, files: entries };
}
