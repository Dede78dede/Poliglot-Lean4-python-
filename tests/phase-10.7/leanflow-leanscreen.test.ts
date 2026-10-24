import assert from 'node:assert/strict';
import {
  leanFlowBridge,
  LeanFlowBridge,
  type LeanFlowFormalizeRequest,
  type LeanFlowProveRequest,
} from '../../server/src/services/leanflow/leanflow-bridge';
import {
  leanScreenBridge,
  LeanScreenBridge,
} from '../../server/src/services/leanscreen/leanscreen-bridge';
import {
  latexIngestionService,
  LatexIngestionService,
} from '../../server/src/services/latex/latex-ingestion';

export async function runSuite35(): Promise<void> {
  console.log('\n--- Test Suite 35: LeanFlow Autoformalization, leanscreen Fidelity & LaTeX Ingestion ---');

  // 35.1: LeanFlow formalize/prove + aliases (autoformalize, autoprove)
  const latexDoc = `
\\documentclass{article}
\\begin{document}
\\begin{theorem}[Infinitude of Primes]\\label{thm:primes_inf}
There are infinitely many prime numbers.
\\end{theorem}
\\begin{lemma}[Prime Divisor]\\label{lem:prime_div}
Every integer $n > 1$ has at least one prime divisor.
\\end{lemma}
\\end{document}
`;

  const formalizeRes = await leanFlowBridge.formalize({
    sourcePath: 'docs/primes.tex',
    projectName: 'NumberTheory',
    provider: 'lemex',
    latexSource: latexDoc,
  });

  assert.equal(formalizeRes.projectPath, '/workspace/projects/NumberTheory');
  assert.equal(formalizeRes.declarations.length, 2);
  assert.ok(formalizeRes.sourceMap['thm:primes_inf']);
  assert.ok(formalizeRes.sourceMap['lem:prime_div']);
  assert.equal(formalizeRes.residualSorries, 2);

  // Test aliases (C3: autoformalize = formalize, autoprove = prove)
  const aliasFormalizeRes = await leanFlowBridge.autoformalize({
    sourcePath: 'docs/primes.tex',
    projectName: 'NumberTheory',
    latexSource: latexDoc,
  });
  assert.equal(aliasFormalizeRes.declarations.length, 2);

  const proveRes = await leanFlowBridge.prove({
    projectPath: formalizeRes.projectPath,
    researchWorkers: 3,
    cleanRoom: true,
  });
  assert.equal(proveRes.proved, 1);
  assert.equal(proveRes.remainingSorries, 0);
  assert.ok(proveRes.checkpoints.length >= 2);

  const aliasProveRes = await leanFlowBridge.autoprove({
    projectPath: formalizeRes.projectPath,
  });
  assert.equal(aliasProveRes.proved, 1);
  console.log('  ✓ 35.1 LeanFlow formalize/prove and CLI aliases (autoformalize/autoprove) verified');

  // 35.2: LeanFlow Lemex provider config and limits (250 agent calls, 24h)
  assert.equal(leanFlowBridge.defaultProvider, 'lemex');
  assert.equal(leanFlowBridge.defaultAgentCallsLimit, 250);
  assert.equal(leanFlowBridge.defaultProverCallsLimit, 200);
  assert.equal(leanFlowBridge.defaultOrchestrationCallsLimit, 50);
  assert.equal(leanFlowBridge.defaultWallTimeLimitS, 86400);

  // Test status retrieval with limits
  const runStatus = await leanFlowBridge.getStatus('run-mock-1');
  assert.equal(runStatus.agentCallsLimit, 250);
  assert.equal(runStatus.wallTimeLimitS, 86400);
  console.log('  ✓ 35.2 LeanFlow Lemex provider configuration and default limits (250 calls, 24h) verified');

  // 35.3: leanscreen check_fast deterministic screening (vacuity, unused binders, Nat underflows)
  // Pair 1: Vacuous goal (trivially True)
  const vacuousPair = {
    informal: 'Every natural number is greater than zero.',
    lean: 'theorem nat_gt_zero (n : Nat) : True := by trivial',
  };
  const fastVacuous = await leanScreenBridge.checkFast(vacuousPair);
  assert.equal(fastVacuous.passed, false);
  assert.equal(fastVacuous.exitCode, 1);
  assert.ok(fastVacuous.vacuityIssues.some((v) => v.includes('trivially True')));
  assert.ok(fastVacuous.disclaimer.includes('leanscreen screens only, never certifies'));

  // Pair 2: Unused binder
  const unusedBinderPair = {
    informal: 'Addition is commutative for integers.',
    lean: 'theorem add_comm (x : Int) (unused : Int) : x = x := by rfl',
  };
  const fastUnused = await leanScreenBridge.checkFast(unusedBinderPair);
  assert.ok(fastUnused.lintWarnings.some((w) => w.includes('unused')));

  // Pair 3: Suspicious Nat subtraction underflow
  const natSubPair = {
    informal: 'Difference between numbers.',
    lean: 'def diff (n m : Nat) : Nat := n - m',
  };
  const fastNatSub = await leanScreenBridge.checkFast(natSubPair);
  assert.ok(fastNatSub.lintWarnings.some((w) => w.includes('ℕ-arithmetic subtraction')));

  // Pair 4: Sound and faithful statement
  const soundPair = {
    informal: 'Addition is commutative on Nat.',
    lean: 'theorem add_comm (a b : Nat) : a + b = b + a := Nat.add_comm a b',
  };
  const fastSound = await leanScreenBridge.checkFast(soundPair);
  assert.equal(fastSound.passed, true);
  assert.equal(fastSound.exitCode, 0);
  assert.equal(fastSound.vacuityIssues.length, 0);
  console.log('  ✓ 35.3 leanscreen check_fast deterministic screening (vacuity, unused binders, Nat underflows) verified');

  // 35.4: leanscreen check_deep dual judge consensus and budget cap
  const deepSound = await leanScreenBridge.checkDeep(soundPair, 2.0);
  assert.equal(deepSound.judgesConsensus, true);
  assert.equal(deepSound.judgeVerdicts.length, 2);
  assert.equal(deepSound.counterexampleFound, false);
  assert.equal(deepSound.budgetExceeded, false);
  assert.ok(deepSound.estimatedCostUsd > 0 && deepSound.estimatedCostUsd < 1.0);

  // Budget cap enforcement
  const deepLowBudget = await leanScreenBridge.checkDeep(soundPair, 0.05); // Budget below cost
  assert.equal(deepLowBudget.budgetExceeded, true);
  assert.equal(deepLowBudget.passed, false);
  assert.equal(deepLowBudget.exitCode, 2);
  console.log('  ✓ 35.4 leanscreen check_deep dual judge consensus and budget cap enforcement verified');

  // 35.5: span alignment ledger generation (build/<paper>.lea) and validation
  const envs = latexIngestionService.extractEnvironments(latexDoc);
  assert.equal(envs.length, 2);
  assert.equal(envs[0]!.label, 'thm:primes_inf');
  assert.equal(envs[1]!.label, 'lem:prime_div');

  const formalDict: Record<string, { fqn: string; hasSorry: boolean }> = {
    'thm:primes_inf': { fqn: 'NumberTheory.Infinitude_of_Primes', hasSorry: true },
    'lem:prime_div': { fqn: 'NumberTheory.Prime_Divisor', hasSorry: false },
  };

  const ledger = latexIngestionService.generateSpanLedger('primes_paper', envs, formalDict);
  assert.equal(ledger.filePath, 'build/primes_paper.lea');
  assert.equal(ledger.totalTheorems, 2);
  assert.equal(ledger.formalizedCount, 2);
  assert.equal(ledger.provedCount, 1);
  assert.equal(ledger.formalizationCoveragePct, 100);
  assert.equal(ledger.entries[0]!.status, 'drafted');
  assert.equal(ledger.entries[1]!.status, 'proved');
  console.log('  ✓ 35.5 span alignment ledger generation (build/<paper>.lea) and validation verified');

  // 35.6: latex2sympy2 / py-nabla formula parsing
  const fractionLatex = '\\frac{a + b}{c}';
  const sympyRes = latexIngestionService.translateLatexToSympy(fractionLatex);
  assert.ok(sympyRes.sympyExpression.includes('(a + b)/(c)'));
  assert.ok(sympyRes.freeSymbols.includes('a'));
  assert.ok(sympyRes.freeSymbols.includes('b'));
  assert.ok(sympyRes.freeSymbols.includes('c'));
  assert.ok(sympyRes.pythonCode.includes('import sympy as sp'));

  // Test Nabla vector calculus operator parsing
  const nablaCurl = '\\nabla \\times \\vec{F}';
  const nablaRes = latexIngestionService.parseNablaOperator(nablaCurl);
  assert.equal(nablaRes.operatorType, 'curl');
  assert.equal(nablaRes.symbolicForm, 'curl(F)');
  assert.ok(nablaRes.pythonExecutable.includes('sp.diff(F[2], y)'));

  const nablaLaplacian = '\\Delta u = 0';
  const laplaceRes = latexIngestionService.parseNablaOperator(nablaLaplacian);
  assert.equal(laplaceRes.operatorType, 'laplacian');
  assert.ok(laplaceRes.pythonExecutable.includes('sp.diff(u, x, 2)'));
  console.log('  ✓ 35.6 latex2sympy2 and py-nabla symbolic formula & calculus parsing verified');

  // 35.7: Toolchain preservation via elan override
  const projectWithCustomToolchain = await leanFlowBridge.formalize({
    sourcePath: 'docs/custom.tex',
    projectName: 'CustomToolchainProject',
    toolchain: 'v4.34.1',
    latexSource: '\\begin{theorem}\\label{t1}Statement\\end{theorem}',
  });
  assert.equal(projectWithCustomToolchain.toolchainUsed, 'v4.34.1');
  console.log('  ✓ 35.7 Target Lean project toolchain preservation via elan override validated');

  // 35.8: End-to-end document-to-Lean pipeline with faithfulness gate
  // Step 1: LaTeX document ingestion & theorem extraction
  const rawPaper = `
\\begin{theorem}[Euler Identity]\\label{thm:euler}
$e^{i\\pi} + 1 = 0$
\\end{theorem}
`;
  const paperEnvs = latexIngestionService.extractEnvironments(rawPaper);
  assert.equal(paperEnvs.length, 1);

  // Step 2: LeanFlow autoformalization draft
  const autoDraft = await leanFlowBridge.formalize({
    sourcePath: 'docs/euler.tex',
    projectName: 'Analysis',
    latexSource: rawPaper,
  });
  assert.equal(autoDraft.residualSorries, 1);

  // Step 3: Semantic sanity screening with leanscreen
  const screenDraft = await leanScreenBridge.checkFast({
    informal: autoDraft.declarations[0]!.statement,
    lean: autoDraft.declarations[0]!.leanStatement,
  });
  assert.equal(screenDraft.passed, false); // Contains intentional sorry and True hole
  assert.ok(screenDraft.vacuityIssues.length > 0);

  // Step 4: LeanFlow proving fills hole
  const proveEuler = await leanFlowBridge.prove({
    projectPath: autoDraft.projectPath,
  });
  assert.equal(proveEuler.proved, 1);
  assert.equal(proveEuler.remainingSorries, 0);

  // Step 5: Final span ledger generation
  const finalLedger = latexIngestionService.generateSpanLedger('Analysis', paperEnvs, {
    'thm:euler': { fqn: 'Analysis.Euler_Identity', hasSorry: false },
  });
  assert.equal(finalLedger.provedCount, 1);
  assert.equal(finalLedger.formalizationCoveragePct, 100);
  console.log('  ✓ 35.8 End-to-end document-to-Lean autoformalization pipeline with faithfulness gate validated');
}
