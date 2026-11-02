/**
 * Test Suite 91: Evidence Timeline & Transition Integrity (Phase 10.9.7, Task ET3)
 */

import assert from 'node:assert/strict';
import {
  evidenceTimelineService,
  type TimelineEntry,
} from '../../src/services/femev/evidence-timeline';
import { femevEngine } from '../../src/services/femev/femev-engine';
import { EPISTEMIC_PALETTE } from '../../src/types/epistemic-status';
import { BridgeError } from '../../src/services/errors/bridge-error';

export async function runSuite91(): Promise<void> {
  console.log('\n--- Test Suite 91: Evidence Timeline ---');

  const testDeclId = 'test-timeline-decl-1';

  // 91.1: timeline() returns entries in chronological order
  const seedTimeline = await evidenceTimelineService.timeline('feigenbaum-delta-bound');
  assert.ok(seedTimeline.length >= 2, 'Default timeline seeded');
  for (let i = 0; i < seedTimeline.length - 1; i++) {
    const tCurrent = new Date(seedTimeline[i].timestamp).getTime();
    const tNext = new Date(seedTimeline[i + 1].timestamp).getTime();
    assert.ok(tCurrent <= tNext, 'Timeline entries are ordered chronologically (ascending)');
  }
  console.log('  ✓ 91.1 timeline() returns events sorted in strictly chronological order');

  // 91.2: append() with invalid transition throws EPISTEMIC_TRANSITION_INVALID
  let caughtInvalid = false;
  try {
    await evidenceTimelineService.append(testDeclId, {
      declarationId: testDeclId,
      actor: 'user',
      transition: {
        from: 'conjecture',
        to: 'formally-proven', // FORBIDDEN direct jump
      },
      evidenceKind: 'formal-proof',
      summary: 'Illegal uncertified leap directly to formal proof',
    });
  } catch (err: unknown) {
    if (err instanceof BridgeError) {
      assert.equal(err.code, 'EPISTEMIC_TRANSITION_INVALID');
      caughtInvalid = true;
    }
  }
  assert.ok(caughtInvalid, 'Direct transition from conjecture to formally-proven throws EPISTEMIC_TRANSITION_INVALID');
  console.log('  ✓ 91.2 append() with unverified transition strictly throws EPISTEMIC_TRANSITION_INVALID');

  // 91.3: append() with valid transition persists and returns the new entry
  const validEntry = await evidenceTimelineService.append(testDeclId, {
    declarationId: testDeclId,
    actor: 'leanscreen',
    transition: {
      from: 'conjecture',
      to: 'faithfulness-screened',
    },
    evidenceKind: 'faithfulness-screening',
    summary: 'LeanScreen dual-judge verified semantic fidelity with 0.95 confidence',
    details: { judge1Score: 0.96, judge2Score: 0.94 },
  });

  assert.equal(validEntry.actor, 'leanscreen');
  assert.equal(validEntry.transition.to, 'faithfulness-screened');

  const updatedTimeline = await evidenceTimelineService.timeline(testDeclId);
  const found = updatedTimeline.find((e) => e.id === validEntry.id);
  assert.ok(found, 'Appended timeline entry is persisted');
  console.log('  ✓ 91.3 append() with compliant transition persists event with actor attribution');

  // 91.4: Backward compatibility: existing legacy evidence normalized on read
  const legacyDeclId = 'legacy-decl-audit';
  femevEngine.registerDeclaration({
    id: legacyDeclId,
    name: 'legacy_theorem',
    statement: 'theorem legacy : True',
    isNumericClaim: false,
    status: 'formally_proven',
    evidences: [
      {
        id: 'legacy-ev-1',
        declarationId: legacyDeclId,
        kind: 'kernel-proof',
        verified: true,
        summary: 'Legacy kernel verification without actor',
        timestamp: '2026-10-24T12:00:00.000Z',
      },
    ],
  });

  const legacyTimeline = await evidenceTimelineService.timeline(legacyDeclId);
  const normalized = legacyTimeline.find((e) => e.id === 'legacy-ev-1');
  assert.ok(normalized, 'Legacy evidence entry found in timeline');
  assert.equal(normalized?.actor, 'user', 'Legacy evidence normalized to actor: user');
  assert.equal(normalized?.transition.from, 'conjecture');
  assert.equal(normalized?.transition.to, 'formally-proven');
  console.log('  ✓ 91.4 Legacy evidence without actor metadata is gracefully normalized on read');

  // 91.5: UI renders the timeline with correct color codes per epistemic status
  assert.ok(EPISTEMIC_PALETTE['conjecture'].bgClass.includes('slate'));
  assert.ok(EPISTEMIC_PALETTE['heuristically-validated'].bgClass.includes('amber'));
  assert.ok(EPISTEMIC_PALETTE['faithfulness-screened'].bgClass.includes('cyan'));
  assert.ok(EPISTEMIC_PALETTE['numerically-verified'].bgClass.includes('indigo'));
  assert.ok(EPISTEMIC_PALETTE['formally-proven'].bgClass.includes('emerald'));
  assert.ok(EPISTEMIC_PALETTE['refuted'].bgClass.includes('rose'));
  console.log('  ✓ 91.5 Epistemic palette tokens strictly reflect authoritative 6-tier UI statuses');
}
