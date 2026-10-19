// Instruction: Import Vite configuration helpers and React plugin
// Logic: Configures Vite bundler for React SPA with Tailwind CSS v4 support
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Instruction: Export Vite configuration object
// Logic: Specifies build output, plugins, asset paths, and dev server options
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Instruction: Mount Tailwind CSS v4 compiler plugin
  ],
  base: './', // Instruction: Relative base path ensures assets load seamlessly across local dev, preview, and production hosts
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
  },
  server: {
    port: 3000,
    strictPort: true,
    host: '0.0.0.0', // Instruction: Bind dev server to 0.0.0.0 for container & preview proxy compatibility
  }
});
