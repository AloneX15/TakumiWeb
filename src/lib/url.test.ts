import { describe, expect, it } from 'vitest';
import { checkUrl } from './validation';

describe('checkUrl', () => {
  it('accepts https and local http', () => {
    expect(checkUrl('https://github.com/AloneX15/x/releases/download/v1/a.exe', 'x')).toBeNull();
    expect(checkUrl('http://localhost:5173/a.exe', 'x')).toBeNull();
    expect(checkUrl('http://127.0.0.1/a.exe', 'x')).toBeNull();
    expect(checkUrl(null, 'x')).toBeNull();
  });

  it('rejects plain http on the internet and other schemes', () => {
    expect(checkUrl('http://example.com/a.exe', 'x')).toMatch(/https/);
    expect(checkUrl('javascript:alert(1)', 'x')).not.toBeNull();
    expect(checkUrl('file:///C:/a.exe', 'x')).not.toBeNull();
    expect(checkUrl('not a url', 'x')).toMatch(/no válida/);
  });
});
