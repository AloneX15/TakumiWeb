import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  // Fixed port: local launcher builds expect the website at http://localhost:5173.
  server: { port: 5173, strictPort: true },
  test: { include: ['src/**/*.test.ts'] },
});
