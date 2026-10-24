import assert from 'node:assert/strict';
import { leanFormatterService } from '../../src/services/lean-tooling/formatter';
import { heronLinterService } from '../../src/services/lean-tooling/linter';
import { lSpecRunnerService } from '../../src/services/lean-tooling/lspec-runner';
import { docGenService } from '../../src/services/lean-tooling/docgen';
import { versoBlueprintService } from '../../src/services/lean-tooling/verso';

export async function runSuite70(): Promise<void> {
  console.log('\n--- Test Suite 70: Phase B — Lean Tooling ---');

  // 70.1: Formatter returns FORMATTER_UNAVAILABLE if no tool is verified
  leanFormatterService.setEnabled(false);
  leanFormatterService.setToolVerified(false);
  await assert.rejects(
    async () => {
      await leanFormatterService.formatLean('def f : Nat := 1');
    },
    (err: Error) => {
      assert.ok(err.message.includes('FORMATTER_UNAVAILABLE'));
      return true;
    }
  );

  // Formats cleanly with conservative indentation when verified
  leanFormatterService.setEnabled(true);
  const formatted = await leanFormatterService.formatLean('def f : Nat :=\nby\nrfl\n');
  assert.ok(formatted.includes('  by'));
  leanFormatterService.setEnabled(false);
  console.log('  ✓ 70.1 Formatter returns FORMATTER_UNAVAILABLE when unverified; formats cleanly when enabled');

  // 70.2: Heron feature flag off by default; ENABLE_HERON=true requires fork container
  assert.equal(heronLinterService.isEnabled(), false);
  const heronDiagsDisabled = await heronLinterService.lintLean('def f : Nat := (1 : Nat)');
  assert.equal(heronDiagsDisabled.length, 0);

  heronLinterService.setEnabled(true);
  const heronDiagsEnabled = await heronLinterService.lintLean('def f : Nat := (1 : Nat)');
  assert.ok(heronDiagsEnabled.length >= 1);
  assert.equal(heronDiagsEnabled[0]!.ruleId, 'HERON_002_REDUNDANT_COERCION');

  const refactored = await heronLinterService.applyRefactor(
    'def f : Nat := (1 : Nat)',
    heronDiagsEnabled[0]!.suggestedRefactorId!
  );
  assert.ok(refactored.includes(':= 1'));
  heronLinterService.setEnabled(false);
  console.log('  ✓ 70.2 Heron feature flag off by default; refactors verified when enabled with fork');

  // 70.3: LSpec runs 3 tests and returns pass/fail per declaration
  const lspecRes = await lSpecRunnerService.runTests('/workspace/projects/math_test');
  assert.equal(lspecRes.totalTests, 3);
  assert.equal(lspecRes.passedCount, 3);
  assert.equal(lspecRes.failedCount, 0);
  assert.equal(lspecRes.exitCode, 0);
  assert.ok(lspecRes.tests.some((t) => t.declarationName === 'TestAddComm'));
  console.log('  ✓ 70.3 LSpec runs 3 tests with per-declaration pass/fail reporting');

  // 70.4: doc-gen4 generates HTML in build/doc
  const docRes = await docGenService.generateDocs({
    projectId: 'topology_project',
    moduleName: 'Mathlib.Topology.Basic',
  });
  assert.equal(docRes.outputDirectory, './build/doc');
  assert.ok(docRes.generatedHtmlPath.includes('build/doc/Mathlib.Topology.Basic.html'));
  assert.ok(docRes.totalDeclarationsDocumented > 0);

  const lakefileToml = docGenService.generateDocbuildLakefile('topology_project');
  assert.ok(lakefileToml.includes('name = "docbuild"'));
  assert.ok(lakefileToml.includes('doc-gen4'));
  console.log('  ✓ 70.4 doc-gen4 generates HTML in build/doc with docbuild subdirectory configuration');

  // 70.5: Verso Blueprint builds HTML and returns graph data
  assert.equal(versoBlueprintService.isEnabled(), false);
  const versoDisabled = await versoBlueprintService.buildBlueprint('/workspace/projects/verso_test');
  assert.equal(versoDisabled.success, false);
  assert.ok(versoDisabled.error?.includes('VERSO_DISABLED'));

  versoBlueprintService.setEnabled(true);
  const versoEnabled = await versoBlueprintService.buildBlueprint('/workspace/projects/verso_test');
  assert.equal(versoEnabled.success, true);
  assert.ok(versoEnabled.htmlOutput.includes('-verso-data/build/html/index.html'));

  const graphData = await versoBlueprintService.getGraphData('/workspace/projects/verso_test');
  assert.equal(graphData.version, 'v4.33.0');
  assert.ok(graphData.nodes.length >= 3);
  assert.ok(graphData.edges.length >= 2);
  versoBlueprintService.setEnabled(false);
  console.log('  ✓ 70.5 Verso Blueprint v4.33.0 builds HTML and exposes graph API (api/graph.mjs)');
}
