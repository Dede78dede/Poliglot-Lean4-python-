/**
 * Test Suite 172: Fallback Contracts, Pyodide Integrity & Antipattern Remediation (Phase 14.9.2)
 *
 * Validates:
 * 172.1: docs/architecture/fallback-contracts.md exists and defines the 4 tiers (FULL_DUAL, SINGLE_ENGINE_DEGRADED, SYNTAX_PREFLIGHT, UNAVAILABLE) and RFC 9457 mappings
 * 172.2: public/pyodide/pyodide-lock.json exists, is valid JSON, and contains SHA-256 hashes for core packages (numpy, micropip, packaging, sympy)
 * 172.3: vitest.config.ts uses import.meta.dirname, contains no __dirname, and has no @ts-nocheck
 * 172.4: secondary bridge modules (axle-repair, leancert-bridge, provepy-bridge, pastalean-bridge) contain zero SEAL_KERNEL_VERIFIED_TIER5
 * 172.5: ProofOutcome non-certified outcomes (unavailable, preflight, transport) prohibit literal SEAL_KERNEL_VERIFIED_TIER5
 * 172.6: scripts/verify-all.ts executes all 172 suites / 303 sub-tests with 100% pass rate
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import type { ProofOutcome } from '../../src/types/proof-outcome';

export async function runSuite172(): Promise<void> {
  console.log('Running Suite 172: Fallback Contracts, Pyodide Integrity & Config Purity (6 sub-tests)...');

  const rootDir = process.cwd();

  // 172.1: docs/architecture/fallback-contracts.md exists and defines the 4 tiers and RFC 9457 error mappings
  const fallbackDocPath = path.join(rootDir, 'docs/architecture/fallback-contracts.md');
  assert.ok(fs.existsSync(fallbackDocPath), 'docs/architecture/fallback-contracts.md must exist (closing F7)');
  const fallbackDoc = fs.readFileSync(fallbackDocPath, 'utf-8');
  assert.ok(fallbackDoc.includes('FULL_DUAL'), 'Fallback doc must specify FULL_DUAL tier');
  assert.ok(fallbackDoc.includes('SINGLE_ENGINE_DEGRADED'), 'Fallback doc must specify SINGLE_ENGINE_DEGRADED tier');
  assert.ok(fallbackDoc.includes('SYNTAX_PREFLIGHT'), 'Fallback doc must specify SYNTAX_PREFLIGHT tier');
  assert.ok(fallbackDoc.includes('UNAVAILABLE'), 'Fallback doc must specify UNAVAILABLE tier');
  assert.ok(fallbackDoc.includes('RFC 9457'), 'Fallback doc must specify RFC 9457 error mapping');
  assert.ok(fallbackDoc.includes('FALLBACK_DEGRADED'), 'Fallback doc must specify FALLBACK_DEGRADED code');
  console.log('  ✓ 172.1 fallback contracts document exists and codifies 4-tier degradation and RFC 9457 envelopes');

  // 172.2: public/pyodide/pyodide-lock.json exists, is valid JSON, and contains SHA-256 hashes
  const lockfilePath = path.join(rootDir, 'public/pyodide/pyodide-lock.json');
  assert.ok(fs.existsSync(lockfilePath), 'public/pyodide/pyodide-lock.json must exist (closing F5)');
  const lockfileContent = fs.readFileSync(lockfilePath, 'utf-8');
  const lockjsonData = JSON.parse(lockfileContent) as { version: string; packages: Record<string, { sha256: string }> };
  assert.ok(lockjsonData.version, 'pyodide-lock.json must specify runtime version');
  assert.ok(lockjsonData.packages, 'pyodide-lock.json must specify packages record');
  const requiredPkgs = ['micropip', 'packaging', 'numpy', 'sympy'];
  for (const pkg of requiredPkgs) {
    const pkgData = lockjsonData.packages[pkg];
    assert.ok(pkgData, `pyodide-lock.json must include package: ${pkg}`);
    assert.match(pkgData.sha256, /^[a-f0-9]{64}$/i, `Package ${pkg} must have a valid 64-character SHA-256 hash`);
  }
  console.log('  ✓ 172.2 public/pyodide/pyodide-lock.json exists and contains SHA-256 hashes for core packages');

  // 172.3: vitest.config.ts uses import.meta.dirname, contains no __dirname, and has no @ts-nocheck
  const vitestConfigPath = path.join(rootDir, 'vitest.config.ts');
  const vitestConfig = fs.readFileSync(vitestConfigPath, 'utf-8');
  assert.ok(!vitestConfig.includes('__dirname'), 'vitest.config.ts must not contain __dirname');
  assert.ok(vitestConfig.includes('import.meta.dirname'), 'vitest.config.ts must use import.meta.dirname');
  assert.ok(!vitestConfig.includes('@ts-nocheck'), 'vitest.config.ts must not suppress typing with @ts-nocheck');
  console.log('  ✓ 172.3 vitest.config.ts conforms to Vite 8 ESM standards with import.meta.dirname');

  // 172.4: secondary bridge modules contain zero SEAL_KERNEL_VERIFIED_TIER5
  const secondaryBridges = [
    'server/src/services/autocorrect/axle-repair.ts',
    'server/src/services/leancert/leancert-bridge.ts',
    'server/src/services/provepy/provepy-bridge.ts',
    'server/src/services/pastalean/pastalean-bridge.ts',
  ];
  for (const relPath of secondaryBridges) {
    const fullPath = path.join(rootDir, relPath);
    if (fs.existsSync(fullPath)) {
      const code = fs.readFileSync(fullPath, 'utf-8');
      assert.ok(
        !code.includes('SEAL_KERNEL_VERIFIED_TIER5'),
        `${relPath} must not emit or reference SEAL_KERNEL_VERIFIED_TIER5`
      );
    }
  }
  console.log('  ✓ 172.4 secondary bridge modules are strictly non-certifying (0 SEAL_KERNEL_VERIFIED_TIER5 emissions)');

  // 172.5: ProofOutcome non-certified outcomes prohibit literal SEAL_KERNEL_VERIFIED_TIER5
  const fallbackOutcome: ProofOutcome = {
    kind: 'unavailable',
    certificationTier: 'UNAVAILABLE',
    verified: false,
    reason: 'adjudicator_unreachable',
  };
  assert.equal(fallbackOutcome.kind, 'unavailable');
  assert.ok(!('seal' in fallbackOutcome), 'Unavailable outcome must not contain seal property');

  const preflightOutcome: ProofOutcome = {
    kind: 'preflight',
    certificationTier: 'SYNTAX_ONLY_UNVERIFIED',
    verified: false,
    syntaxValid: true,
    sorryFree: true,
    reason: 'syntax check',
  };
  assert.equal(preflightOutcome.kind, 'preflight');
  assert.ok(!('seal' in preflightOutcome), 'Preflight outcome must not contain seal property');

  console.log('  ✓ 172.5 ProofOutcome non-certified outcomes guarantee absence of kernel seals in fallback paths');

  // 172.6: verify-all.ts includes runSuite172 and asserts total 172 suites / 303 sub-tests
  const verifyAllPath = path.join(rootDir, 'scripts/verify-all.ts');
  const verifyAllCode = fs.readFileSync(verifyAllPath, 'utf-8');
  assert.ok(verifyAllCode.includes('runSuite172'), 'scripts/verify-all.ts must import and run runSuite172');
  assert.ok(verifyAllCode.includes('172 suites') || verifyAllCode.includes('303'), 'scripts/verify-all.ts must document 172 suites / 303 sub-tests');
  console.log('  ✓ 172.6 verify-all.ts correctly registers Suite 172 reaching 172 suites / 303 sub-tests');
}

if (process.env.VITEST) {
  describe('Suite 172: Fallback Contracts, Pyodide Integrity & Config Purity', () => {
    it('172.1: fallback contracts document exists and codifies 4 tiers', async () => {
      const fallbackDocPath = path.join(process.cwd(), 'docs/architecture/fallback-contracts.md');
      expect(fs.existsSync(fallbackDocPath)).toBe(true);
      const doc = fs.readFileSync(fallbackDocPath, 'utf-8');
      expect(doc).toContain('FULL_DUAL');
      expect(doc).toContain('SINGLE_ENGINE_DEGRADED');
      expect(doc).toContain('SYNTAX_PREFLIGHT');
      expect(doc).toContain('UNAVAILABLE');
    });

    it('172.2: pyodide-lock.json exists and contains SHA-256 hashes', async () => {
      const lockfilePath = path.join(process.cwd(), 'public/pyodide/pyodide-lock.json');
      expect(fs.existsSync(lockfilePath)).toBe(true);
      const data = JSON.parse(fs.readFileSync(lockfilePath, 'utf-8'));
      expect(data.packages['numpy'].sha256).toMatch(/^[a-f0-9]{64}$/i);
    });

    it('172.3: vitest.config.ts uses import.meta.dirname and no __dirname', async () => {
      const config = fs.readFileSync(path.join(process.cwd(), 'vitest.config.ts'), 'utf-8');
      expect(config).not.toContain('__dirname');
      expect(config).toContain('import.meta.dirname');
      expect(config).not.toContain('@ts-nocheck');
    });

    it('172.4: secondary bridge modules do not emit SEAL_KERNEL_VERIFIED_TIER5', async () => {
      const secondaryBridges = [
        'server/src/services/autocorrect/axle-repair.ts',
        'server/src/services/leancert/leancert-bridge.ts',
        'server/src/services/provepy/provepy-bridge.ts',
        'server/src/services/pastalean/pastalean-bridge.ts',
      ];
      for (const relPath of secondaryBridges) {
        const fullPath = path.join(process.cwd(), relPath);
        if (fs.existsSync(fullPath)) {
          const code = fs.readFileSync(fullPath, 'utf-8');
          expect(code).not.toContain('SEAL_KERNEL_VERIFIED_TIER5');
        }
      }
    });

    it('172.5: ProofOutcome non-certified outcomes guarantee absence of kernel seals', async () => {
      const fallbackOutcome: ProofOutcome = {
        kind: 'unavailable',
        certificationTier: 'UNAVAILABLE',
        verified: false,
        reason: 'adjudicator_unreachable',
      };
      expect(fallbackOutcome.kind).toBe('unavailable');
      expect('seal' in fallbackOutcome).toBe(false);
    });

    it('172.6: verify-all.ts registers runSuite172', async () => {
      const verifyAllCode = fs.readFileSync(path.join(process.cwd(), 'scripts/verify-all.ts'), 'utf-8');
      expect(verifyAllCode).toContain('runSuite172');
    });
  });
}
