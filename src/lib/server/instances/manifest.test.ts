import { generateKeyPairSync, sign, verify } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildManifest, diffFiles, parseManifest, restartRequired, type ManifestFile } from './manifest';

const file = (path: string, sha = 'a'.repeat(64), policy: ManifestFile['policy'] = 'enforced'): ManifestFile => ({
  path,
  sha256: sha,
  size: 10,
  policy,
});

const base = {
  instance: '00000000-0000-0000-0000-000000000001',
  name: 'Evento',
  version: 1,
  minecraft: '1.21.1',
  loader: 'fabric',
  loader_version: null,
  server: 'play.example.com',
  locked_dirs: ['mods', 'config', 'mods'],
  restart_required: true,
  grace_minutes: 5,
  published_at: '2026-11-15T00:00:00.000Z',
};

describe('buildManifest', () => {
  it('is deterministic: sorted files and locked dirs, no extra fields', () => {
    const a = buildManifest({ ...base, files: [file('mods/b.jar'), file('config/a.json')] });
    const b = buildManifest({ ...base, files: [file('config/a.json'), { ...file('mods/b.jar'), extra: 1 } as ManifestFile] });
    expect(a).toBe(b);
    const parsed = parseManifest(a);
    expect(parsed.format).toBe(1);
    expect(parsed.files.map((f) => f.path)).toEqual(['config/a.json', 'mods/b.jar']);
    expect(parsed.locked_dirs).toEqual(['config', 'mods']);
  });

  it('round-trips through an Ed25519 signature on the exact text', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    const text = buildManifest({ ...base, files: [file('mods/a.jar')] });
    const signature = sign(null, Buffer.from(text), privateKey);
    expect(verify(null, Buffer.from(text), publicKey, signature)).toBe(true);
    expect(verify(null, Buffer.from(text.replace('Evento', 'Evento2')), publicKey, signature)).toBe(false);
  });
});

describe('diffFiles', () => {
  it('finds added, changed and removed paths', () => {
    const before = [file('mods/a.jar'), file('mods/b.jar'), file('options.txt')];
    const after = [file('mods/a.jar', 'b'.repeat(64)), file('options.txt', 'a'.repeat(64), 'default'), file('mods/c.jar')];
    expect(diffFiles(before, after)).toEqual({
      added: ['mods/c.jar'],
      changed: ['mods/a.jar', 'options.txt'],
      removed: ['mods/b.jar'],
    });
  });
});

describe('restartRequired', () => {
  const settings = { minecraft: '1.21.1', loader: 'fabric', loader_version: null, locked_dirs: ['mods'] };
  const none = { added: [], changed: [], removed: [] };

  it('always restarts on the first publish', () => {
    expect(restartRequired(none, null, settings)).toBe(true);
  });

  it('resource pack changes apply live', () => {
    expect(restartRequired({ ...none, added: ['resourcepacks/p.zip'] }, settings, settings)).toBe(false);
  });

  it('mods, configs and loader changes need a restart', () => {
    expect(restartRequired({ ...none, removed: ['mods/a.jar'] }, settings, settings)).toBe(true);
    expect(restartRequired({ ...none, changed: ['config/x.json'] }, settings, settings)).toBe(true);
    expect(restartRequired(none, settings, { ...settings, loader_version: '0.16.9' })).toBe(true);
    expect(restartRequired(none, settings, { ...settings, locked_dirs: ['mods', 'config'] })).toBe(true);
  });
});
