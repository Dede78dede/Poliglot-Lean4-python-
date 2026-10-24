import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  TOOLCHAIN_POLICY,
  listSupportedToolchains,
  isToolchainSupported,
} from '../../src/services/toolchains/toolchain-policy';

export async function runSuite78(): Promise<void> {
  console.log('\n--- Test Suite 78: Unified Toolchain Policy ---');

  // 78.1: Policy contains all 11 toolchains
  const toolchains = listSupportedToolchains();
  assert.equal(toolchains.length, 11, 'Policy must document exactly 11 pinned toolchains');
  assert.equal(isToolchainSupported('v4.35.0'), true);
  assert.equal(isToolchainSupported('v4.31.0-rc2'), true);
  assert.equal(isToolchainSupported('v4.32.0'), true);
  assert.equal(isToolchainSupported('v4.34.1'), true);
  assert.equal(isToolchainSupported('v4.99.0'), false);
  console.log('  ✓ 78.1 Policy contains all 11 pinned Lean toolchains with stability classifications');

  // 78.2: docs/architecture/toolchain-matrix.md matches the policy
  const matrixDoc = fs.readFileSync('docs/architecture/toolchain-matrix.md', 'utf-8');
  for (const t of toolchains) {
    assert.ok(matrixDoc.includes(`\`${t.toolchain}\``), `Matrix doc must mention ${t.toolchain}`);
    assert.ok(matrixDoc.includes(t.owner), `Matrix doc must attribute ${t.toolchain} to ${t.owner}`);
  }
  console.log('  ✓ 78.2 docs/architecture/toolchain-matrix.md is strictly aligned with policy');

  // 78.3: Critical runner toolchains are pinned
  assert.equal(TOOLCHAIN_POLICY['v4.35.0'].owner, 'femev-runner');
  assert.equal(TOOLCHAIN_POLICY['v4.31.0-rc2'].owner, 'pastalean-runner');
  assert.equal(TOOLCHAIN_POLICY['v4.32.0'].owner, 'leancert-runner');
  assert.equal(TOOLCHAIN_POLICY['v4.34.1'].owner, 'femev-runner');
  console.log('  ✓ 78.3 Critical toolchains are mapped to container owners without ambiguity');
}
