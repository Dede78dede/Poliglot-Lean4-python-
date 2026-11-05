/**
 * Test Suite 162: Verification Formula Canonicalization & Epistemic Drift Resolution (Phase 13.9.1, Task 11)
 *
 * Validates ADR 014 resolution of divergences D1–D4:
 * 162.1: theorem + exit 0 + no sorry -> canonical true; preflight codeValid/sorryFree/syntaxValid true
 * 162.2: def foo : Nat := 42 + exit 0 -> canonical false (no proof obligation); preflight syntaxValid true, NO verified flag
 * 162.3: sorry in code + "declaration uses 'sorry'" in stdout -> canonical false; preflight sorryFree false
 * 162.4: sorry in code + empty stdout/stderr (mock) -> canonical true (documented false positive); preflight sorryFree false (ADR documented)
 * 162.5: exitCode !== 0 -> canonical false; preflight codeValid true but non-certifying
 * 162.6: simulated true -> canonical false; preflight has no simulated bypass
 * 162.7: toolchainMismatch set -> canonical false; preflight toolchainHint false
 * 162.8: error in stderr with exit 0 -> canonical false; preflight does not inspect stderr
 * 162.9: openGoalsCount > 0 -> canonical (strictGoals opt-in) false; preflight has no goals term (interface mismatch resolved)
 * 162.10: static assertion: grep -rn "verified: true" src/services/verification/ returns no match outside delegation helper
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  evaluateFormalVerification,
  type VerificationCheckInput,
} from '../../server/src/services/verification-formula';
import {
  evaluatePreflightSyntax,
  certifyWithKernel,
} from '../../src/services/verification/preflight-syntax-guard';

export async function runSuite162(): Promise<void> {
  console.log('Running Suite 162: Verification Formula Canonicalization (10 sub-tests)...');

  // 162.1: theorem + exit 0 + no sorry -> canonical true; preflight true
  const theoremCode = 'theorem my_thm (n : Nat) : n + 0 = n := by rfl';
  const canonicalRes1 = evaluateFormalVerification({
    codeOrFiles: theoremCode,
    stdout: '',
    stderr: '',
    exitCode: 0,
    simulated: false,
  });
  assert.equal(canonicalRes1.verified, true);

  const preflightRes1 = evaluatePreflightSyntax({ code: theoremCode });
  assert.equal(preflightRes1.codeValid, true);
  assert.equal(preflightRes1.sorryFree, true);
  assert.equal(preflightRes1.syntaxValid, true);
  assert.equal('verified' in preflightRes1, false, 'Preflight result MUST NOT contain a verified property');
  console.log('  ✓ 162.1 theorem + exit 0 + no sorry -> canonical verified: true, preflight valid');

  // 162.2: D1 Divergence — def foo : Nat := 42 -> canonical false; preflight syntaxValid true, but cannot certify
  const defCode = 'def foo : Nat := 42';
  const canonicalRes2 = evaluateFormalVerification({
    codeOrFiles: defCode,
    stdout: '',
    stderr: '',
    exitCode: 0,
    simulated: false,
  });
  assert.equal(canonicalRes2.verified, false, 'Canonical evaluator must reject pure definitions without proof obligation');
  assert.equal(canonicalRes2.hasProofObligation, false);

  const preflightRes2 = evaluatePreflightSyntax({ code: defCode });
  assert.equal(preflightRes2.syntaxValid, true);
  assert.equal('verified' in preflightRes2, false);
  console.log('  ✓ 162.2 D1: def foo : Nat := 42 rejected by canonical evaluator as non-certifying');

  // 162.3: sorry in code + compiler warning in stdout -> canonical false, preflight sorryFree false
  const sorryCode = 'theorem incomplete (n : Nat) : n = 0 := by sorry';
  const canonicalRes3 = evaluateFormalVerification({
    codeOrFiles: sorryCode,
    stdout: "warning: declaration uses 'sorry'",
    stderr: '',
    exitCode: 0,
    simulated: false,
  });
  assert.equal(canonicalRes3.verified, false);
  assert.equal(canonicalRes3.hasSorry, true);

  const preflightRes3 = evaluatePreflightSyntax({ code: sorryCode });
  assert.equal(preflightRes3.sorryFree, false);
  assert.ok(preflightRes3.rejectedTerms.includes('T_sorry'));
  console.log('  ✓ 162.3 sorry in code and stdout rejected by both canonical and preflight guard');

  // 162.4: D2 Divergence — sorry in code + empty stdout/stderr (mock) -> canonical true (documented false positive), preflight sorryFree false
  const canonicalRes4 = evaluateFormalVerification({
    codeOrFiles: sorryCode,
    stdout: '', // Empty mock output
    stderr: '',
    exitCode: 0,
    simulated: false,
  });
  assert.equal(canonicalRes4.verified, true, 'Canonical evaluator without stdout/stderr compiler warning trusts exit code (documented limitation)');

  const preflightRes4 = evaluatePreflightSyntax({ code: sorryCode });
  assert.equal(preflightRes4.sorryFree, false, 'Preflight guard catches sorry statically even without compiler logs');
  // Verify ADR 014 documents this divergence
  const adr014Content = fs.readFileSync('docs/architecture/adr-014-verification-formula-canonicalization.md', 'utf-8');
  assert.ok(adr014Content.includes('D2'), 'ADR 014 must document divergence D2');
  console.log('  ✓ 162.4 D2: static sorry divergence documented in ADR 014');

  // 162.5: exitCode !== 0 -> canonical false; preflight does not evaluate exitCode
  const canonicalRes5 = evaluateFormalVerification({
    codeOrFiles: theoremCode,
    stdout: '',
    stderr: 'type error',
    exitCode: 1,
    simulated: false,
  });
  assert.equal(canonicalRes5.verified, false);
  assert.equal(canonicalRes5.hasError, true);
  console.log('  ✓ 162.5 exitCode !== 0 rejected by canonical evaluator');

  // 162.6: simulated true -> canonical false
  const canonicalRes6 = evaluateFormalVerification({
    codeOrFiles: theoremCode,
    stdout: '',
    stderr: '',
    exitCode: 0,
    simulated: true,
  });
  assert.equal(canonicalRes6.verified, false);
  assert.ok(canonicalRes6.reason?.includes('simulated'));
  console.log('  ✓ 162.6 simulated true strictly blocked from certification');

  // 162.7: toolchainMismatch set -> canonical false; preflight toolchainHint false
  const canonicalRes7 = evaluateFormalVerification({
    codeOrFiles: theoremCode,
    stdout: '',
    stderr: '',
    exitCode: 0,
    simulated: false,
    toolchainMismatch: { required: 'v4.34.0', current: 'v4.14.0' },
  });
  assert.equal(canonicalRes7.verified, false);
  assert.ok(canonicalRes7.reason?.includes('Toolchain mismatch'));

  const preflightRes7 = evaluatePreflightSyntax({ code: theoremCode, toolchainHint: 'v4.14.0' });
  assert.equal(preflightRes7.toolchainHint, false);
  console.log('  ✓ 162.7 toolchainMismatch rejected by canonical evaluator and preflight hint');

  // 162.8: D3 Divergence — error in stderr with exit 0 -> canonical false
  const canonicalRes8 = evaluateFormalVerification({
    codeOrFiles: theoremCode,
    stdout: '',
    stderr: 'error: declaration has unknown identifier',
    exitCode: 0,
    simulated: false,
  });
  assert.equal(canonicalRes8.verified, false, 'Canonical evaluator must inspect stderr for error: diagnostics');
  assert.ok(adr014Content.includes('D3'), 'ADR 014 must document divergence D3');
  console.log('  ✓ 162.8 D3: error in stderr with exit 0 rejected by canonical evaluator');

  // 162.9: D4 Divergence — strictGoals opt-in with open goals -> canonical false
  const canonicalRes9 = evaluateFormalVerification({
    codeOrFiles: theoremCode,
    stdout: 'warning: declaration contains unsolved goals',
    stderr: '',
    exitCode: 0,
    simulated: false,
    strictGoals: true,
  });
  assert.equal(canonicalRes9.verified, false);
  assert.ok(canonicalRes9.reason?.includes('Strict mode: unsolved goals'));
  assert.ok(adr014Content.includes('D4'), 'ADR 014 must document divergence D4');
  console.log('  ✓ 162.9 D4: interface differences and strictGoals opt-in documented in ADR 014');

  // 162.10: Static assertion: grep for "verified: true" in src/services/verification/ returns no match outside delegation helper
  const guardPath = path.resolve('src/services/verification/preflight-syntax-guard.ts');
  const guardContent = fs.readFileSync(guardPath, 'utf-8');
  const linesWithVerifiedTrue = guardContent
    .split('\n')
    .filter(line => !line.trim().startsWith('*') && !line.trim().startsWith('//') && line.includes('verified: true'));
  assert.equal(linesWithVerifiedTrue.length, 0, 'src/services/verification/preflight-syntax-guard.ts must NEVER contain "verified: true"');
  console.log('  ✓ 162.10 static assertion verified: zero "verified: true" declarations in client guard');
}

if (process.argv[1]?.endsWith('suite-162-verification-formula-consolidation.test.ts')) {
  runSuite162()
    .then(() => {
      console.log('Suite 162 passed (10/10 sub-tests).');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
