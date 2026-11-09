/**
 * Test Suite 184: Epistemic Authority Gate & Single Certifier Isolation (Pre-Flight 14.9.9, Window 1)
 *
 * Validates:
 * 184.1: npm run arch:check-epistemic-authority succeeds on the current codebase.
 * 184.2: checkEpistemicAuthority identifies hybrid-adjudicator.ts as the sole certifying file in server/src/.
 * 184.3: Synthetic violation in a secondary bridge causes checkEpistemicAuthority to report failure.
 * 184.4: .dependency-cruiser.cjs contains the epistemic-authority-isolation rule.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { checkEpistemicAuthority } from '../../scripts/check-epistemic-authority';

export async function runSuite184(): Promise<void> {
  console.log('Running Suite 184: Epistemic Authority Gate & Single Certifier Isolation (4 sub-tests)...');

  const rootDir = process.cwd();

  // 184.1: Static checker returns valid: true on clean codebase
  const cleanCheck = checkEpistemicAuthority(rootDir);
  assert.equal(cleanCheck.valid, true, 'Base codebase must satisfy epistemic authority invariant');
  assert.equal(cleanCheck.unauthorizedBridgeFiles.length, 0);
  console.log('  ✓ 184.1 arch:check-epistemic-authority passes with 0 violations');

  // 184.2: hybrid-adjudicator.ts is the sole certifying file in server/src/
  assert.equal(cleanCheck.certifyingFiles.length, 1);
  assert.ok(
    cleanCheck.certifyingFiles[0].endsWith('hybrid-adjudicator.ts'),
    `Certifying file must be hybrid-adjudicator.ts, found: ${cleanCheck.certifyingFiles[0]}`
  );
  console.log('  ✓ 184.2 hybrid-adjudicator.ts identified as the sole certifying authority');

  // 184.3: Synthetic violation detection: simulate a bridge with verified: true
  const bridgePath = path.join(rootDir, 'server/src/services/autocorrect/axle-repair.ts');
  const originalBridge = fs.readFileSync(bridgePath, 'utf-8');
  try {
    fs.writeFileSync(bridgePath, `${originalBridge}\nconst fakeSeal = { verified: true };\n`, 'utf-8');
    const dirtyCheck = checkEpistemicAuthority(rootDir);
    assert.equal(dirtyCheck.valid, false, 'Simulated bridge violation must be caught');
    assert.ok(
      dirtyCheck.unauthorizedBridgeFiles.some((b) => b.includes('axle-repair.ts')),
      'axle-repair.ts violation must be explicitly recorded'
    );
  } finally {
    fs.writeFileSync(bridgePath, originalBridge, 'utf-8');
  }
  console.log('  ✓ 184.3 Synthetic bridge violation caught and rejected by epistemic checker');

  // 184.4: .dependency-cruiser.cjs contains epistemic rule
  const depcruisePath = path.join(rootDir, '.dependency-cruiser.cjs');
  const depcruiseContent = fs.readFileSync(depcruisePath, 'utf-8');
  assert.ok(
    depcruiseContent.includes('epistemic-authority-isolation'),
    '.dependency-cruiser.cjs must configure epistemic-authority-isolation'
  );
  console.log('  ✓ 184.4 .dependency-cruiser.cjs codifies epistemic-authority-isolation rule');
}

if (process.argv[1]?.endsWith('suite-184-epistemic-authority.test.ts')) {
  runSuite184()
    .then(() => {
      console.log('Suite 184 passed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
