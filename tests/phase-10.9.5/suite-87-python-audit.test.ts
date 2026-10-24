import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runPyodideStackSpec } from '../e2e/pyodide-stack.spec';
import { evaluatePythonCompatibility } from '../../src/services/discovery/PythonDependencyResolver';
import { runPastaBenchRoundTrip } from './round-trip.test';
import { femevEngine } from '../../src/services/femev/femev-engine';

export async function runSuite87(): Promise<void> {
  console.log('\n--- Test Suite 87: Python Scientific Stack Audit & Round-Trip ---');

  // 87.1: Scientific stack documentation audit
  const doc = fs.readFileSync('docs/reference/python-scientific-stack.md', 'utf-8');
  assert.ok(doc.includes('Pyodide 314.0.7'));
  assert.ok(doc.includes('numpy'));
  assert.ok(doc.includes('scipy'));
  assert.ok(doc.includes('sympy'));
  assert.ok(doc.includes('mpmath'));
  assert.ok(doc.includes('z3-solver'));
  assert.ok(doc.includes('Asymmetric Trust Model'));
  assert.ok(doc.includes('SEAL_KERNEL_VERIFIED_TIER5'));
  console.log('  ✓ 87.1 docs/reference/python-scientific-stack.md documents Pyodide 314.0.7 & 5 core packages');

  // 87.2: Run E2E scientific stack specification (numpy, sympy, mpmath, z3-solver, scipy)
  await runPyodideStackSpec();
  console.log('  ✓ 87.2 E2E scientific stack specification passes for all 5 core packages');

  // 87.3: Reject incompatible C/CUDA packages (torch, cuda-python)
  const invalidReqs = 'torch>=2.2.0\ncuda-python>=12.0\n';
  const invalidReport = evaluatePythonCompatibility([
    { path: 'requirements.txt', content: invalidReqs },
  ]);
  assert.equal(invalidReport.status, 'mismatch');
  assert.equal(invalidReport.verifiedAllowed, false);
  assert.equal(invalidReport.pythonAnalysis?.hasUnsupportedCExtensions, true);
  console.log('  ✓ 87.3 Incompatible C/CUDA libraries properly rejected from verification pipeline');

  // 87.4: PastaBench 10-problem round-trip achieves >= 8/10 (>=80%) success rate
  const benchResult = await runPastaBenchRoundTrip();
  assert.equal(benchResult.total, 10);
  assert.ok(benchResult.passed >= 8, `PastaBench must pass >= 8 problems (actual: ${benchResult.passed}/10)`);
  assert.ok(benchResult.successRatePct >= 80);
  console.log(`  ✓ 87.4 PastaBench round-trip achieved ${benchResult.passed}/10 (${benchResult.successRatePct}%) fidelity`);

  // 87.5: Asymmetric Trust Invariant: Python execution alone cannot mark proof as verified
  const pyCode = femevEngine.generatePythonExplorationCode();
  assert.ok(pyCode.includes('import numpy as np'));
  const engineState = femevEngine.getState();
  assert.notEqual(engineState.activePhase, 'formal_proof');
  assert.equal(engineState.phase4Certificate, undefined, 'Python execution cannot create formal proof certificate');
  console.log('  ✓ 87.5 Asymmetric trust invariant verified: Python generates evidence, never formal seals');
}
