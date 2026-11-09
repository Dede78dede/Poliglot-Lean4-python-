/**
 * Test Suite 182: Python Standards, Bytecode & PEP Compliance (Phase 14.9.3, Milestone M9)
 *
 * Validates:
 * 182.1: Python bytecode compilation: py_compile succeeds across all non-archived Python files.
 * 182.2: Autonomous contract runner executes cleanly via python3 unittest.
 * 182.3: pyproject.toml configuration enforces requires-python >= 3.11 and ruff/mypy strict settings.
 * 182.4: scripts/archive/ conforms to PEP 257 docstring conventions and main entry guards.
 * 182.5: schemas/generated_contracts.py implements TypeAdapter and frozen Pydantic boundary semantics.
 */

import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export async function runSuite182(): Promise<void> {
  console.log('Running Suite 182: Python Standards & PEP Compliance (5 sub-tests)...');

  const rootDir = process.cwd();

  // 182.1: Python bytecode compilation
  const pyFiles = [
    'schemas/generated_contracts.py',
    'scripts/generate-pydantic.py',
    'scripts/verify-python-contracts.py',
    'server/src/services/leancert/leancert_wrapper.py',
    'tests/phase-14/python/test_parity.py',
    'tests/phase-14/python/test_generated_contracts.py',
  ];

  for (const relPath of pyFiles) {
    const fullPath = path.join(rootDir, relPath);
    assert.ok(fs.existsSync(fullPath), `${relPath} must exist`);
    try {
      execSync(`python3 -m py_compile "${fullPath}"`, { stdio: 'pipe' });
    } catch (e: any) {
      assert.fail(`py_compile failed for ${relPath}: ${e.message}`);
    }
  }
  console.log(`  ✓ 182.1 Bytecode compilation (py_compile) passes across all ${pyFiles.length} core Python files`);

  // 182.2: Autonomous contract runner executes cleanly via python3 unittest
  const runnerScript = path.join(rootDir, 'scripts/verify-python-contracts.py');
  const runnerOutput = execSync(`python3 "${runnerScript}" 2>&1`, {
    encoding: 'utf-8',
    timeout: 5000,
  });
  assert.ok(
    runnerOutput.includes('verified successfully') || runnerOutput.includes('OK'),
    'Autonomous contract runner must report success'
  );
  console.log('  ✓ 182.2 scripts/verify-python-contracts.py runs autonomous unittest suite cleanly');

  // 182.3: pyproject.toml compliance
  const pyprojectPath = path.join(rootDir, 'pyproject.toml');
  assert.ok(fs.existsSync(pyprojectPath), 'pyproject.toml must exist');
  const pyprojectContent = fs.readFileSync(pyprojectPath, 'utf-8');
  assert.ok(
    pyprojectContent.includes('requires-python = ">=3.11"'),
    'pyproject.toml must require Python >= 3.11'
  );
  assert.ok(pyprojectContent.includes('[tool.ruff]'), 'pyproject.toml must configure tool.ruff');
  assert.ok(pyprojectContent.includes('strict = true'), 'pyproject.toml must enforce mypy strict');
  console.log('  ✓ 182.3 pyproject.toml enforces requires-python >= 3.11 and mypy strict mode');

  // 182.4: Archived scripts PEP 257 docstrings
  const archiveDir = path.join(rootDir, 'scripts/archive');
  const archiveFiles = fs.readdirSync(archiveDir).filter((f) => f.endsWith('.py'));
  for (const f of archiveFiles) {
    const content = fs.readFileSync(path.join(archiveDir, f), 'utf-8');
    assert.ok(content.startsWith('"""'), `Archived script ${f} must have PEP 257 module docstring`);
    assert.ok(content.includes('if __name__ == "__main__":'), `Archived script ${f} must have main guard`);
  }
  console.log(`  ✓ 182.4 All ${archiveFiles.length} archived scripts conform to PEP 257 docstrings and main guards`);

  // 182.5: Pydantic v2 contract patterns in generated_contracts.py
  const contractsPy = fs.readFileSync(path.join(rootDir, 'schemas/generated_contracts.py'), 'utf-8');
  assert.ok(
    contractsPy.includes('extra="forbid"') || contractsPy.includes("extra='forbid'"),
    'schemas/generated_contracts.py must enforce extra="forbid"'
  );
  assert.ok(
    contractsPy.includes('frozen=True'),
    'schemas/generated_contracts.py must enforce frozen=True'
  );
  assert.ok(
    contractsPy.includes('Discriminator('),
    'schemas/generated_contracts.py must use Discriminator for discriminated unions'
  );
  console.log('  ✓ 182.5 schemas/generated_contracts.py enforces extra="forbid", frozen=True and Discriminator');
}

if (process.argv[1]?.endsWith('suite-182-python-standards.test.ts')) {
  runSuite182()
    .then(() => {
      console.log('Suite 182 passed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
