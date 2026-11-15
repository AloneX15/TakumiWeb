import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders markdown', () => {
    expect(renderMarkdown('# Hola\n\n**negrita**')).toContain('<strong>negrita</strong>');
  });

  it('strips scripts and javascript links', () => {
    const html = renderMarkdown('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toMatch(/href="javascript/i);
    expect(renderMarkdown('<a href="javascript:alert(1)" target="_top">x</a>')).not.toMatch(/javascript|_top/);
  });

  it('opens external links in a new tab', () => {
    expect(renderMarkdown('[web](https://takumilabs.org)')).toContain('rel="noopener noreferrer"');
  });

  it('keeps relative links but drops protocol-relative ones', () => {
    expect(renderMarkdown('[descargas](/descargas)')).toContain('href="/descargas"');
    expect(renderMarkdown('[x](//evil.example/a)')).not.toContain('evil.example');
  });

  it('only allows https images', () => {
    expect(renderMarkdown('![a](https://cdn.example/a.png)')).toContain('src="https://cdn.example/a.png"');
    expect(renderMarkdown('![a](http://cdn.example/a.png)')).not.toContain('http://cdn.example');
  });
});
