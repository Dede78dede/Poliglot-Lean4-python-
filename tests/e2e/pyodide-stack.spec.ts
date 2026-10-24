/**
 * E2E Specification: Pyodide Scientific Stack Audit (Phase 10.9.5, Task P1)
 *
 * Verifies compatibility, tier classification, and metadata for the 5 core scientific packages:
 * numpy, sympy, mpmath, z3-solver, and scipy.
 */

import assert from 'node:assert/strict';
import {
  parseRequirementsTxt,
  evaluatePythonCompatibility,
} from '../../src/services/discovery/PythonDependencyResolver';
import { packageTierClassifier } from '../../src/services/discovery/package-tier-classifier';

export async function runPyodideStackSpec(): Promise<void> {
  console.log('\n--- E2E Spec: Pyodide 314.0.7 Scientific Stack Audit ---');

  const corePackages = ['numpy', 'sympy', 'mpmath', 'z3-solver', 'scipy'];

  // 1. Verify requirements parsing recognizes all 5 packages as WASM-compatible
  const reqContent = [
    'numpy>=2.1.0',
    'sympy>=1.13.2',
    'mpmath>=1.3.0',
    'z3-solver>=4.13.0',
    'scipy>=1.14.1',
  ].join('\n');

  const parsed = parseRequirementsTxt(reqContent);
  assert.equal(parsed.length, 5);
  for (const pkg of parsed) {
    assert.equal(pkg.isWasmSupported, true, `Package ${pkg.name} must be flagged as WASM-supported`);
  }
  console.log('  ✓ All 5 core scientific packages parsed and confirmed as WASM-supported');

  // 2. Full project compatibility assessment passes with status: compatible
  const compatReport = evaluatePythonCompatibility([
    { path: 'requirements.txt', content: reqContent },
  ]);
  assert.equal(compatReport.status, 'compatible');
  assert.equal(compatReport.verifiedAllowed, true);
  assert.equal(compatReport.pythonAnalysis?.hasUnsupportedCExtensions, false);
  console.log('  ✓ evaluatePythonCompatibility returns status: compatible for scientific stack');

  // 3. Package tier classification
  for (const name of corePackages) {
    const tier = packageTierClassifier.classify(name);
    assert.ok(tier === 'tier1' || tier === 'tier2', `Package ${name} must be classified as Tier 1 or Tier 2`);
  }
  console.log('  ✓ Core scientific packages classified as Tier 1 or Tier 2');
}
