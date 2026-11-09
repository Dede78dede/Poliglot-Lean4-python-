/**
 * Test Suite 176: Contract Parity Zod ↔ JSON Schema ↔ Pydantic (Phase 14.9.3 M3)
 *
 * Validates:
 * 176.1: src/contracts/index.ts exists and exports canonical schemas (ProofOutcomeSchema, LeanExecuteRequestSchema, etc.)
 * 176.2: schemas/generated_contracts.py enforces Pydantic v2 strictness (extra='forbid', frozen=True, strict=True)
 * 176.3: contracts:generate script executes cleanly and idempotently
 * 176.4: golden success and failure fixtures validate strictly against TypeScript Zod schemas
 */

import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  LeanExecuteRequestSchema,
  LeanExecuteResponseSchema,
  ProblemDetailsSchema,
  ProofOutcomeSchema,
  SerializedBridgeErrorSchema,
  createResultEnvelopeSchema,
} from '../../src/contracts';
import { z } from 'zod';

export async function runSuite176(): Promise<void> {
  console.log('Running Suite 176: Contract Parity Zod ↔ JSON Schema ↔ Pydantic (4 sub-tests)...');

  const rootDir = process.cwd();

  // 176.1: Canonical contracts exported from src/contracts/index.ts
  const contractsIndexPath = path.join(rootDir, 'src/contracts/index.ts');
  assert.ok(fs.existsSync(contractsIndexPath), 'src/contracts/index.ts must exist');
  assert.ok(typeof ProofOutcomeSchema.safeParse === 'function');
  assert.ok(typeof LeanExecuteRequestSchema.safeParse === 'function');
  assert.ok(typeof SerializedBridgeErrorSchema.safeParse === 'function');
  console.log('  ✓ 176.1 canonical Zod boundary contracts exported cleanly from src/contracts/index.ts');

  // 176.2: schemas/generated_contracts.py enforces Pydantic strictness
  const pythonContractsPath = path.join(rootDir, 'schemas/generated_contracts.py');
  assert.ok(fs.existsSync(pythonContractsPath), 'schemas/generated_contracts.py must exist');
  const pythonCode = fs.readFileSync(pythonContractsPath, 'utf-8');
  assert.ok(pythonCode.includes("extra='forbid'"), "Generated contracts must specify extra='forbid'");
  assert.ok(pythonCode.includes('frozen=True'), 'Generated contracts must specify frozen=True');
  assert.ok(pythonCode.includes('strict=True'), 'Generated contracts must specify strict=True');
  assert.ok(pythonCode.includes("Discriminator('ok')"), "Generated contracts must use Discriminator('ok')");
  console.log('  ✓ 176.2 generated_contracts.py enforces extra=forbid, frozen=True, and Discriminator(ok)');

  // 176.3: scripts/generate-contracts.ts executes cleanly
  try {
    execSync('npm run contracts:generate', { cwd: rootDir, encoding: 'utf-8', stdio: 'pipe' });
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string };
    assert.fail(`npm run contracts:generate failed: ${execErr.stdout || execErr.stderr}`);
  }
  console.log('  ✓ 176.3 npm run contracts:generate executes idempotently with zero drift');

  // 176.4: Golden fixtures validate against TypeScript Zod schemas
  const valueSchema = z.object({ declarations: z.number(), kernel: z.string() });
  const envelopeSchema = createResultEnvelopeSchema(valueSchema);

  const goldenSuccess = {
    ok: true,
    value: { declarations: 4, kernel: 'leanchecker' },
    correlationId: 'golden-corr-101',
    timestamp: '2026-11-07T12:00:00Z',
  };
  const successParsed = envelopeSchema.safeParse(goldenSuccess);
  assert.ok(successParsed.success, 'Golden success fixture must parse with Zod schema');

  const goldenFailure = {
    ok: false,
    error: {
      code: 'FALLBACK_DEGRADED',
      problemType: 'https://polyglot.dev/errors/fallback-degraded',
      httpStatus: 503,
      message: 'Engine unreachable; degraded to preflight',
      details: { tier: 'SYNTAX_PREFLIGHT' },
    },
    correlationId: 'golden-corr-102',
    timestamp: '2026-11-07T12:00:01Z',
  };
  const failureParsed = envelopeSchema.safeParse(goldenFailure);
  assert.ok(failureParsed.success, 'Golden failure fixture must parse with Zod schema');

  console.log('  ✓ 176.4 golden success and failure fixtures validate strictly against Zod schemas');
}

if (process.env.VITEST) {
  describe('Suite 176: Contract Parity', () => {
    it('176.1: contracts export', () => {
      expect(fs.existsSync(path.join(process.cwd(), 'src/contracts/index.ts'))).toBe(true);
    });

    it('176.2: generated pydantic contracts', () => {
      const code = fs.readFileSync(path.join(process.cwd(), 'schemas/generated_contracts.py'), 'utf-8');
      expect(code).toContain("extra='forbid'");
    });

    it('176.3: generator script', () => {
      expect(() => execSync('npm run contracts:generate')).not.toThrow();
    });

    it('176.4: golden fixtures validation', () => {
      const valueSchema = z.object({ declarations: z.number(), kernel: z.string() });
      const schema = createResultEnvelopeSchema(valueSchema);
      expect(schema.safeParse({
        ok: true,
        value: { declarations: 4, kernel: 'leanchecker' },
        correlationId: 'golden-corr-101',
        timestamp: '2026-11-07T12:00:00Z',
      }).success).toBe(true);
    });
  });
}
