import assert from 'node:assert/strict';
import { multiKernelVerifier } from '../../src/services/verification/multi-kernel-verifier';
import { femevEngine } from '../../src/services/femev/femev-engine';
import { AutoLeanServer, LeanServerPool } from '../../server/src/services/lean/lean-interact-bridge';
import { veriphyClient } from '../../server/src/services/autocorrect/veriphy-client';
import { AVAILABLE_LEAN_TOOLCHAINS } from '../../server/src/config/lean-runner-config';

async function runFemevSoundnessTests(): Promise<void> {
  console.log('--- Test Suite 33: FEMEV Integration & Kernel Soundness Hardening ---');

  // Test 33.1: Fail-Closed Multi-Kernel Check when external paranoid runner binaries are unavailable locally
  {
    const paranoidResult = await multiKernelVerifier.verifyMultiKernel({
      projectRoot: '/test/workspace',
      leanCode: 'theorem add_comm (n m : Nat) : n + m = m + n := Nat.add_comm n m',
      toolchain: 'v4.35.0',
      paranoid: true,
      useSandbox: true,
    });

    assert.equal(paranoidResult.verified, false, 'Must fail closed without real kernel consensus runner');
    assert.equal(paranoidResult.multiKernelStatus, 'unavailable', 'Status must be unavailable');
    assert.equal(paranoidResult.kernelsUsed.length, 0, 'No synthetic kernels may be reported as executed');
    assert.equal(paranoidResult.paranoidCheckPassed, false);
    assert.equal(paranoidResult.cve2026_72844Status, 'not_affected');
    assert.ok(paranoidResult.error?.toLowerCase().includes('unavailable'));
    console.log('  ✓ 33.1: Multi-Kernel check strictly fails closed when external kernel runners are unavailable');
  }

  // Test 33.2: Rejection on Kernel Disagreement (KERNEL_DISAGREEMENT)
  {
    const disagreementResult = await multiKernelVerifier.verifyMultiKernel({
      projectRoot: '/test/workspace',
      leanCode: 'axiom false_proof : False',
      toolchain: 'v4.35.0',
      paranoid: true,
      useSandbox: true,
      simulateDisagreement: true,
    });

    assert.equal(disagreementResult.verified, false, 'Disagreement must block verification');
    assert.equal(disagreementResult.multiKernelStatus, 'disagreement');
    assert.ok(disagreementResult.kernelDisagreements.length > 0, 'Disagreements array must not be empty');
    assert.ok(disagreementResult.error?.includes('KERNEL_DISAGREEMENT'), 'Error must contain KERNEL_DISAGREEMENT code');
    assert.equal(disagreementResult.paranoidCheckPassed, false);
    console.log('  ✓ 33.2: Kernel Disagreement rejection & KERNEL_DISAGREEMENT diagnosis verified');
  }

  // Test 33.3: Sandbox Policy Enforcement
  {
    await assert.rejects(
      async () => {
        await multiKernelVerifier.verifyMultiKernel({
          projectRoot: '/test/workspace',
          leanCode: 'theorem test : True := trivial',
          toolchain: 'v4.35.0',
          paranoid: true,
          useSandbox: false, // Inadvisable no-sandbox strictly prohibited
        });
      },
      /SANDBOX_POLICY_VIOLATION/,
      'Must reject execution when useSandbox is false'
    );

    // Also check command builder denies --inadvisably-no-sandbox
    assert.throws(
      () => {
        multiKernelVerifier.buildLakeCheckCommand({
          toolchain: 'v4.35.0',
          paranoid: true,
          useSandbox: false,
        });
      },
      /SANDBOX_POLICY_VIOLATION/,
      'Lake check command builder must deny --inadvisably-no-sandbox'
    );
    console.log('  ✓ 33.3: Sandbox Policy Enforcement (no --inadvisably-no-sandbox) verified');
  }

  // Test 33.4: Local Extended SEAL_KERNEL_VERIFIED_TIER5 Certificate Minting Blocked + SHA-256 Digest Helper
  {
    assert.throws(
      () => {
        multiKernelVerifier.generateExtendedCertificate({
          nodeId: 'node-feigenbaum-001',
          theoremStatement: 'theorem feigenbaum_delta_positive : δ > 4.6 := by sorry',
          proofContent: 'decide',
          toolchain: 'v4.35.0',
          paranoid: true,
          kernelsUsed: [
            'leanchecker',
            'nanoda',
            'lean4lean',
            'con-leche',
            'con-ron',
            'leanchecker-hardened',
          ],
          signerIdentity: 'POLYGLOT-STUDIO-SEAL_KERNEL_VERIFIED_TIER5',
        });
      },
      /CERTIFICATION_AUTHORITY_DENIED/,
      'Client MultiKernelVerifier must refuse to mint Tier-5 certificates'
    );

    const digest = await multiKernelVerifier.computeDeclarationDigest(
      'theorem feigenbaum_delta_positive : True := trivial',
      'trivial',
      'v4.35.0'
    );
    assert.equal(digest.length, 64, 'Declaration digest must be full 64-char SHA-256 hex');

    // Toolchain matrix includes v4.32.2 and v4.35.0
    assert.ok(AVAILABLE_LEAN_TOOLCHAINS.includes('v4.32.2'), 'v4.32.2 must be in toolchain matrix');
    assert.ok(AVAILABLE_LEAN_TOOLCHAINS.includes('v4.35.0'), 'v4.35.0 must be in toolchain matrix');
    console.log('  ✓ 33.4: Local Tier-5 certificate minting blocked & SHA-256 digest helper verified');
  }

  // Test 33.5: FEMEV 4-Phase Epistemic State Machine
  {
    femevEngine.reset();
    let state = femevEngine.getState();
    assert.equal(state.activePhase, 'phase1_visual');

    // Phase 1 -> Phase 2
    await femevEngine.executePhase1Simulation();
    state = femevEngine.getState();
    assert.ok(state.phase1 && state.phase1.points.length > 50, 'Phase 1 must generate simulation points');
    assert.equal(state.phase1?.bifurcationRValues.length, 4);

    femevEngine.transitionToPhase('phase2_conjecture');
    state = femevEngine.getState();
    assert.equal(state.activePhase, 'phase2_conjecture');
    assert.ok(state.phase2 && state.phase2.conjectures.length > 0, 'Phase 2 should populate conjectures');
    assert.ok(state.phase2?.selectedConjecture !== null);

    // Phase 2 -> Phase 3
    femevEngine.transitionToPhase('phase3_heuristic');
    state = femevEngine.getState();
    assert.equal(state.activePhase, 'phase3_heuristic');

    await femevEngine.executePhase3Validation();
    state = femevEngine.getState();
    assert.ok(state.phase3?.heuristicPass, 'Heuristic validation must succeed for Feigenbaum delta');
    assert.ok(state.phase3?.sageVerificationCode.includes('def feigenbaum_delta_sage'));

    // Phase 3 -> Phase 4
    femevEngine.transitionToPhase('phase4_formal_proof');
    state = femevEngine.getState();
    assert.equal(state.activePhase, 'phase4_formal_proof');
    assert.ok(state.phase4?.leanProposition.includes('feigenbaum_delta_approx'));

    const proofResult = await femevEngine.executePhase4Verification();
    assert.equal(proofResult.verified, false);
    assert.equal(proofResult.multiKernelStatus, 'unavailable');
    assert.equal(proofResult.paranoidCheckPassed, false);
    assert.equal(femevEngine.getState().phase4Certificate, undefined);
    console.log('  ✓ 33.5: FEMEV 4-Phase Epistemic State Machine transitions & fail-closed Phase 4 verified');
  }

  // Test 33.6: Logistic Map & Feigenbaum Constant Empirical Convergence
  {
    const state = femevEngine.getState();
    const delta = state.phase2?.empiricalDelta;
    assert.ok(delta !== undefined && delta !== null);
    // Delta should be approximately 4.6692 within empirical tolerance (4.6 to 4.75)
    assert.ok(delta >= 4.6 && delta <= 4.75, `Empirical delta ${delta} should approximate 4.6692`);

    const alpha = state.phase2?.empiricalAlpha;
    assert.ok(alpha !== undefined && alpha !== null);
    assert.ok(alpha >= 2.4 && alpha <= 2.6, `Empirical alpha ${alpha} should approximate 2.5029`);
    console.log(`  ✓ 33.6: Feigenbaum delta ~${delta.toFixed(4)} and alpha ~${alpha.toFixed(4)} empirical convergence verified`);
  }

  // Test 33.7: LeanInteract v0.11.5 + v4.32.2 AutoLeanServer & LeanServerPool
  {
    const server = new AutoLeanServer({
      toolchain: 'v4.32.2',
      maxRestarts: 3,
      requestTimeoutMs: 5000,
    });

    const initRes = await server.init();
    assert.equal(initRes.success, true);
    assert.equal(server.getStatus(), 'ready');

    const evalRes = await server.evaluateCommand('#check Nat.add_comm');
    assert.equal(evalRes.success, true);
    assert.ok(evalRes.output.includes('Nat.add_comm'));

    // Test automatic crash recovery
    await server.simulateCrash();
    assert.equal(server.getRestartCount(), 1);
    assert.equal(server.getStatus(), 'ready');

    const evalAfterCrash = await server.evaluateCommand('def x : Nat := 42');
    assert.equal(evalAfterCrash.success, true);
    await server.dispose();

    // Pool test
    const pool = new LeanServerPool({ poolSize: 2, toolchain: 'v4.32.2' });
    await pool.initialize();
    const inst1 = await pool.acquire();
    const inst2 = await pool.acquire();
    assert.ok(inst1 !== inst2);
    pool.release(inst1);
    pool.release(inst2);
    await pool.disposeAll();
    console.log('  ✓ 33.7: LeanInteract AutoLeanServer crash recovery & LeanServerPool verified');
  }

  // Test 33.8: Veriphy v0.1.0 Skeptical Architecture & Sage Translation
  {
    const sageCmd = veriphyClient.getSageCommand();
    assert.ok(sageCmd.length > 0, 'VERIPHY_SAGE_CMD must be defined');

    const lakeReq = veriphyClient.getLakefileRequirement();
    assert.ok(lakeReq.includes('require veriphy'), 'Lakefile requirement must require veriphy');
    assert.ok(lakeReq.includes('v0.1.0'), 'Must require veriphy v0.1.0');

    // Sage translation test: generates pure Lean verification script
    const translated = veriphyClient.compileSageRun({
      sageCode: 'print(4.6692016091)',
      leanGoal: 'feigenbaum_delta_approx',
      tolerance: 0.001,
    });
    assert.ok(translated.includes('import Mathlib.Data.Real.Basic'));
    assert.ok(translated.includes('theorem feigenbaum_delta_approx'));
    assert.ok(translated.includes('decide') || translated.includes('norm_num'));

    // Asymmetric trust rule: Veriphy provides hints/oracles, official kernel verifies proof
    const verifyRes = await veriphyClient.skepticalVerify({
      sageCode: 'print(4.6692)',
      expectedResult: '4.6692',
      targetLeanTheorem: 'theorem feigenbaum_delta_approx : |δ - 4.6692| < 0.001 := by sorry',
    });
    assert.equal(verifyRes.heuristicPass, true);
    assert.equal(verifyRes.trustLevel, 'skeptical_oracle_untrusted');
    assert.ok(verifyRes.leanVerificationTemplate.includes('theorem'));
    console.log('  ✓ 33.8: Veriphy v0.1.0 Skeptical Architecture & Sage translation verified');
  }

  console.log('All Phase 10.5 Soundness & FEMEV checks passed successfully!\n');
}

void runFemevSoundnessTests();
