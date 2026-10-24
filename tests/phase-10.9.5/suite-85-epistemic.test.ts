import assert from 'node:assert/strict';
import {
  type EpistemicStatus,
  canTransition,
  validateTransition,
  EPISTEMIC_PALETTE,
} from '../../src/types/epistemic-status';
import {
  FemevOrchestrator,
  femevOrchestrator,
} from '../../src/services/femev/femev-orchestrator';
import { BridgeError } from '../../src/services/errors/bridge-error';

export async function runSuite85(): Promise<void> {
  console.log('\n--- Test Suite 85: Epistemic Status Unification & Integrity Invariants ---');

  // 85.1: 6 unified epistemic states with correct palette configurations
  const statuses: EpistemicStatus[] = [
    'conjecture',
    'heuristically-validated',
    'faithfulness-screened',
    'numerically-verified',
    'formally-proven',
    'refuted',
  ];
  for (const s of statuses) {
    assert.ok(EPISTEMIC_PALETTE[s], `Palette must have config for ${s}`);
    assert.ok(EPISTEMIC_PALETTE[s].label.length > 0);
    assert.ok(EPISTEMIC_PALETTE[s].bgClass.length > 0);
  }
  console.log('  ✓ 85.1 6 unified epistemic states verified with authoritative UI palettes');

  // 85.2: Invariant: Direct transition from 'conjecture' to 'formally-proven' is strictly forbidden
  assert.equal(canTransition('conjecture', 'formally-proven'), false);
  let directPromoBlocked = false;
  try {
    validateTransition('conjecture', 'formally-proven', 'test-gate');
  } catch (err: unknown) {
    if (err instanceof BridgeError && err.code === 'EPISTEMIC_TRANSITION_INVALID') {
      directPromoBlocked = true;
    }
  }
  assert.equal(directPromoBlocked, true, 'Direct jump conjecture -> formally-proven must throw EPISTEMIC_TRANSITION_INVALID');
  console.log('  ✓ 85.2 Direct conjecture -> formally-proven transition strictly forbidden');

  // 85.3: Valid progression path: conjecture -> heuristically-validated -> formally-proven
  assert.equal(canTransition('conjecture', 'heuristically-validated'), true);
  assert.equal(canTransition('heuristically-validated', 'formally-proven'), true);
  assert.equal(canTransition('faithfulness-screened', 'formally-proven'), true);
  assert.equal(canTransition('numerically-verified', 'formally-proven'), true);
  console.log('  ✓ 85.3 Progressive transitions through verification gates permitted');

  // 85.4: Terminal state invariants (refuted cannot transition to anything else, idempotent self is ok)
  assert.equal(canTransition('refuted', 'conjecture'), false);
  assert.equal(canTransition('refuted', 'formally-proven'), false);
  assert.equal(canTransition('refuted', 'refuted'), true, 'Idempotent self-transition allowed');
  console.log('  ✓ 85.4 Refuted state is terminal with idempotent self-transition');

  // 85.5: FemevOrchestrator mandates SEAL_KERNEL_VERIFIED_TIER5 for formally-proven
  const orchestrator = new FemevOrchestrator();
  const testDecl = orchestrator.registerDeclaration({
    id: 'test-decl-1',
    name: 'test_theorem',
    statement: 'theorem t : 1 + 1 = 2',
    currentStatus: 'heuristically-validated',
  });

  // Attempt without seal -> must throw PROJECT_NOT_KERNEL_VERIFIED
  let sealBlocked = false;
  try {
    orchestrator.transitionStatus('test-decl-1', 'formally-proven', {
      seal: 'INVALID_SEAL',
    });
  } catch (err: unknown) {
    if (err instanceof BridgeError && err.code === 'PROJECT_NOT_KERNEL_VERIFIED') {
      sealBlocked = true;
    }
  }
  assert.equal(sealBlocked, true, 'Promotion without SEAL_KERNEL_VERIFIED_TIER5 must be rejected');

  // Transition with valid seal -> succeeds
  const promoted = orchestrator.transitionStatus('test-decl-1', 'formally-proven', {
    seal: 'SEAL_KERNEL_VERIFIED_TIER5',
    reason: '6-kernel multi-checker consensus achieved',
  });
  assert.equal(promoted.currentStatus, 'formally-proven');
  assert.equal(promoted.seal, 'SEAL_KERNEL_VERIFIED_TIER5');
  assert.equal(promoted.transitionHistory.length, 2);
  console.log('  ✓ 85.5 FemevOrchestrator enforces SEAL_KERNEL_VERIFIED_TIER5 on formal proof seal');
}
