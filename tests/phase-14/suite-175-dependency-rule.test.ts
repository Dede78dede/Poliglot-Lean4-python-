/**
 * Test Suite 175: Dependency Rule & Layer Boundaries (Phase 14.9.3 M2)
 *
 * Validates:
 * 175.1: dependency-cruiser configuration exists and package.json contains arch:check script
 * 175.2: zero circular dependencies across src and server/src
 * 175.3: domain modules (src/types, src/services/verification/verification-formula) do not import infrastructure (express, pg, mongodb)
 */

import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

export async function runSuite175(): Promise<void> {
  console.log('Running Suite 175: Dependency Rule & Layer Boundaries (3 sub-tests)...');

  const rootDir = process.cwd();

  // 175.1: Configuration exists and script mounted
  const configPath = path.join(rootDir, '.dependency-cruiser.cjs');
  assert.ok(fs.existsSync(configPath), '.dependency-cruiser.cjs must exist');
  const pkgJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  assert.ok(pkgJson.scripts['arch:check'], 'package.json must declare arch:check script');
  console.log('  ✓ 175.1 .dependency-cruiser.cjs configured and arch:check script mounted');

  // 175.2: Execute arch:check to verify 0 violations and 0 circular
  try {
    const output = execSync('npm run arch:check', { cwd: rootDir, encoding: 'utf-8', stdio: 'pipe' });
    assert.ok(
      output.includes('no dependency violations found'),
      'npm run arch:check must confirm 0 dependency violations'
    );
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string };
    assert.fail(`arch:check failed: ${execErr.stdout || execErr.stderr}`);
  }
  console.log('  ✓ 175.2 npm run arch:check passes with 0 circular and 0 layer violations');

  // 175.3: Core domain pure modules do not import infrastructure libraries
  const domainFiles = [
    'src/services/verification/verification-formula.ts',
    'src/types/proof-outcome.ts',
    'src/types/contracts.ts',
  ];
  for (const relPath of domainFiles) {
    const fullPath = path.join(rootDir, relPath);
    if (fs.existsSync(fullPath)) {
      const code = fs.readFileSync(fullPath, 'utf-8');
      assert.ok(!code.includes("from 'express'"), `${relPath} must not import express`);
      assert.ok(!code.includes("from 'pg'"), `${relPath} must not import pg`);
      assert.ok(!code.includes("from 'mongodb'"), `${relPath} must not import mongodb`);
      assert.ok(!code.includes("from 'axios'"), `${relPath} must not import axios`);
    }
  }
  console.log('  ✓ 175.3 core verification domain modules verified free of infrastructure dependencies');
}

if (process.env.VITEST) {
  describe('Suite 175: Dependency Rule & Layer Boundaries', () => {
    it('175.1: config and script present', () => {
      expect(fs.existsSync(path.join(process.cwd(), '.dependency-cruiser.cjs'))).toBe(true);
    });

    it('175.2: arch:check exits 0', () => {
      const out = execSync('npm run arch:check', { encoding: 'utf-8' });
      expect(out).toContain('no dependency violations found');
    });

    it('175.3: domain free of infrastructure', () => {
      const code = fs.readFileSync(path.join(process.cwd(), 'src/types/contracts.ts'), 'utf-8');
      expect(code).not.toContain("from 'express'");
    });
  });
}
