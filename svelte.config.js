import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // Serve pre-compressed (brotli/gzip) JS and CSS.
    adapter: adapter({ precompress: true }),
    // Content-Security-Policy: a second layer behind the Markdown sanitizer. SvelteKit adds a
    // nonce/hash for its own inline bootstrap script, so no other script can run.
    csp: {
      mode: 'auto',
      directives: {
        'default-src': ['self'],
        'script-src': ['self'],
        // Svelte transitions and style attributes need inline styles; they cannot run code.
        'style-src': ['self', 'unsafe-inline'],
        // Post covers and images in posts are https URLs on any host.
        'img-src': ['self', 'data:', 'https:'],
        'font-src': ['self'],
        'connect-src': ['self'],
        'object-src': ['none'],
        'base-uri': ['self'],
        'form-action': ['self'],
        'frame-ancestors': ['none'],
      },
    },
  },
};
