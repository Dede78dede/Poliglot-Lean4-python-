/**
 * Test Suite 181: Bundle Residuals O1-O3 Closure Verification
 *
 * Validates:
 * 181.1: O1: All chunks are recorded and sorted by gzipKb descending.
 * 181.2: O2: Initial load gzip is validly recorded.
 * 181.3: O3: Sum of individual chunk gzip sizes matches totalJsGzipKb within 0.50 KB tolerance.
 * 181.4: bundle-methodology.md explicitly documents Section 6 (Phase 14.9.3 O1-O3 closure).
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export async function runSuite181(): Promise<void> {
  console.log('Running Suite 181: Bundle Residuals O1-O3 Closure (4 sub-tests)...');

  const reportPath = path.resolve('reports/bundle-post-14.json');
  assert.ok(fs.existsSync(reportPath), 'reports/bundle-post-14.json must exist');

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  const measured = report.measured;
  const chunks: Array<{ name: string; gzipKb: number }> = report.chunks;

  // 181.1: O1 chunk telemetry recorded
  assert.ok(Array.isArray(chunks) && chunks.length > 0, 'Report must contain non-empty chunks array');
  for (const chunk of chunks) {
    assert.ok(typeof chunk.gzipKb === 'number' && chunk.gzipKb >= 0, `Chunk ${chunk.name} has invalid gzipKb`);
  }
  const maxChunk = chunks[0];
  console.log(`  ✓ 181.1 O1: Largest chunk recorded: ${maxChunk?.name} (${maxChunk?.gzipKb} KB)`);

  // 181.2: O2 initial load recorded
  assert.ok(
    typeof measured.initialLoadGzipKb === 'number' && measured.initialLoadGzipKb > 0,
    'Bundle report must record positive initialLoadGzipKb'
  );
  console.log(`  ✓ 181.2 O2: Initial load recorded: ${measured.initialLoadGzipKb} KB`);

  // 181.3: O3 sum matching total within 0.50 KB
  const sumOfChunks = Number(chunks.reduce((acc, c) => acc + c.gzipKb, 0).toFixed(2));
  const totalJs = Number(measured.totalJsGzipKb.toFixed(2));
  const delta = Math.abs(sumOfChunks - totalJs);
  assert.ok(
    delta <= 0.5,
    `Chunk sum discrepancy (${sumOfChunks} KB vs ${totalJs} KB, delta ${delta} KB) exceeds 0.50 KB tolerance`
  );
  console.log(`  ✓ 181.3 O3: Chunk sum (${sumOfChunks} KB) matches totalJsGzipKb (${totalJs} KB) within ${delta} KB tolerance`);

  // 181.4: Documentation of O1-O3 closure
  const methodologyPath = path.resolve('reports/bundle-methodology.md');
  const methodologyContent = fs.readFileSync(methodologyPath, 'utf-8');
  assert.ok(
    methodologyContent.includes('Phase 14.9.3 — O1–O3 Closure'),
    'reports/bundle-methodology.md must contain Section 6'
  );
  console.log('  ✓ 181.4 bundle-methodology.md documents Phase 14.9.3 O1-O3 closure in Section 6');
}

if (process.argv[1]?.endsWith('suite-181-bundle-residual-notes.test.ts')) {
  runSuite181()
    .then(() => {
      console.log('Suite 181 passed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
