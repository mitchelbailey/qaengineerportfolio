import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { cloudflare } from '@cloudflare/vite-plugin';

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Runs the real Worker (Hono API + D1) inside the Vite dev server, so
    // `npm run dev` is byte-for-byte the same stack that gets deployed.
    cloudflare(),
  ],
  resolve: {
    alias: {
      '@': resolvePath('./app'),
      '@shared': resolvePath('./shared'),
      '@worker': resolvePath('./worker'),
      '@tests': resolvePath('./tests'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    sourcemap: true,
  },
});
