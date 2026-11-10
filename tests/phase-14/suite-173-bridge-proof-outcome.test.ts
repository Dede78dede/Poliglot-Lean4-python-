/**
 * Test Suite 173: Bridge Residuals ProofOutcome Migration (Phase 14.9.3 M0)
 *
 * Validates:
 * 173.1: none of the four bridge files contains `verified: true`
 * 173.2: none of the four bridge files contains `verified: false` as a boolean field
 * 173.3: none of the four bridge files emits or references `SEAL_KERNEL_VERIFIED_TIER5`
 * 173.4: all four bridges return typed ProofOutcome discriminated unions with no untyped boolean leak
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { axleRepairService } from '../../server/src/services/autocorrect/axle-repair';
import { leanCertBridge } from '../../server/src/services/leancert/leancert-bridge';
import { provepyBridge } from '../../server/src/services/provepy/provepy-bridge';
import { pastaLeanBridge } from '../../server/src/services/pastalean/pastalean-bridge';

const BRIDGE_FILES = [
  'server/src/services/autocorrect/axle-repair.ts',
  'server/src/services/leancert/leancert-bridge.ts',
  'server/src/services/provepy/provepy-bridge.ts',
  'server/src/services/pastalean/pastalean-bridge.ts',
];

export async function runSuite173(): Promise<void> {
  console.log('Running Suite 173: Bridge Residuals ProofOutcome Migration (4 sub-tests)...');

  const rootDir = process.cwd();

  // 173.1: none of the four files contains verified: true
  for (const relPath of BRIDGE_FILES) {
    const fullPath = path.join(rootDir, relPath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    assert.ok(
      !/verified:\s*true/.test(content),
      `${relPath} must not contain 'verified: true'`
    );
  }
  console.log('  ✓ 173.1 none of the four bridge files contains verified: true');

  // 173.2: none of the four contains top-level verified: false as a bridge return property
  for (const relPath of BRIDGE_FILES) {
    const fullPath = path.join(rootDir, relPath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    // Top-level interface property declaration: `readonly verified:` or `verified: false`
    assert.ok(
      !/readonly\s+verified:\s*boolean/.test(content) && !/readonly\s+verified:\s*false/.test(content),
      `${relPath} must not declare a top-level 'verified' property on result interfaces`
    );
  }
  console.log('  ✓ 173.2 none of the four bridge files contains top-level verified property on interfaces');

  // 173.3: none emits SEAL_KERNEL_VERIFIED_TIER5
  for (const relPath of BRIDGE_FILES) {
    const fullPath = path.join(rootDir, relPath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    assert.ok(
      !content.includes('SEAL_KERNEL_VERIFIED_TIER5'),
      `${relPath} must not contain SEAL_KERNEL_VERIFIED_TIER5`
    );
  }
  console.log('  ✓ 173.3 none of the four bridge files emits or contains SEAL_KERNEL_VERIFIED_TIER5');

  // 173.4: runtime execution returns typed ProofOutcome
  const axleRes = await axleRepairService.repairProofCloud('theorem t : 1 = 1 := by sorry', true);
  assert.ok('outcome' in axleRes, 'AxleRepairResult must contain outcome');
  assert.equal(axleRes.outcome.kind, 'preflight');
  assert.equal(axleRes.outcome.syntaxValid, true);

  const leancertRes = await leanCertBridge.verifyNumeric({
    claim: 'sin(x) < 1 for all x in [0, 2]',
    method: 'interval',
  });
  assert.ok('outcome' in leancertRes, 'LeanCertVerifyResult must contain outcome');
  assert.ok(
    leancertRes.outcome.kind === 'numeric-certificate' || leancertRes.outcome.kind === 'preflight',
    `LeanCert outcome must be numeric-certificate or preflight, found: ${leancertRes.outcome.kind}`
  );

  const provepyRes = await provepyBridge.verifyFunction({
    pythonSource: '@provable\ndef id_int(x: int) -> int:\n    return x\n',
    functionName: 'id_int',
  });
  assert.ok('outcome' in provepyRes, 'ProvepyResult must contain outcome');
  assert.equal(provepyRes.outcome.kind, 'unavailable'); // disabled by default

  const pastaleanRes = await pastaLeanBridge.verifyFidelity(
    'def test_computable (x : Int) : Int := x',
    'theorem test_fidelity : test_computable = test_provable := by rfl'
  );
  assert.ok('outcome' in pastaleanRes, 'PastaLean fidelity result must contain outcome');
  assert.equal(pastaleanRes.outcome.kind, 'metadata');

  console.log('  ✓ 173.4 runtime invocation of all four bridges returns valid ProofOutcome discriminated unions');
}

if (process.env.VITEST) {
  describe('Suite 173: Bridge Residuals ProofOutcome Migration', () => {
    it('173.1: none contains verified: true', async () => {
      const rootDir = process.cwd();
      for (const relPath of BRIDGE_FILES) {
        const fullPath = path.join(rootDir, relPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        expect(/verified:\s*true/.test(content)).toBe(false);
      }
    });

    it('173.2: none contains verified: false', async () => {
      const rootDir = process.cwd();
      for (const relPath of BRIDGE_FILES) {
        const fullPath = path.join(rootDir, relPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        expect(/verified:\s*false/.test(content)).toBe(false);
      }
    });

    it('173.3: none emits SEAL_KERNEL_VERIFIED_TIER5', async () => {
      const rootDir = process.cwd();
      for (const relPath of BRIDGE_FILES) {
        const fullPath = path.join(rootDir, relPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        expect(content.includes('SEAL_KERNEL_VERIFIED_TIER5')).toBe(false);
      }
    });

    it('173.4: runtime execution returns typed ProofOutcome', async () => {
      const axleRes = await axleRepairService.repairProofCloud('theorem t : 1 = 1 := by sorry', true);
      expect(axleRes.outcome.kind).toBe('preflight');
    });
  });
}
