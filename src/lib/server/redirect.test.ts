import { describe, expect, it } from 'vitest';
import { safeNext } from './redirect';

describe('safeNext', () => {
  it('keeps same-site paths with query and hash', () => {
    expect(safeNext('/cuenta')).toBe('/cuenta');
    expect(safeNext('/cuenta?x=1')).toBe('/cuenta?x=1');
    expect(safeNext('/noticias/hola#comentarios')).toBe('/noticias/hola#comentarios');
    expect(safeNext('/admin/usuarios?q=a%20b')).toBe('/admin/usuarios?q=a%20b');
  });

  it('falls back to / for missing or relative values', () => {
    expect(safeNext(null)).toBe('/');
    expect(safeNext('')).toBe('/');
    expect(safeNext('cuenta')).toBe('/');
    expect(safeNext('https://evil.example/')).toBe('/');
  });

  it('rejects anything a browser would send to another origin', () => {
    for (const value of [
      '//evil.example',
      '/\\evil.example',
      '/\t/evil.example',
      '/\t\\evil.example',
      '/\n/evil.example',
      '/\r/evil.example',
      '/ /evil.example',
      '/%09/evil.example/x'.replace('%09', '\t'),
      '/..//evil.example',
      '/.//evil.example',
      '/a/..//evil.example',
    ]) {
      expect(safeNext(value), JSON.stringify(value)).toBe('/');
    }
  });

  it('never returns a value that resolves off-site', () => {
    const base = 'https://takumilabs.org/login';
    for (const value of ['/\t/evil.example', '//evil.example', '/./\t/x', '/..//evil.example']) {
      expect(new URL(safeNext(value), base).origin).toBe('https://takumilabs.org');
    }
  });
});
