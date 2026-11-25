import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// SINGLE=1 inlines everything into one HTML file (used for shareable previews).
const single = process.env.SINGLE === '1';

export default defineConfig({
  base: './',
  plugins: [react(), ...(single ? [viteSingleFile()] : [])],
  build: {
    target: 'es2022',
    outDir: single ? 'dist-single' : 'dist',
    assetsInlineLimit: single ? 100_000_000 : 4096,
  },
});
