import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      // Proxy WebSocket connections to backend during development
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps to reduce build complexity
    minify: false, // Disable minification to avoid esbuild Go runtime bugs in Docker buildx
    cssMinify: false, // Disable CSS minification to avoid esbuild issues
  },
});
