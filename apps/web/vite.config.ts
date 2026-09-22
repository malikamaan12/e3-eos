import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@e3-eos/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
      '@e3-eos/domain': path.resolve(__dirname, '../../packages/domain/src'),
      '@e3-eos/policy': path.resolve(__dirname, '../../packages/policy/src'),
      '@e3-eos/test-fixtures': path.resolve(__dirname, '../../packages/test-fixtures/src'),
    },
  },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
