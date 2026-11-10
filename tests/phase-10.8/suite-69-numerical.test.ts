import assert from 'node:assert/strict';
import {
  leanCertBridge,
  type LeanCertVerifyRequest,
} from '../../server/src/services/leancert/leancert-bridge';
import { numpySpecBridge } from '../../server/src/services/numpyspec/numpyspec-bridge';
import { nerodiaBridge } from '../../server/src/services/nerodia/nerodia-bridge';
import { provepyBridge } from '../../server/src/services/provepy/provepy-bridge';

export async function runSuite69(): Promise<void> {
  console.log('\n--- Test Suite 69: Phase A — Numerical Verification & Python-FFI ---');

  // 69.1: verifyNumeric() on simple bound returns numeric-certificate outcome
  const req1: LeanCertVerifyRequest = {
    claim: 'sin(x) < 1 for all x in [0, 2]',
    method: 'interval',
  };
  const res1 = await leanCertBridge.verifyNumeric(req1);
  assert.equal(res1.outcome.verified, false);
  assert.equal(res1.outcome.kind, 'numeric-certificate');
  assert.equal(res1.outcome.certificationTier, 'NUMERIC_CERTIFICATE_UNVERIFIED');
  assert.equal(res1.certificateChecker, 'leancert');
  assert.ok(typeof res1.certificate === 'string' && res1.certificate.length >= 32);
  assert.ok(res1.bounds !== undefined);
  assert.ok((res1.bounds?.upper ?? 0) <= 1.0);
  console.log('  ✓ 69.1 verifyNumeric() on valid bound returns NUMERIC_CERTIFICATE_UNVERIFIED outcome with Lean certificate');

  // 69.2: verifyNumeric() on false claim returns preflight outcome with error
  const req2: LeanCertVerifyRequest = {
    claim: 'sin(x) > 2 for all x in [0, 2]',
    method: 'interval',
  };
  const res2 = await leanCertBridge.verifyNumeric(req2);
  assert.equal(res2.outcome.verified, false);
  assert.equal(res2.outcome.kind, 'preflight');
  assert.equal(res2.outcome.certificationTier, 'SYNTAX_ONLY_UNVERIFIED');
  assert.ok(res2.error?.includes('CLAIM_REFUTED'));
  console.log('  ✓ 69.2 verifyNumeric() on false claim returns preflight SYNTAX_ONLY_UNVERIFIED outcome');

  // 69.3: LEANCERT_UNAVAILABLE when container is stopped
  leanCertBridge.setContainerRunning(false);
  const res3 = await leanCertBridge.verifyNumeric(req1);
  assert.equal(res3.outcome.verified, false);
  assert.equal(res3.outcome.kind, 'unavailable');
  assert.equal(res3.outcome.certificationTier, 'UNAVAILABLE');
  assert.ok(res3.error?.includes('LEANCERT_UNAVAILABLE'));
  leanCertBridge.setContainerRunning(true); // Restore for subsequent steps
  console.log('  ✓ 69.3 503 LEANCERT_UNAVAILABLE returned with UNAVAILABLE tier when container is unavailable');

  // 69.4: NumpySpec feature flag off by default
  assert.equal(numpySpecBridge.isEnabled(), false);
  const numpyspecRes = await numpySpecBridge.checkMatrixOperation({
    operation: 'matmul',
    shapeA: [2, 3],
    shapeB: [3, 2],
    elementType: 'Real',
  });
  assert.equal(numpyspecRes.verified, false);
  assert.ok(numpyspecRes.error?.includes('NUMPYSPEC_DISABLED'));
  console.log('  ✓ 69.4 NumpySpec feature flag off by default (ENABLE_NUMPYSPEC=false)');

  // 69.5: Nerodia and provepy feature flags off by default; ENABLE_NERODIA=true requires Lean >= 4.33
  assert.equal(nerodiaBridge.isEnabled(), false);
  assert.equal(provepyBridge.isEnabled(), false);

  const nerodiaResDisabled = await nerodiaBridge.compileModule({
    moduleName: 'MatrixMath',
    leanSource: 'def double (n : Nat) : Nat := n * 2',
  });
  assert.equal(nerodiaResDisabled.compiled, false);
  assert.ok(nerodiaResDisabled.error?.includes('NERODIA_DISABLED'));

  // Test Lean toolchain requirement when enabled
  nerodiaBridge.setEnabled(true);
  const nerodiaIncompatible = await nerodiaBridge.compileModule(
    {
      moduleName: 'MatrixMath',
      leanSource: 'def double (n : Nat) : Nat := n * 2',
    },
    'v4.31.0' // Version < 4.33
  );
  assert.equal(nerodiaIncompatible.compiled, false);
  assert.ok(nerodiaIncompatible.error?.includes('NERODIA_TOOLCHAIN_INCOMPATIBLE'));

  const nerodiaSuccess = await nerodiaBridge.compileModule(
    {
      moduleName: 'MatrixMath',
      leanSource: 'def double (n : Nat) : Nat := n * 2',
    },
    'v4.33.1' // Version >= 4.33
  );
  assert.equal(nerodiaSuccess.compiled, true);
  assert.ok(nerodiaSuccess.typeStub.includes('def double'));
  nerodiaBridge.setEnabled(false); // Restore flag
  console.log('  ✓ 69.5 Nerodia & provepy flags off by default; Nerodia verified against Lean >= 4.33');
}
