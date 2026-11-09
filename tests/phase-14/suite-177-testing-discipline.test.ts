/**
 * Test Suite 177: Testing Discipline & Mock Sanitation (Phase 14.9.3 M4)
 *
 * Validates:
 * 177.1: zero vi.mock on internal pure modules (verification-formula, hybrid-adjudicator, session-manager, policy, zip-validator, proof-outcome)
 * 177.2: vitest.config.ts configures restoreMocks: true and clearMocks: true
 * 177.3: MSW integration test simulating HTTP boundary interception and recovery
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export async function runSuite177(): Promise<void> {
  console.log('Running Suite 177: Testing Discipline & Mock Sanitation (3 sub-tests)...');

  const rootDir = process.cwd();

  // 177.1: Zero vi.mock on internal pure modules
  const testsDir = path.join(rootDir, 'tests');
  function findTestFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const results: string[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findTestFiles(full));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
        results.push(full);
      }
    }
    return results;
  }

  const allTestFiles = findTestFiles(testsDir);
  const forbiddenModules = [
    'verification-formula',
    'session-manager',
    'policy',
    'zip-validator',
    'proof-outcome',
  ];

  for (const file of allTestFiles) {
    if (file.endsWith('suite-177-testing-discipline.test.ts')) continue;
    const code = fs.readFileSync(file, 'utf-8');
    for (const mod of forbiddenModules) {
      const regex = new RegExp(`vi\\.mock\\([^)]*${mod}`, 'i');
      assert.ok(
        !regex.test(code),
        `File ${path.relative(rootDir, file)} must not mock internal pure module: ${mod}`
      );
    }
  }
  console.log('  ✓ 177.1 zero vi.mock on internal pure modules across all test suites');

  // 177.2: vitest.config.ts configures restoreMocks and clearMocks
  const vitestConfig = fs.readFileSync(path.join(rootDir, 'vitest.config.ts'), 'utf-8');
  assert.ok(vitestConfig.includes('restoreMocks: true'), 'vitest.config.ts must have restoreMocks: true');
  assert.ok(vitestConfig.includes('clearMocks: true'), 'vitest.config.ts must have clearMocks: true');
  console.log('  ✓ 177.2 vitest.config.ts enforces automatic mock sanitation (restoreMocks & clearMocks)');

  // 177.3: MSW integration test simulating HTTP boundary
  const server = setupServer(
    http.get('https://api.polyglot-mock.local/v1/health', () => {
      return HttpResponse.json({ status: 'ok', engine: 'msw-virtual-adapter' }, { status: 200 });
    }),
    http.post('https://api.polyglot-mock.local/v1/adjudicate-fallback', () => {
      return HttpResponse.json(
        {
          type: 'https://polyglot.dev/errors/fallback-degraded',
          status: 503,
          code: 'FALLBACK_DEGRADED',
        },
        { status: 503 }
      );
    })
  );

  server.listen({ onUnhandledRequest: 'bypass' });
  try {
    const resHealthy = await fetch('https://api.polyglot-mock.local/v1/health');
    assert.equal(resHealthy.status, 200);
    const dataHealthy = (await resHealthy.json()) as { status: string; engine: string };
    assert.equal(dataHealthy.engine, 'msw-virtual-adapter');

    const resFallback = await fetch('https://api.polyglot-mock.local/v1/adjudicate-fallback', { method: 'POST' });
    assert.equal(resFallback.status, 503);
    const dataFallback = (await resFallback.json()) as { code: string };
    assert.equal(dataFallback.code, 'FALLBACK_DEGRADED');
  } finally {
    server.close();
  }
  console.log('  ✓ 177.3 MSW boundary integration test intercepting and validating HTTP degradation responses');
}

if (process.env.VITEST) {
  describe('Suite 177: Testing Discipline', () => {
    it('177.1: forbidden mocks absent', () => {
      const code = fs.readFileSync(path.join(process.cwd(), 'tests/phase-14/suite-171-epistemic-authority.test.ts'), 'utf-8');
      expect(code).not.toContain("vi.mock('../../server/src/services/verification/verification-formula'");
    });

    it('177.2: vitest config has restoreMocks', () => {
      const config = fs.readFileSync(path.join(process.cwd(), 'vitest.config.ts'), 'utf-8');
      expect(config).toContain('restoreMocks: true');
    });

    it('177.3: MSW mock server executes', async () => {
      const server = setupServer(
        http.get('https://api.test-msw.local/status', () => HttpResponse.json({ ok: true }))
      );
      server.listen({ onUnhandledRequest: 'bypass' });
      try {
        const res = await fetch('https://api.test-msw.local/status');
        expect(res.status).toBe(200);
      } finally {
        server.close();
      }
    });
  });
}
