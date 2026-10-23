import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist', target: 'es2022', chunkSizeWarningLimit: 700,
    rollupOptions: { output: { manualChunks(id) { if (id.includes('node_modules/three/build')) return 'three-core'; } } },
  },
  test: { include: ['tests/**/*.test.js'] },
});
