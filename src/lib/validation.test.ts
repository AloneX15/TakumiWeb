import { describe, expect, it } from 'vitest';
import { checkEmail, checkPassword, checkUsername, checkVersion, compareVersions, slugify } from './validation';

describe('validation', () => {
  it('usernames', () => {
    expect(checkUsername('Steve_01')).toBeNull();
    expect(checkUsername('ab')).not.toBeNull();
    expect(checkUsername('con espacio')).not.toBeNull();
    expect(checkUsername('a'.repeat(17))).not.toBeNull();
  });

  it('emails and passwords', () => {
    expect(checkEmail('steve@takumilabs.org')).toBeNull();
    expect(checkEmail('steve@')).not.toBeNull();
    expect(checkPassword('12345678')).toBeNull();
    expect(checkPassword('1234567')).not.toBeNull();
  });

  it('slugify', () => {
    expect(slugify('¡Nueva versión 1.2: Forge y más!')).toBe('nueva-version-1-2-forge-y-mas');
  });

  it('versions', () => {
    expect(checkVersion('1.2.3')).toBeNull();
    expect(checkVersion('1.2.3-beta.1')).toBeNull();
    expect(checkVersion('1.2')).not.toBeNull();
    expect(compareVersions('0.2.0', '0.1.9')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.0-beta.2', '1.0.0')).toBeLessThan(0);
    expect(compareVersions('1.0.0-beta.10', '1.0.0-beta.2')).toBeGreaterThan(0);
    expect(compareVersions('0.10.0', '0.9.0')).toBeGreaterThan(0);
  });
});
