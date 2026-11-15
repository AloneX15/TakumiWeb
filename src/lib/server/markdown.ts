import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const marked = new Marked({ gfm: true, breaks: false });

/** Markdown -> sanitized HTML. Safe to render with {@html}. */
export function renderMarkdown(source: string): string {
  const html = marked.parse(source, { async: false });
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'del', 'details', 'summary']),
    allowedAttributes: {
      // target/rel are only set by transformTags below (sanitize-html filters after transforming).
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      code: ['class'],
      th: ['align'],
      td: ['align'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: (tagName, { target: _target, rel: _rel, ...attribs }) => {
        const external = /^https?:\/\//.test(attribs.href ?? '');
        return {
          tagName,
          attribs: external ? { ...attribs, target: '_blank', rel: 'noopener noreferrer' } : attribs,
        };
      },
      img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy' } }),
    },
    allowedSchemesAppliedToAttributes: ['href', 'src'],
  });
}
