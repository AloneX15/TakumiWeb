import { describe, expect, it } from 'vitest';
import { checkFilePath, defaultPolicy, listDir, needsRestart, normalizeDir, normalizePath } from './instance-paths';

describe('normalizePath', () => {
  it('normalizes separators and leading ./', () => {
    expect(normalizePath('mods\\sodium.jar')).toBe('mods/sodium.jar');
    expect(normalizePath('./config/a.json')).toBe('config/a.json');
  });

  it.each([
    '',
    '/etc/passwd',
    'C:/Windows/x',
    '../x',
    'mods/../../x',
    'mods//a.jar',
    'mods/./a.jar',
    'mods/a.jar.',
    'mods /a.jar',
    'mods/CON',
    'mods/nul.txt',
    'mods/a:b.jar',
    'mods/a?.jar',
    'mods/a\u0000.jar',
    'a'.repeat(513),
  ])('rejects %j', (value) => {
    expect(normalizePath(value)).toBeNull();
  });
});

describe('normalizeDir', () => {
  it('accepts the root and strips slashes', () => {
    expect(normalizeDir('')).toBe('');
    expect(normalizeDir('/mods/')).toBe('mods');
    expect(normalizeDir('../x')).toBeNull();
  });
});

describe('checkFilePath', () => {
  it('allows jars and configs but not programs', () => {
    expect(checkFilePath('mods/a.jar')).toBeNull();
    expect(checkFilePath('config/a.toml')).toBeNull();
    expect(checkFilePath('run.bat')).toMatch(/\.bat/);
    expect(checkFilePath('tools/x.EXE')).toMatch(/\.exe/);
  });
});

describe('policies', () => {
  it('copies player options only once', () => {
    expect(defaultPolicy('options.txt')).toBe('default');
    expect(defaultPolicy('config/options.txt')).toBe('enforced');
    expect(defaultPolicy('mods/a.jar')).toBe('enforced');
  });

  it('only resource packs avoid a restart', () => {
    expect(needsRestart('resourcepacks/pack.zip')).toBe(false);
    expect(needsRestart('mods/a.jar')).toBe(true);
    expect(needsRestart('config/a.json')).toBe(true);
  });
});

describe('listDir', () => {
  const files = [{ path: 'mods/a.jar' }, { path: 'mods/b.jar' }, { path: 'config/x/y.json' }, { path: 'options.txt' }];

  it('lists folders with counts, then files', () => {
    const root = listDir(files, '');
    expect(root.folders).toEqual([
      { name: 'config', path: 'config', count: 1 },
      { name: 'mods', path: 'mods', count: 2 },
    ]);
    expect(root.files.map((f) => f.name)).toEqual(['options.txt']);
  });

  it('lists a nested folder', () => {
    expect(listDir(files, 'config').folders).toEqual([{ name: 'x', path: 'config/x', count: 1 }]);
    expect(listDir(files, 'mods').files.map((f) => f.path)).toEqual(['mods/a.jar', 'mods/b.jar']);
  });
});
