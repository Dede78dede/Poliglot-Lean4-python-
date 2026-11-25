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
    include: [
      'tests/unit/**/*.test.{ts,tsx}',
      'tests/integration/**/*.test.{ts,tsx}',
      'tests/property/**/*.test.{ts,tsx}',
      'tests/when-operators.test.ts',
      'tests/phase-14/suite-177-testing-discipline.test.ts',
    ],
    exclude: ['node_modules', 'dist', 'src/archive', 'tests/negative'],
    testTimeout: 20000,
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.{ts,tsx}', 'server/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts', 'src/archive/**'],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
});
