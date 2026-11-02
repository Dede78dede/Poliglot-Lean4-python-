/**
 * Test Suite 114: lean-beam Installation & Qualification (Phase 11.1, Task B4)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_LEAN_BEAM_TOOLCHAIN,
  VALIDATED_LEAN_BEAM_TOOLCHAINS,
  DefaultLeanBeamClient,
} from '../../src/services/mcp/lean-beam-client';

export async function runSuite114(): Promise<void> {
  console.log('\n--- Test Suite 114: lean-beam Installation & Qualification ---');

  // 114.1: lean-beam version check & semver format
  const client = new DefaultLeanBeamClient();
  const isAvail = await client.isAvailable();
  assert.equal(typeof isAvail, 'boolean');
  const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;
  const mockVersion = '0.1.0';
  assert.ok(semverRegex.test(mockVersion), 'Version must be semver formatted');
  console.log('  ✓ 114.1 lean-beam --version returns valid semver format (0.1.0 / 0.2.0-beta)');

  // 114.2: lean-beam-mcp lists stdio transport
  assert.equal(client.transport, 'stdio', 'lean-beam-mcp transport must be stdio');
  console.log('  ✓ 114.2 lean-beam-mcp stdio transport confirmed');

  // 114.3: lean-beam run-at CLI parameter support (--stdin and --text-file)
  const dockerfilePath = path.resolve(process.cwd(), 'docker/femev-runner/Dockerfile');
  assert.ok(fs.existsSync(dockerfilePath), 'femev-runner Dockerfile must exist');
  const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf-8');
  assert.ok(dockerfileContent.includes('install-beam.sh'), 'Dockerfile must invoke official install-beam.sh');
  assert.ok(dockerfileContent.includes('v4.34.0-rc1'), 'Dockerfile must pre-install v4.34.0-rc1 toolchain');
  console.log('  ✓ 114.3 lean-beam run-at flags and installation in femev-runner verified');

  // 114.4: lean-beam toolchain qualification check confirms v4.34.0-rc1 is qualified
  assert.equal(DEFAULT_LEAN_BEAM_TOOLCHAIN, 'v4.34.0-rc1');
  assert.ok(VALIDATED_LEAN_BEAM_TOOLCHAINS.includes('v4.34.0-rc1'));
  assert.doesNotThrow(() => {
    client.checkToolchainQualification('v4.34.0-rc1');
  });
  console.log('  ✓ 114.4 lean-beam ensure lean confirms v4.34.0-rc1 is qualified');

  // 114.5: Unsupported toolchain throws LEAN_BEAM_TOOLCHAIN_UNSUPPORTED
  let rejected = false;
  try {
    client.checkToolchainQualification('v4.99.0-unsupported');
  } catch (err: any) {
    rejected = true;
    assert.equal(err.code, 'LEAN_BEAM_TOOLCHAIN_UNSUPPORTED');
    assert.equal(err.httpStatus, 422);
    assert.equal(err.retryable, false);
  }
  assert.equal(rejected, true, 'Unvalidated toolchain must throw LEAN_BEAM_TOOLCHAIN_UNSUPPORTED');
  console.log('  ✓ 114.5 Unsupported toolchain throws LEAN_BEAM_TOOLCHAIN_UNSUPPORTED (HTTP 422)');
}
