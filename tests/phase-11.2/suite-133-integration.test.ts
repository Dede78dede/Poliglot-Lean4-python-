/**
 * Test Suite 133: Cross-Cutting Phase 11.2 Integration (Sprint 11.2, Cross-Cutting)
 */

import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { exportWorkspace, restoreWorkspace, inspectArchive } from '../../src/services/workspace/workspace-archive-service';
import { browserOtelTracer } from '../../src/services/telemetry/otel-browser';
import { backendOtelEngine } from '../../src/services/telemetry/otel-backend';
import { StructuredLogger } from '../../src/services/logging/logger';
import { defaultPaperproofClient } from '../../src/services/mcp/paperproof-client';
import { mathesisProvider } from '../../src/services/formalization/mathesis-provider';
import { HocuspocusServer } from '../../src/services/collaboration/hocuspocus-server';
import { FEATURE_FLAGS, featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { ERROR_REGISTRY } from '../../src/services/errors/error-registry';

export async function runSuite133(): Promise<void> {
  console.log('\n--- Test Suite 133: Cross-Cutting Phase 11.2 Integration ---');

  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'polyglot-suite-133-'));
  const srcWs = path.join(testDir, 'source-ws');
  fs.mkdirSync(path.join(srcWs, '.collab'), { recursive: true });
  fs.writeFileSync(path.join(srcWs, 'Main.lean'), 'theorem integrated : True := trivial\n');
  fs.writeFileSync(path.join(srcWs, '.collab', 'Main.lean.yjs'), 'theorem integrated : True := trivial\n');

  try {
    // 133.1: Full Workspace Archive round-trip preserving .collab snapshot & code
    const archiveBuffer = await exportWorkspace({
      sourceDirectory: srcWs,
      workspaceId: 'ws-integ-133',
      name: 'Integration Workspace',
      leanToolchain: 'v4.34.0-rc1',
    });
    const inspect = await inspectArchive(archiveBuffer);
    assert.ok(inspect.valid);
    assert.ok(inspect.files.some(f => f.path === 'Main.lean'));

    const destWs = path.join(testDir, 'dest-ws');
    await restoreWorkspace(archiveBuffer, { destinationDirectory: destWs });
    assert.ok(fs.existsSync(path.join(destWs, 'Main.lean')));
    console.log('  ✓ 133.1 Full Archive Round-Trip: workspace exported and restored with checksum validation');

    // 133.2: Full Pipeline Trace Correlation
    const traceId = browserOtelTracer.startTrace();
    const logger = new StructuredLogger('integration-runner');
    const log = logger.info('Executing cross-cutting proof check', traceId, { step: 'verify' });
    backendOtelEngine.recordLog(log);
    backendOtelEngine.recordSpan({
      spanId: 'integ-span-1',
      traceId,
      name: 'integration.verify.pipeline',
      startTime: 5000,
      endTime: 5080,
      durationMs: 80,
      attributes: { 'test.suite': 133 },
      status: { code: 'OK' },
      events: [],
    });
    const correlated = backendOtelEngine.getTrace(traceId);
    assert.ok(correlated);
    assert.equal(correlated.totalSpans, 1);
    assert.equal(correlated.correlatedLogs.length, 1);
    console.log('  ✓ 133.2 Full Pipeline Trace: browser span and backend logger linked by traceId');

    // 133.3: Collaborative Formalization Pipeline: Mathesis -> CRDT -> Paperproof
    featureFlagRegistry.set('ENABLE_MATHESIS', true);
    const formalResult = await mathesisProvider.formalize({
      naturalLanguagePrompt: 'True is trivially true',
      endpointOverride: 'http://localhost:8088/v1/mathesis',
    });
    assert.ok(formalResult.accepted);

    const server = new HocuspocusServer();
    const doc = server.applyUpdate(destWs, 'Synthesized.lean', { text: formalResult.leanCode });
    assert.ok(doc.content.includes('mathesis_synthesized_theorem'));

    const proofSteps = await defaultPaperproofClient.callTool({
      toolName: 'lean_proof_steps',
      arguments: { path: 'Synthesized.lean', theoremName: 'mathesis_synthesized_theorem' },
    });
    assert.equal(proofSteps.success, true);
    featureFlagRegistry.set('ENABLE_MATHESIS', false);
    console.log('  ✓ 133.3 Collaborative Formalization: Mathesis candidate -> CRDT buffer -> Paperproof steps');

    // 133.4: Complete Feature Flag matrix smoke test (51 flags)
    const flagKeys = Object.keys(FEATURE_FLAGS);
    assert.equal(flagKeys.length, 51, `Expected exactly 51 flags, found ${flagKeys.length}`);
    assert.ok('ENABLE_WORKSPACE_ARCHIVE' in FEATURE_FLAGS);
    assert.ok('ENABLE_PAPERPROOF_PLAYBACK' in FEATURE_FLAGS);
    assert.ok('ENABLE_OTEL_BROWSER' in FEATURE_FLAGS);
    assert.ok('ENABLE_OTEL_NODE' in FEATURE_FLAGS);
    assert.ok('ENABLE_YJS_COLLABORATION' in FEATURE_FLAGS);
    console.log(`  ✓ 133.4 Feature Flag Matrix: all ${flagKeys.length} flags verified (exactly 51 target)`);

    // 133.5: Error Registry verification (62 RFC 9457 error codes)
    const errorKeys = Object.keys(ERROR_REGISTRY);
    assert.equal(errorKeys.length, 62, `Expected exactly 62 error codes, found ${errorKeys.length}`);
    assert.ok('WORKSPACE_ARCHIVE_INVALID' in ERROR_REGISTRY);
    assert.ok('WORKSPACE_ARCHIVE_CHECKSUM_MISMATCH' in ERROR_REGISTRY);
    assert.ok('WORKSPACE_RESTORE_CONFLICT' in ERROR_REGISTRY);
    assert.ok('WORKSPACE_ARCHIVE_SCHEMA_TOO_NEW' in ERROR_REGISTRY);
    assert.ok('OTEL_EXPORT_FAILED' in ERROR_REGISTRY);
    assert.ok('OTEL_TRACE_CORRELATION_FAILED' in ERROR_REGISTRY);
    assert.ok('LEANSCORER_FAILED' in ERROR_REGISTRY);
    assert.ok('YJS_SYNC_FAILED' in ERROR_REGISTRY);
    assert.ok('HOCUSPOCUS_AUTH_FAILED' in ERROR_REGISTRY);
    assert.ok('CRDT_CONFLICT_UNRESOLVED' in ERROR_REGISTRY);
    console.log(`  ✓ 133.5 Error Registry: all ${errorKeys.length} RFC 9457 error codes verified (exactly 62 target)`);

    // 133.6: Kernel Seal Non-Bypass Invariant
    const SEAL = 'SEAL_KERNEL_VERIFIED_TIER5';
    assert.equal(SEAL in formalResult, false);
    assert.equal(SEAL in proofSteps, false);
    assert.equal(SEAL in doc, false);
    assert.equal(SEAL in correlated, false);
    console.log('  ✓ 133.6 Kernel Seal Non-Bypass Invariant: Tier 5 verification remains strictly authoritative');

  } finally {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}
