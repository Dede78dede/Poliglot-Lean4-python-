import assert from 'node:assert/strict';
import { healthService, CONTAINER_REGISTRY } from '../../src/services/health/health-service';

export async function runSuite77(): Promise<void> {
  console.log('\n--- Test Suite 77: Unified Container Health & Readiness ---');

  // 77.1: Overall readiness is 'ready' when all critical containers are up
  healthService.resetMocks();
  const readyReport = await healthService.checkAll();
  assert.equal(readyReport.overall, 'ready');
  assert.equal(readyReport.criticalContainers.length, 3);
  assert.equal(readyReport.nonCriticalDown.length, 0);
  console.log('  ✓ 77.1 checkAll() returns overall: ready when all critical containers are healthy');

  // 77.2: Overall readiness degrades to 'degraded' when a non-critical container is down
  healthService.setContainerMockStatus('heron-runner', 'unhealthy');
  const degradedReport = await healthService.checkAll();
  assert.equal(degradedReport.overall, 'degraded');
  assert.ok(degradedReport.nonCriticalDown.includes('heron-runner'));
  console.log('  ✓ 77.2 checkAll() returns overall: degraded when a non-critical container is unhealthy');

  // 77.3: Overall readiness transitions to 'not_ready' when a critical container is down
  healthService.setContainerMockStatus('femev-runner', 'unhealthy');
  const notReadyReport = await healthService.checkAll();
  assert.equal(notReadyReport.overall, 'not_ready');
  console.log('  ✓ 77.3 checkAll() returns overall: not_ready when a critical container is unhealthy');

  // 77.4: All containers have defined ports and toolchains
  healthService.resetMocks();
  for (const c of CONTAINER_REGISTRY) {
    const info = await healthService.checkOne(c.id);
    assert.ok(info.port >= 8080 && info.port <= 8088);
    assert.ok(Array.isArray(info.toolchains));
  }
  console.log('  ✓ 77.4 All 9 containers expose valid ports and toolchain configurations');
}
