import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    dangerouslyIgnoreUnhandledErrors: false,
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'src/archive'],
    testTimeout: 20000,
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      thresholds: {
        'src/services/context/**': { lines: 95, branches: 90, functions: 95, statements: 95 },
        'src/services/when/**': { lines: 95, branches: 90, functions: 95, statements: 95 },
        'src/services/navigation/**': { lines: 90, branches: 85, functions: 90, statements: 90 },
        'src/components/navigation/**': { lines: 75, branches: 70, functions: 75, statements: 75 },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
});
