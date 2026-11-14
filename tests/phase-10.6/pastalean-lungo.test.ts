import assert from 'node:assert/strict';
import { pastaLeanBridge } from '../../server/src/services/pastalean/pastalean-bridge';
import { lungoBridge, LUNGO_TARGET_LANGUAGES } from '../../server/src/services/lungo/lungo-bridge';
import { AVAILABLE_LEAN_TOOLCHAINS } from '../../server/src/config/lean-runner-config';
import * as fflate from 'fflate';

async function runPastaLeanLungoTests(): Promise<void> {
  console.log('--- Test Suite 34: PastaLean & Lungo Bridges for Polyglot Code Studio ---');

  // Test 34.1: PastaLean 3-stage translation
  {
    const pyCode = `
def add_numbers(x: int, y: int) -> int:
    return x + y
`;
    const translation = await pastaLeanBridge.translate({
      pythonCode: pyCode,
      target: 'command',
    });

    assert.ok(translation.provableFunction.includes('def add_numbers_provable'));
    assert.ok(translation.computableFunction.includes("def add_numbers_computable"));
    assert.ok(translation.computableFunction.includes("'rn"), "Computable function must be marked 'rn");
    assert.ok(translation.hoareTheorem.includes('theorem add_numbers_spec'));
    assert.equal(translation.typeInference['x'], 'Int');
    assert.equal(translation.typeInference['y'], 'Int');
    assert.equal(translation.pyAnySlots.length, 0, 'Typed function should have zero PyAny slots');
    console.log("  ✓ 34.1: PastaLean 3-stage translation (provable, computable 'rn, and Hoare spec) verified");
  }

  // Test 34.2: Gradual typing & PyAny detection
  {
    const untypedPy = `
def process_dynamic(data, multiplier):
    result = data * multiplier
    return result
`;
    const translation = await pastaLeanBridge.translate({
      pythonCode: untypedPy,
      target: 'command',
    });

    assert.ok(translation.pyAnySlots.includes('data'), 'Untyped parameter data must fall back to PyAny');
    assert.ok(translation.pyAnySlots.includes('multiplier'), 'Untyped parameter multiplier must fall back to PyAny');
    assert.equal(translation.typeInference['data'], 'PyAny');
    assert.equal(translation.typeInference['multiplier'], 'PyAny');
    assert.ok(translation.rawLeanOutput.includes('inductive PyAny'));
    console.log('  ✓ 34.2: Gradual typing and PyAny slot fallback tracking validated');
  }

  // Test 34.3: Two-file rule (Generated.lean vs Proofs.lean) & fidelity ; rfl check
  {
    const pyCode = `
def square(n: int) -> int:
    return n * n
`;
    const bundle = await pastaLeanBridge.generateTwoFileBundle({
      pythonCode: pyCode,
      target: 'command',
    });

    assert.equal(bundle.generatedLeanPath, 'Generated.lean');
    assert.equal(bundle.proofsLeanPath, 'Proofs.lean');
    assert.ok(bundle.generatedLeanCode.includes('square_provable'));
    assert.ok(bundle.generatedLeanCode.includes('square_computable'));
    assert.ok(bundle.proofsLeanCode.includes('import Generated'));
    assert.ok(bundle.proofsLeanCode.includes('theorem square_fidelity : square_computable = square_provable := by'));
    assert.ok(bundle.proofsLeanCode.includes('rfl'));
    assert.equal(bundle.fidelityVerified, true, 'Definitional equivalence must pass via rfl');
    console.log("  ✓ 34.3: Two-file rule (Generated.lean vs Proofs.lean) and fidelity (; rfl) check verified");
  }

  // Test 34.4: Proof attempts via taste?, mvcgen, and deterministic tactics
  {
    const leanCode = `
theorem add_spec (x y : Int) : ⦃ True ⦄ add_numbers_provable x y ⦃ fun r => r = x + y ⦄ := by
  taste?
  mvcgen
  omega
`;
    const attempt = await pastaLeanBridge.attemptProof(leanCode, 'add_spec');
    assert.equal(attempt.proved, true);
    assert.ok(attempt.tacticsUsed.includes('taste?'));
    assert.ok(attempt.tacticsUsed.includes('mvcgen'));
    assert.ok(attempt.tacticsUsed.includes('omega'));
    assert.ok(attempt.durationMs > 0);
    console.log('  ✓ 34.4: PastaLean automated proof attempt (taste?, mvcgen, omega) verified');
  }

  // Test 34.5: Lungo CLI v1.86.160 Bridge IR generation for 6 targets
  {
    const leanCode = `
def double (n : Int) : Int := n * 2

theorem double_even (n : Int) : double n % 2 = 0 := by
  sorry
`;
    const bir = await lungoBridge.generateBridgeIr(leanCode);
    assert.equal(bir.version, '1.86.160');
    assert.equal(bir.leanToolchain, 'v4.34.1');
    assert.ok(bir.modules.length > 0);
    assert.ok(bir.runtimeDigestSha256.length >= 64, 'Runtime digest must be SHA-256');

    const codegen = await lungoBridge.generateCode({
      leanCode,
      packageName: 'verified_core',
      moduleName: 'DoubleMath',
    });

    assert.equal(codegen.targetsGenerated.length, 6, 'Must generate code for all 6 targets');
    for (const t of LUNGO_TARGET_LANGUAGES) {
      assert.ok(codegen.targetsGenerated.includes(t));
      assert.ok(codegen.files.some((f) => f.language === t), `Target ${t} must have generated files`);
    }
    console.log('  ✓ 34.5: Lungo CLI v1.86.160 Bridge IR generation for 6 targets verified');
  }

  // Test 34.6: Proof-carrying claims and SHA-256 runtime integrity verification
  {
    const leanCode = `
theorem nat_add_comm (a b : Nat) : a + b = b + a := Nat.add_comm a b
`;
    const bir = await lungoBridge.generateBridgeIr(leanCode);
    assert.ok(bir.checkedClaims.length > 0);
    const claim = bir.checkedClaims[0]!;
    assert.ok(claim.theoremSignature.includes('nat_add_comm'));
    assert.equal(claim.status, 'unverified');
    assert.equal(claim.proofCarried, 'UNVERIFIED_DRAFT');
    assert.ok(claim.certificateHash.length >= 64);

    const check = lungoBridge.verifyIntegrity(bir.runtimeDigestSha256, bir.runtimeDigestSha256);
    assert.equal(check.valid, true);

    const badCheck = lungoBridge.verifyIntegrity('invalid_digest_000', bir.runtimeDigestSha256);
    assert.equal(badCheck.valid, false);
    console.log('  ✓ 34.6: Proof-carrying checked claims and SHA-256 runtime integrity verified');
  }

  // Test 34.7: Multi-target ZIP bundle export packaging
  {
    const leanCode = `
def increment (x : Int) : Int := x + 1
`;
    const bundle = await lungoBridge.exportMultiTargetBundle({
      leanCode,
      packageName: 'increment_lib',
    });

    assert.ok(bundle.bundleZip.length > 0, 'Bundle ZIP must have bytes');
    assert.ok(bundle.totalFiles >= 7, 'Must include 6 target code files + claims + manifest');
    assert.ok(bundle.bundleManifestJson.includes('increment_lib'));
    assert.ok(bundle.bundleManifestJson.includes('1.86.160'));

    // Decompress with fflate to verify archive integrity
    const unzipped = fflate.unzipSync(bundle.bundleZip);
    assert.ok(unzipped['lungo-bundle.json']);
    assert.ok(unzipped['claims/checked_claims.json']);
    assert.ok(unzipped['gen/c/include/increment_lib.h']);
    assert.ok(unzipped['gen/go/increment_lib.go']);
    assert.ok(unzipped['gen/py/increment_lib/__init__.py']);
    assert.ok(unzipped['gen/swift/Algorithm.swift']);
    assert.ok(unzipped['gen/ts/increment_lib.ts']);
    assert.ok(unzipped['gen/rs/src/lib.rs']);
    console.log('  ✓ 34.7: Multi-target ZIP bundle export and archive decompression verified');
  }

  // Test 34.8: Multi-toolchain matrix isolation
  {
    assert.ok(AVAILABLE_LEAN_TOOLCHAINS.includes('v4.31.0-rc2'), 'PastaLean toolchain v4.31.0-rc2 must be in matrix');
    assert.ok(AVAILABLE_LEAN_TOOLCHAINS.includes('v4.34.1'), 'Lungo toolchain v4.34.1 must be in matrix');
    assert.ok(AVAILABLE_LEAN_TOOLCHAINS.includes('v4.35.0'), 'Paranoid check toolchain v4.35.0 must be in matrix');
    console.log('  ✓ 34.8: Multi-toolchain matrix isolation (v4.31.0-rc2, v4.34.1, v4.35.0) validated');
  }

  console.log('All Phase 10.6 PastaLean & Lungo checks passed successfully!\n');
}

void runPastaLeanLungoTests();
