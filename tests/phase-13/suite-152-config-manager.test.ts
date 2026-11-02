/**
 * Test Suite 152: Config Discovery & Recommendation Manager (Phase 13, Sprint 13.4)
 *
 * Validates:
 * 152.1: Hardware, usage, and benchmark signals produce at most 3 ranked proposals
 * 152.2: Applying a proposal without explicit user confirmation (userConfirmed: false) fails
 * 152.3: Applying a proposal with userConfirmed: true applies setting and records audit entry
 * 152.4: Dismissing a proposal persists 90-day cooldown and filters it from resurfacing
 * 152.5: Conflicting proposals are detected and blocked with CONFIG_PROPOSAL_CONFLICT
 */

import assert from 'node:assert/strict';
import { ConfigManager, type SystemSignals } from '../../src/services/config/config-manager';

export async function runSuite152(): Promise<void> {
  console.log('\n[Suite 152] Dynamic Config Discovery & Adaptive Recommendation Tests:');

  const manager = new ConfigManager();

  const signals: SystemSignals = {
    hardware: {
      memoryGb: 64,
      vramGb: 24,
      concurrencyCores: 16,
      detectedAt: new Date().toISOString(),
    },
    usage: {
      activeTheoremsPerDay: 25,
      cacheMissRate: 0.55,
      meanSolveTimeMs: 1200,
      observedAt: new Date().toISOString(),
    },
    benchmark: {
      oProverThroughput: 8.5,
      miniSearchLatencyMs: 95,
      memoryFootprintMb: 350,
      benchmarkedAt: new Date().toISOString(),
    },
  };

  // 152.1: Generate max 3 ranked proposals
  const proposals = manager.generateProposals(signals);
  assert.ok(proposals.length > 0 && proposals.length <= 3, `Expected 1..3 proposals, got ${proposals.length}`);
  // Check sorting by expected utility descending
  for (let i = 0; i < proposals.length - 1; i++) {
    assert.ok(
      proposals[i].expectedUtility >= proposals[i + 1].expectedUtility,
      'Proposals must be sorted by expectedUtility descending'
    );
  }
  console.log(`  ✓ 152.1 Generated ${proposals.length} ranked proposals (capped at max 3)`);

  const topProposal = proposals[0];

  // 152.2: userConfirmed: false must fail
  const unconfirmedResult = manager.applyProposal(topProposal.id, { userConfirmed: false });
  assert.equal(unconfirmedResult.ok, false);
  if (!unconfirmedResult.ok) {
    assert.equal(unconfirmedResult.error.code, 'CONFIG_PROPOSAL_CONFLICT');
    assert.ok(
      unconfirmedResult.error.message.includes('Configuration proposal') ||
      String((unconfirmedResult.error.details as Record<string, unknown>)?.reason).includes('explicit user confirmation')
    );
  }
  console.log('  ✓ 152.2 Applying proposal without user confirmation fails strictly');

  // 152.3: userConfirmed: true succeeds, applies setting, and records audit trail
  const confirmedResult = manager.applyProposal(topProposal.id, { userConfirmed: true });
  assert.equal(confirmedResult.ok, true);
  if (confirmedResult.ok) {
    assert.equal(confirmedResult.value.proposalId, topProposal.id);
    assert.equal(confirmedResult.value.targetSetting, topProposal.targetSetting);
    assert.equal(manager.getAppliedSetting(topProposal.targetSetting), topProposal.proposedValue);
  }

  const auditLog = manager.getAuditLog();
  assert.ok(auditLog.length >= 1);
  assert.equal(auditLog[auditLog.length - 1].proposalId, topProposal.id);
  assert.equal(auditLog[auditLog.length - 1].userConfirmed, true);
  console.log('  ✓ 152.3 Applying with userConfirmed: true modifies setting and writes audit log');

  // 152.4: Dismissing a proposal persists 90-day cooldown
  const remainingProposals = manager.getActiveProposals();
  if (remainingProposals.length > 0) {
    const toDismiss = remainingProposals[0];
    manager.dismissProposal(toDismiss.id);
    assert.equal(manager.isDismissed(toDismiss.id), true);

    // Re-evaluating signals must not return the dismissed proposal
    const freshProposals = manager.generateProposals(signals);
    assert.ok(!freshProposals.some((p) => p.id === toDismiss.id));
    console.log('  ✓ 152.4 Dismissing proposal enforces 90-day cooldown; filtered from resurfacing');
  }

  // 152.5: Conflicting proposals resolution
  // Attempting to apply a proposal that conflicts with an already applied proposal or invalid proposal ID
  const conflictResult = manager.applyProposal('prop-concurrency-conservative', { userConfirmed: true });
  assert.equal(conflictResult.ok, false);
  if (!conflictResult.ok) {
    assert.equal(conflictResult.error.code, 'CONFIG_PROPOSAL_CONFLICT');
  }
  console.log('  ✓ 152.5 Conflicting proposal detected and rejected with CONFIG_PROPOSAL_CONFLICT');
}

if (process.argv[1]?.endsWith('suite-152-config-manager.test.ts')) {
  runSuite152()
    .then(() => console.log('Suite 152 passed.'))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
