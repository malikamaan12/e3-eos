import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@e3-eos/domain': resolve(__dirname, 'packages/domain/src/index.ts'),
      '@e3-eos/policy': resolve(__dirname, 'packages/policy/src/index.ts'),
      '@e3-eos/contracts': resolve(__dirname, 'packages/contracts/src/index.ts'),
      '@e3-eos/db': resolve(__dirname, 'packages/db/src/index.ts'),
      '@e3-eos/test-fixtures': resolve(__dirname, 'packages/test-fixtures/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/*.{test,spec}.ts', 'apps/**/*.{test,spec}.ts', 'tests/**/*.{test,spec}.ts'],
  },
});
