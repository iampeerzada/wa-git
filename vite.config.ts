import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/wa/', // CRITICAL: This ensures all assets (JS, CSS, Images) are loaded from https://ifastx.in/wa/ instead of the root.
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
  },
  server: {
    port: 3000,
    strictPort: true,
  }
});
