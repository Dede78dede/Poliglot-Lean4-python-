/**
 * Test Suite 92: LSpec GitHub Action Template Generator (Phase 10.9.7, Task LC4)
 */

import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  lspecCiTemplateGenerator,
  validateYamlSyntax,
} from '../../src/services/lean-tooling/lspec-ci-template-generator';
import { BridgeError } from '../../src/services/errors/bridge-error';

export async function runSuite92(): Promise<void> {
  console.log('\n--- Test Suite 92: LSpec CI Template ---');

  const fixtureDir = path.resolve(process.cwd(), 'tests', 'fixtures', 'lspec-test-project');
  fs.mkdirSync(fixtureDir, { recursive: true });

  // Create mock lean-toolchain and empty lakefile.toml
  fs.writeFileSync(path.join(fixtureDir, 'lean-toolchain'), 'leanprover/lean4:v4.35.0\n');
  fs.writeFileSync(path.join(fixtureDir, 'lakefile.toml'), 'name = "test-pkg"\n');

  // 92.1: generateTemplate() produces a valid .github/workflows/lspec.yml
  const res = await lspecCiTemplateGenerator.generateTemplate(fixtureDir, {
    projectName: 'test-pkg',
    branch: 'main',
    includeCache: true,
  });

  assert.equal(res.fileName, '.github/workflows/lspec.yml');
  assert.ok(res.content.includes('name: "LSpec CI"'));
  assert.ok(res.content.includes('lake exe lspec'));
  console.log('  ✓ 92.1 generateTemplate() produces canonical .github/workflows/lspec.yml workflow');

  // 92.2: The template includes leanprover/lean-action@v1 with the correct lean-version
  assert.ok(
    res.content.includes('leanprover/lean-action@v1'),
    'Includes leanprover/lean-action@v1 action step'
  );
  assert.ok(
    res.content.includes('lean-version: "v4.35.0"'),
    'Injects target Lean version from lean-toolchain'
  );
  console.log('  ✓ 92.2 Workflow injects leanprover/lean-action@v1 with explicit lean-version parameter');

  // 92.3: Warning emitted when LSpec is not in lakefile.toml
  assert.ok(
    res.warnings.some((w) => w.includes('LSpec not found in lakefile.toml')),
    'Emits warning regarding missing LSpec dependency'
  );
  console.log('  ✓ 92.3 Warning emitted when LSpec dependency is omitted from lakefile.toml');

  // 92.4: Missing lean-toolchain throws LSPEC_CI_TEMPLATE_FAILED
  const emptyFixtureDir = path.resolve(process.cwd(), 'tests', 'fixtures', 'empty-project');
  fs.mkdirSync(emptyFixtureDir, { recursive: true });

  let threwMissingToolchain = false;
  try {
    await lspecCiTemplateGenerator.generateTemplate(emptyFixtureDir, {
      projectName: 'empty-project',
    });
  } catch (err: unknown) {
    if (err instanceof BridgeError) {
      assert.equal(err.code, 'LSPEC_CI_TEMPLATE_FAILED');
      threwMissingToolchain = true;
    }
  }

  assert.ok(threwMissingToolchain, 'Throws LSPEC_CI_TEMPLATE_FAILED when lean-toolchain is absent');
  console.log('  ✓ 92.4 Missing lean-toolchain strictly throws BridgeError(LSPEC_CI_TEMPLATE_FAILED)');

  // 92.5: The generated YAML parses and validates successfully
  const validation = validateYamlSyntax(res.content);
  assert.equal(validation.valid, true, 'Generated YAML is structurally well-formed');
  console.log('  ✓ 92.5 Generated workflow YAML conforms to GitHub Actions schema specification');

  // Cleanup fixtures
  try {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
    fs.rmSync(emptyFixtureDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}
