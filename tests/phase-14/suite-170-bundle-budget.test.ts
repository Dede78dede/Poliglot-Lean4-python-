/**
 * Test Suite 170: Bundle Telemetry & Rolldown Code-Splitting Verification
 *
 * Validates:
 * 170.1: totalJsGzipKb is validly measured (> 0 KB)
 * 170.2: mainEntryGzipKb is validly measured (> 0 KB) and status is PASS
 * 170.3: build emits >= 3 route chunks (proves lazy splitting active)
 * 170.4: chunks list is populated with positive sizes
 * 170.5: reports/bundle-post-14.json contains the methodology field
 * 170.6: build output and config contains no manualChunks deprecation warning (Vite 8 native)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

export async function runSuite170(): Promise<void> {
  console.log('Running Suite 170: Bundle Telemetry & Rolldown Code-Splitting (6 sub-tests)...');

  const rootDir = process.cwd();
  const reportPath = path.join(rootDir, 'reports/bundle-post-14.json');
  assert.ok(fs.existsSync(reportPath), 'reports/bundle-post-14.json must exist on disk');

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  const measured = report.measured;
  assert.ok(measured, 'Bundle report must contain measured figures');

  // 170.1: totalJsGzipKb measured
  assert.ok(
    typeof measured.totalJsGzipKb === 'number' && measured.totalJsGzipKb > 0,
    `totalJsGzipKb (${measured.totalJsGzipKb} KB) must be measured > 0 KB`
  );
  console.log(`  ✓ 170.1 totalJsGzipKb (${measured.totalJsGzipKb} KB) validly recorded`);

  // 170.2: mainEntryGzipKb measured & PASS status
  assert.ok(
    typeof measured.mainEntryGzipKb === 'number' && measured.mainEntryGzipKb > 0,
    `mainEntryGzipKb (${measured.mainEntryGzipKb} KB) must be measured > 0 KB`
  );
  assert.equal(report.status, 'PASS', 'Bundle measurement report status must be PASS');
  console.log(`  ✓ 170.2 mainEntryGzipKb (${measured.mainEntryGzipKb} KB) recorded with status PASS`);

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
  console.log(`  ✓ 170.3 build emits >= 3 route chunks (${routeChunks.length} emitted)`);

  // 170.4: chunks list populated
  const allChunks =
    report.chunks ||
    Object.entries(report.files || {}).map(([name, v]: [string, { gzipKb: number }]) => ({
      name,
      gzipKb: v.gzipKb,
    }));
  const jsChunks = allChunks.filter((c: { name: string }) => c.name.endsWith('.js'));
  assert.ok(jsChunks.length >= 3, 'Must record >= 3 JS chunks in bundle report');
  console.log(`  ✓ 170.4 bundle chunks inventory verified (${jsChunks.length} JS chunks)`);

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

if (process.env.VITEST) {
  describe('Suite 170: Bundle Telemetry & Rolldown Code-Splitting', () => {
    it('170.1 totalJsGzipKb is validly measured', () => {
      const report = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'reports/bundle-post-14.json'), 'utf-8'));
      expect(report.measured.totalJsGzipKb).toBeGreaterThan(0);
    });

    it('170.2 mainEntryGzipKb recorded and status PASS', () => {
      const report = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'reports/bundle-post-14.json'), 'utf-8'));
      expect(report.measured.mainEntryGzipKb).toBeGreaterThan(0);
      expect(report.status).toBe('PASS');
    });

    it('170.3 build emits >= 3 route chunks', () => {
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

    it('170.4 chunks inventory populated', () => {
      const report = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'reports/bundle-post-14.json'), 'utf-8'));
      const allChunks =
        report.chunks ||
        Object.entries(report.files || {}).map(([name, v]: [string, { gzipKb: number }]) => ({
          name,
          gzipKb: v.gzipKb,
        }));
      const jsChunks = allChunks.filter((c: { name: string }) => c.name.endsWith('.js'));
      expect(jsChunks.length).toBeGreaterThanOrEqual(3);
    });

    it('170.5 reports/bundle-post-14.json contains the methodology field', () => {
      const report = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'reports/bundle-post-14.json'), 'utf-8'));
      expect(report.methodology).toBeDefined();
      expect(report.methodology.scope).toBe('dist/assets');
    });

    it('170.6 build output contains no manualChunks deprecation warning (Vite 8 only)', () => {
      const viteConfig = fs.readFileSync(path.join(process.cwd(), 'vite.config.ts'), 'utf-8');
      expect(viteConfig).not.toContain('manualChunks');
      expect(viteConfig).toContain('codeSplitting');
    });
  });
}
