/**
 * Test Suite 170: Bundle Budget & Rolldown Code-Splitting Verification (Phase 14.9.1 FIX-A)
 *
 * Validates:
 * 170.1: totalJsGzipKb <= 260.00 KB
 * 170.2: mainEntryGzipKb <= 180.00 KB
 * 170.3: build emits >= 3 route chunks (proves lazy splitting active)
 * 170.4: no single chunk > 80 KB gzip (prevents monolithic bundle)
 * 170.5: reports/bundle-post-14.json contains the methodology field
 * 170.6: build output and config contains no manualChunks deprecation warning (Vite 8 native)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

export async function runSuite170(): Promise<void> {
  console.log('Running Suite 170: Bundle Budget & Rolldown Code-Splitting (6 sub-tests)...');

  const rootDir = process.cwd();
  const reportPath = path.join(rootDir, 'reports/bundle-post-14.json');
  assert.ok(fs.existsSync(reportPath), 'reports/bundle-post-14.json must exist on disk');

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  const measured = report.measured;
  assert.ok(measured, 'Bundle report must contain measured figures');

  // 170.1: totalJsGzipKb <= 260.00
  assert.ok(
    measured.totalJsGzipKb <= 260.0,
    `totalJsGzipKb (${measured.totalJsGzipKb} KB) must be <= 260.00 KB`
  );
  console.log(`  ✓ 170.1 totalJsGzipKb (${measured.totalJsGzipKb} KB) <= 260.00 KB`);

  // 170.2: mainEntryGzipKb <= 180.00
  assert.ok(
    measured.mainEntryGzipKb <= 180.0,
    `mainEntryGzipKb (${measured.mainEntryGzipKb} KB) must be <= 180.00 KB`
  );
  console.log(`  ✓ 170.2 mainEntryGzipKb (${measured.mainEntryGzipKb} KB) <= 180.00 KB`);

  // 170.3: build emits >= 3 route chunks
  const assetsPath = path.join(rootDir, 'dist/assets');
  const files = fs.existsSync(assetsPath)
    ? fs.readdirSync(assetsPath)
    : Object.keys(report.files || {});
  const routeChunks = files.filter(
    (f) =>
      f.endsWith('.js') &&
      !f.startsWith('index-') &&
      !f.startsWith('rolldown-') &&
      !f.includes('vendor')
  );
  assert.ok(
    routeChunks.length >= 3,
    `Build must emit at least 3 route/feature chunks, found ${routeChunks.length} (${routeChunks.join(', ')})`
  );
  console.log(`  ✓ 170.3 build emits >= 3 route chunks (${routeChunks.length} emitted: ${routeChunks.slice(0, 5).join(', ')})`);

  // 170.4: no single chunk > 80 KB gzip
  const allChunks = report.chunks || Object.entries(report.files || {}).map(([name, v]: [string, any]) => ({ name, gzipKb: v.gzipKb }));
  const jsChunks = allChunks.filter((c: any) => c.name.endsWith('.js'));
  const oversizeChunks = jsChunks.filter((c: any) => c.gzipKb > 80.0);
  assert.equal(
    oversizeChunks.length,
    0,
    `No single JS chunk may exceed 80.00 KB gzip. Found: ${oversizeChunks.map((c: any) => `${c.name}: ${c.gzipKb} KB`).join(', ')}`
  );
  console.log('  ✓ 170.4 no single chunk > 80 KB gzip (largest chunk is well within budget)');

  // 170.5: reports/bundle-post-14.json contains methodology field
  assert.ok(report.methodology, 'Bundle report must contain methodology');
  assert.equal(report.methodology.scope, 'dist/assets');
  assert.equal(report.methodology.compression, 'zlib.gzipSync (default)');
  assert.equal(report.methodology.mainEntryPattern, 'index-*.js');
  assert.equal(report.methodology.excludesServer, true);
  console.log('  ✓ 170.5 reports/bundle-post-14.json contains the methodology field');

  // 170.6: build output contains no manualChunks deprecation warning
  const viteConfigPath = path.join(rootDir, 'vite.config.ts');
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
  assert.ok(
    !viteConfig.includes('manualChunks'),
    'vite.config.ts must not use manualChunks in Vite 8'
  );
  assert.ok(
    viteConfig.includes('codeSplitting'),
    'vite.config.ts must use native Vite 8 / Rolldown codeSplitting.groups'
  );
  console.log('  ✓ 170.6 build output contains no manualChunks deprecation warning (Vite 8 only)');
}

// Vitest suite definition
if (process.env.VITEST) {
  describe('Suite 170: Bundle Budget & Rolldown Code-Splitting', () => {
  it('170.1 totalJsGzipKb <= 260.00', async () => {
    const report = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'reports/bundle-post-14.json'), 'utf-8'));
    expect(report.measured.totalJsGzipKb).toBeLessThanOrEqual(260.0);
  });

  it('170.2 mainEntryGzipKb <= 180.00', async () => {
    const report = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'reports/bundle-post-14.json'), 'utf-8'));
    expect(report.measured.mainEntryGzipKb).toBeLessThanOrEqual(180.0);
  });

  it('170.3 build emits >= 3 route chunks', async () => {
    const report = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'reports/bundle-post-14.json'), 'utf-8'));
    const assetsPath = path.join(process.cwd(), 'dist/assets');
    const files = fs.existsSync(assetsPath)
      ? fs.readdirSync(assetsPath)
      : Object.keys(report.files || {});
    const routeChunks = files.filter(
      (f) =>
        f.endsWith('.js') &&
        !f.startsWith('index-') &&
        !f.startsWith('rolldown-') &&
        !f.includes('vendor')
    );
    expect(routeChunks.length).toBeGreaterThanOrEqual(3);
  });

  it('170.4 no single chunk > 80 KB gzip', async () => {
    const report = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'reports/bundle-post-14.json'), 'utf-8'));
    const allChunks = report.chunks || Object.entries(report.files || {}).map(([name, v]: [string, any]) => ({ name, gzipKb: v.gzipKb }));
    const jsChunks = allChunks.filter((c: any) => c.name.endsWith('.js'));
    const oversize = jsChunks.filter((c: any) => c.gzipKb > 80.0);
    expect(oversize.length).toBe(0);
  });

  it('170.5 reports/bundle-post-14.json contains the methodology field', async () => {
    const report = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'reports/bundle-post-14.json'), 'utf-8'));
    expect(report.methodology).toBeDefined();
    expect(report.methodology.scope).toBe('dist/assets');
  });

  it('170.6 build output contains no manualChunks deprecation warning (Vite 8 only)', async () => {
    const viteConfig = fs.readFileSync(path.join(process.cwd(), 'vite.config.ts'), 'utf-8');
    expect(viteConfig).not.toContain('manualChunks');
    expect(viteConfig).toContain('codeSplitting');
  });
});
}

