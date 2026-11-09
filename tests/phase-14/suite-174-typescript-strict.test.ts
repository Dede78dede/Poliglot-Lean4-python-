/**
 * Test Suite 174: TypeScript Strict Completeness (Phase 14.9.3 M1)
 *
 * Validates:
 * 174.1: strict compiler options (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitOverride) enabled
 * 174.2: ProofOutcome discriminated union has exactly 5 canonical variants
 * 174.3: assertNever helper correctly handles compile-time never and throws runtime error on unexpected variants
 * 174.4: zero untyped `any` or `as any` in verification services (src/services/verification, server/src/services/verification)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { assertNever } from '../../src/utils/assert-never';
import type { ProofOutcome } from '../../src/types/proof-outcome';

export async function runSuite174(): Promise<void> {
  console.log('Running Suite 174: TypeScript Strict Completeness (4 sub-tests)...');

  const rootDir = process.cwd();

  // 174.1: Strict compiler options enabled in configuration
  const tsconfigPath = path.join(rootDir, 'tsconfig.json');
  const tsconfigAppPath = path.join(rootDir, 'tsconfig.app.json');
  const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
  const tsconfigAppContent = fs.readFileSync(tsconfigAppPath, 'utf-8');

  assert.ok(tsconfigContent.includes('"strict": true'), 'tsconfig.json must have strict: true');
  assert.ok(tsconfigContent.includes('"noImplicitOverride": true'), 'tsconfig.json must have noImplicitOverride: true');
  assert.ok(tsconfigAppContent.includes('"noUncheckedIndexedAccess": true'), 'tsconfig.app.json must have noUncheckedIndexedAccess: true');
  assert.ok(tsconfigAppContent.includes('"exactOptionalPropertyTypes": true'), 'tsconfig.app.json must have exactOptionalPropertyTypes: true');
  console.log('  ✓ 174.1 strict options (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitOverride) enabled');

  // 174.2: ProofOutcome discriminated union has 5 canonical variants
  const proofOutcomeTypePath = path.join(rootDir, 'src/types/proof-outcome.ts');
  const typeCode = fs.readFileSync(proofOutcomeTypePath, 'utf-8');
  const kinds = ['certified', 'transport', 'preflight', 'unavailable', 'metadata'];
  for (const k of kinds) {
    assert.ok(
      typeCode.includes(`readonly kind: '${k}'`),
      `ProofOutcome must declare variant kind: '${k}'`
    );
  }
  const kindMatches = typeCode.match(/readonly kind:\s*'[a-z]+'/g);
  assert.equal(kindMatches?.length, 5, 'ProofOutcome must contain exactly 5 discriminated variants');
  console.log('  ✓ 174.2 ProofOutcome contains exactly 5 canonical discriminated union variants');

  // 174.3: assertNever helper throws runtime error
  assert.throws(
    () => {
      // Intentionally cast invalid payload at runtime to test exhaustiveness guard
      assertNever('unknown_kind' as unknown as never, 'Custom exhaustiveness failure');
    },
    /Custom exhaustiveness failure/,
    'assertNever must throw with custom message on unhandled variant'
  );
  console.log('  ✓ 174.3 assertNever handles compile-time never and throws descriptive runtime error');

  // 174.4: zero untyped any in verification services
  const verificationDirs = [
    path.join(rootDir, 'src/services/verification'),
    path.join(rootDir, 'server/src/services/verification'),
  ];
  for (const vDir of verificationDirs) {
    if (fs.existsSync(vDir)) {
      const entries = fs.readdirSync(vDir);
      for (const entry of entries) {
        if (entry.endsWith('.ts') && !entry.includes('.test.')) {
          const content = fs.readFileSync(path.join(vDir, entry), 'utf-8');
          const hasAny = /:\s*any\b|as\s+any\b/.test(content);
          assert.ok(!hasAny, `File ${entry} in ${vDir} must not contain ': any' or 'as any'`);
        }
      }
    }
  }
  console.log('  ✓ 174.4 verification services strictly verified free of untyped any or as any');
}

if (process.env.VITEST) {
  describe('Suite 174: TypeScript Strict Completeness', () => {
    it('174.1: strict compiler options enabled', () => {
      const tsconfig = fs.readFileSync(path.join(process.cwd(), 'tsconfig.json'), 'utf-8');
      expect(tsconfig).toContain('"strict": true');
      expect(tsconfig).toContain('"noImplicitOverride": true');
    });

    it('174.2: ProofOutcome has 5 variants', () => {
      const typeCode = fs.readFileSync(path.join(process.cwd(), 'src/types/proof-outcome.ts'), 'utf-8');
      const kindMatches = typeCode.match(/readonly kind:\s*'[a-z]+'/g);
      expect(kindMatches?.length).toBe(5);
    });

    it('174.3: assertNever throws runtime error', () => {
      expect(() => assertNever('invalid' as unknown as never)).toThrow();
    });

    it('174.4: zero any in verification services', () => {
      const vDir = path.join(process.cwd(), 'server/src/services/verification');
      const files = fs.readdirSync(vDir).filter((f) => f.endsWith('.ts'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(vDir, file), 'utf-8');
        expect(/:\s*any\b|as\s+any\b/.test(content)).toBe(false);
      }
    });
  });
}
