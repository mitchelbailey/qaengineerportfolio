import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * Unit and component tests only — the base of the pyramid.
 *
 * Deliberately a separate config from vite.config.ts: pulling in the Cloudflare
 * plugin here would boot a Worker runtime that these tests have no use for.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolvePath('./app'),
      '@shared': resolvePath('./shared'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./app/test-setup.ts'],
    include: ['app/**/*.test.{ts,tsx}', 'shared/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['app/**/*.{ts,tsx}', 'shared/**/*.ts'],
      exclude: ['app/**/*.test.{ts,tsx}', 'app/main.tsx', 'shared/**/*.test.ts'],
    },
  },
});
