import { defineConfig } from 'vite';
export default defineConfig({ base: './', build: { outDir: 'dist', chunkSizeWarningLimit: 1500 }, test: { include: ['tests/**/*.test.js'] } });
