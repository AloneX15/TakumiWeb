import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    // Serve pre-compressed (brotli/gzip) JS and CSS.
    adapter: adapter({ precompress: true }),
  },
};
