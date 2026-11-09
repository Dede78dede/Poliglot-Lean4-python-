/**
 * Test Suite 183: CI/CD Pipeline & Supply Chain Hardening (Phase 14.9.3, Milestone M10)
 *
 * Validates:
 * 183.1: .github/workflows/ci.yml enforces npm ci --ignore-scripts.
 * 183.2: ci.yml includes arch:check and check-flag-expiry.ts.
 * 183.3: package.json production dependencies have exact pinned versions (zero caret/tilde).
 * 183.4: docs/architecture/ci-cd.md exists and documents pipeline security.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export async function runSuite183(): Promise<void> {
  console.log('Running Suite 183: CI/CD Pipeline & Supply Chain Hardening (4 sub-tests)...');

  const rootDir = process.cwd();

  // 183.1: ci.yml contains --ignore-scripts
  const ciWorkflowPath = path.join(rootDir, '.github/workflows/ci.yml');
  assert.ok(fs.existsSync(ciWorkflowPath), '.github/workflows/ci.yml must exist');
  const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');
  assert.ok(
    ciContent.includes('npm ci --ignore-scripts'),
    'CI workflow must run npm ci with --ignore-scripts'
  );
  console.log('  ✓ 183.1 .github/workflows/ci.yml uses npm ci --ignore-scripts for safe installs');

  // 183.2: ci.yml includes arch:check and check-flag-expiry
  assert.ok(ciContent.includes('npm run arch:check'), 'CI workflow must run architecture check');
  assert.ok(ciContent.includes('scripts/check-flag-expiry.ts'), 'CI workflow must verify feature flag expiry');
  console.log('  ✓ 183.2 .github/workflows/ci.yml includes arch:check and flag expiry validation');

  // 183.3: Exact pinned versions in package.json dependencies
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const dependencies = packageJson.dependencies || {};

  const unpinned: string[] = [];
  for (const [pkg, version] of Object.entries(dependencies)) {
    if (typeof version === 'string' && (version.startsWith('^') || version.startsWith('~'))) {
      unpinned.push(`${pkg}@${version}`);
    }
  }
  assert.equal(
    unpinned.length,
    0,
    `Production dependencies must be pinned to exact versions. Unpinned: ${unpinned.join(', ')}`
  );
  console.log(`  ✓ 183.3 All ${Object.keys(dependencies).length} production dependencies are pinned to exact versions`);

  // 183.4: ci-cd.md documentation exists
  const ciDocPath = path.join(rootDir, 'docs/architecture/ci-cd.md');
  assert.ok(fs.existsSync(ciDocPath), 'docs/architecture/ci-cd.md must exist');
  const ciDocContent = fs.readFileSync(ciDocPath, 'utf-8');
  assert.ok(ciDocContent.includes('Supply-Chain Security Controls'));
  console.log('  ✓ 183.4 docs/architecture/ci-cd.md documents supply chain security and CI workflow');
}

if (process.argv[1]?.endsWith('suite-183-ci-supply-chain.test.ts')) {
  runSuite183()
    .then(() => {
      console.log('Suite 183 passed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
