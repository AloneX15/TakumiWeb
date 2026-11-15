import { needsRestart } from '$lib/instance-paths';

/**
 * The manifest the launcher downloads: exactly what the game folder must contain for one published version.
 * It is serialized once, signed, and stored as text so the bytes the launcher verifies never change.
 * Keep in sync with `PrivateManifest` in the launcher (`private_instances.rs`).
 */
export type ManifestFile = { path: string; sha256: string; size: number; policy: 'enforced' | 'default' };

export type Manifest = {
  format: 1;
  instance: string;
  name: string;
  version: number;
  minecraft: string;
  loader: string;
  loader_version: string | null;
  server: string | null;
  locked_dirs: string[];
  restart_required: boolean;
  grace_minutes: number;
  published_at: string;
  files: ManifestFile[];
};

export type ManifestInput = Omit<Manifest, 'format' | 'files' | 'locked_dirs'> & {
  files: ManifestFile[];
  locked_dirs: string[];
};

export function buildManifest(input: ManifestInput): string {
  const manifest: Manifest = {
    format: 1,
    instance: input.instance,
    name: input.name,
    version: input.version,
    minecraft: input.minecraft,
    loader: input.loader,
    loader_version: input.loader_version,
    server: input.server,
    locked_dirs: [...new Set(input.locked_dirs)].sort(),
    restart_required: input.restart_required,
    grace_minutes: input.grace_minutes,
    published_at: input.published_at,
    files: input.files
      .map(({ path, sha256, size, policy }) => ({ path, sha256, size, policy }))
      .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
  };
  return JSON.stringify(manifest);
}

export function parseManifest(text: string): Manifest {
  return JSON.parse(text) as Manifest;
}

export type FileDiff = { added: string[]; changed: string[]; removed: string[] };

export function diffFiles(previous: ManifestFile[], next: ManifestFile[]): FileDiff {
  const before = new Map(previous.map((f) => [f.path, f]));
  const after = new Map(next.map((f) => [f.path, f]));
  const added: string[] = [];
  const changed: string[] = [];
  const removed: string[] = [];
  for (const [path, file] of after) {
    const old = before.get(path);
    if (!old) added.push(path);
    else if (old.sha256 !== file.sha256 || old.policy !== file.policy) changed.push(path);
  }
  for (const path of before.keys()) if (!after.has(path)) removed.push(path);
  return { added: added.sort(), changed: changed.sort(), removed: removed.sort() };
}

type Settings = { minecraft: string; loader: string; loader_version: string | null; locked_dirs: string[] };

/**
 * A restart is needed unless only resource packs changed: those are swapped in game. Any change to the
 * loader, the game version or the locked folders also needs one.
 */
export function restartRequired(diff: FileDiff, before: Settings | null, after: Settings) {
  if (!before) return true;
  if (
    before.minecraft !== after.minecraft ||
    before.loader !== after.loader ||
    before.loader_version !== after.loader_version ||
    [...before.locked_dirs].sort().join() !== [...after.locked_dirs].sort().join()
  ) {
    return true;
  }
  return [...diff.added, ...diff.changed, ...diff.removed].some(needsRestart);
}
