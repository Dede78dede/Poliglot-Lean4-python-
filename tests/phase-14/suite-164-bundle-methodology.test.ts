/**
 * Test Suite 164: Bundle Methodology Documentation & Historical Reconciliation (Phase 13.9.1, Task 13)
 *
 * Validates:
 * 164.1: bundle-post-13.9.json contains methodology.scope === "dist/assets"
 * 164.2: bundle-methodology.md exists and documents the 159.30 -> 154.32 KB transition
 * 164.3: evaluateBundleBudget detects budget overflow when mock assets exceed limits
 * 164.4: Historical baseline bundle-post-13.json is preserved and untouched
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  BUNDLE_METHODOLOGY,
  evaluateBundleBudget,
} from '../../scripts/measure-bundle';

export async function runSuite164(): Promise<void> {
  console.log('Running Suite 164: Bundle Methodology & Historical Reconciliation (4 sub-tests)...');

  // 164.1: bundle-post-13.9.json contains methodology.scope === "dist/assets"
  const reportPath = path.resolve('reports/bundle-post-13.9.json');
  assert.ok(fs.existsSync(reportPath), 'reports/bundle-post-13.9.json must exist');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  assert.equal(report.methodology?.scope, 'dist/assets');
  assert.equal(report.methodology?.compression, 'zlib.gzipSync (default)');
  assert.equal(report.methodology?.excludesServer, true);
  assert.equal(BUNDLE_METHODOLOGY.scope, 'dist/assets');
  console.log('  ✓ 164.1 bundle-post-13.9.json contains validated methodology.scope === "dist/assets"');

  // 164.2: bundle-methodology.md documents the 159.30 -> 154.32 KB transition
  const docPath = path.resolve('reports/bundle-methodology.md');
  assert.ok(fs.existsSync(docPath), 'reports/bundle-methodology.md must exist');
  const docContent = fs.readFileSync(docPath, 'utf-8');
  assert.ok(docContent.includes('159.30'), 'Must cite Phase 13 baseline 159.30 KB');
  assert.ok(docContent.includes('154.32'), 'Must cite Phase 13.9 measurement 154.32 KB');
  assert.ok(docContent.includes('Deduplication') || docContent.includes('Elimination'), 'Must explain root cause of reduction');
  console.log('  ✓ 164.2 reports/bundle-methodology.md explains authentic 159.30 -> 154.32 KB transition');

  // 164.3: evaluateBundleBudget detects and flags mock assets exceeding budget
  const mockOverflow = evaluateBundleBudget(185.50, 275.20, {
    mainBundleGzipMaxKb: 180.0,
    totalJsGzipMaxKb: 260.0,
  });
  assert.equal(mockOverflow.status, 'FAIL');
  assert.ok(mockOverflow.marginMainKb < 0);
  assert.ok(mockOverflow.marginTotalKb < 0);

  const mockPass = evaluateBundleBudget(154.32, 216.08, {
    mainBundleGzipMaxKb: 180.0,
    totalJsGzipMaxKb: 260.0,
  });
  assert.equal(mockPass.status, 'PASS');
  assert.ok(mockPass.marginMainKb > 0);
  console.log('  ✓ 164.3 evaluateBundleBudget strictly differentiates PASS and FAIL on mock sizes');

  // 164.4: Historical snapshot bundle-post-13.json is preserved
  const histPath = path.resolve('reports/bundle-post-13.json');
  assert.ok(fs.existsSync(histPath), 'reports/bundle-post-13.json must be preserved');
  const histJson = JSON.parse(fs.readFileSync(histPath, 'utf-8'));
  assert.equal(histJson.phase, '13');
  assert.equal(histJson.measured?.mainEntryGzipKb, 159.3);
  console.log('  ✓ 164.4 Historical snapshot bundle-post-13.json preserved unmodified');
}

if (process.argv[1]?.endsWith('suite-164-bundle-methodology.test.ts')) {
  runSuite164()
    .then(() => {
      console.log('Suite 164 passed (4/4 sub-tests).');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
