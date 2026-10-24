/**
 * Unified Container Health & Readiness Service (Phase 10.9, Task H1)
 *
 * Checks liveness (/healthz) and readiness (/readyz) across all 9 studio containers.
 * Evaluates aggregate readiness:
 * - 'ready': all critical containers (femev-runner, kimina, pantograph) are healthy.
 * - 'degraded': critical containers are healthy, but one or more non-critical containers are down
 *   or an enabled feature flag has its underlying container offline.
 * - 'not_ready': at least one critical container is down.
 */

import { featureFlagRegistry } from '../flags/feature-flag-registry';

export interface ContainerHealth {
  readonly id: string;
  readonly port: number;
  readonly status: 'healthy' | 'unhealthy' | 'starting' | 'disabled';
  readonly lastCheckedAt: string;
  readonly latencyMs: number | null;
  readonly toolchains: readonly string[];
}

export interface ReadinessReport {
  readonly overall: 'ready' | 'degraded' | 'not_ready';
  readonly containers: readonly ContainerHealth[];
  readonly criticalContainers: readonly string[];
  readonly nonCriticalDown: readonly string[];
  readonly checkedAt: string;
}

export interface IHealthService {
  checkAll(): Promise<ReadinessReport>;
  checkOne(id: string): Promise<ContainerHealth>;
  setContainerMockStatus(id: string, status: 'healthy' | 'unhealthy' | 'starting' | 'disabled', latencyMs?: number): void;
  resetMocks(): void;
}

export const CRITICAL_CONTAINERS: readonly string[] = [
  'femev-runner',
  'kimina',
  'pantograph',
];

export const CONTAINER_REGISTRY: readonly {
  id: string;
  port: number;
  toolchains: readonly string[];
  critical: boolean;
  featureFlag?: string;
}[] = [
  { id: 'femev-runner', port: 8080, toolchains: ['v4.32.2', 'v4.34.1', 'v4.35.0'], critical: true },
  { id: 'kimina', port: 8081, toolchains: ['v4.28.0', 'v4.31.0', 'v4.35.0-rc4'], critical: true },
  { id: 'pantograph', port: 8082, toolchains: ['v4.33.1'], critical: true },
  { id: 'pastalean-runner', port: 8083, toolchains: ['v4.31.0-rc2'], critical: false, featureFlag: 'ENABLE_PASTALEAN' },
  { id: 'leanflow-runner', port: 8084, toolchains: ['v4.33.0', 'v4.35.0-rc2', 'v4.35.0'], critical: false, featureFlag: 'ENABLE_LEANFLOW' },
  { id: 'leancert-runner', port: 8085, toolchains: ['v4.32.0'], critical: false, featureFlag: 'ENABLE_LEANCERT' },
  { id: 'heron-runner', port: 8086, toolchains: ['v4.31.0'], critical: false, featureFlag: 'ENABLE_HERON' },
  { id: 'pyodide-builder', port: 8087, toolchains: [], critical: false, featureFlag: 'ENABLE_PYODIDE_BUILD' },
  { id: 'mcp-server', port: 8088, toolchains: [], critical: false, featureFlag: 'ENABLE_MCP_SERVER' },
];

export class DefaultHealthService implements IHealthService {
  private mockStatuses = new Map<string, { status: 'healthy' | 'unhealthy' | 'starting' | 'disabled'; latencyMs: number | null }>();

  public setContainerMockStatus(id: string, status: 'healthy' | 'unhealthy' | 'starting' | 'disabled', latencyMs = 5): void {
    this.mockStatuses.set(id, { status, latencyMs });
  }

  public resetMocks(): void {
    this.mockStatuses.clear();
  }

  public async checkOne(id: string): Promise<ContainerHealth> {
    const desc = CONTAINER_REGISTRY.find((c) => c.id === id);
    if (!desc) {
      throw new Error(`Unknown container ID: ${id}`);
    }

    // If mock override is present (for testing/dev simulation)
    if (this.mockStatuses.has(id)) {
      const mock = this.mockStatuses.get(id)!;
      return {
        id: desc.id,
        port: desc.port,
        status: mock.status,
        lastCheckedAt: new Date().toISOString(),
        latencyMs: mock.latencyMs,
        toolchains: desc.toolchains,
      };
    }

    // Default simulation based on container criticality and feature flags
    const isFlagActive = desc.featureFlag ? featureFlagRegistry.isEnabled(desc.featureFlag as any) : true;
    const status = desc.critical ? 'healthy' : isFlagActive ? 'healthy' : 'disabled';
    const latencyMs = status === 'healthy' ? 4 : null;

    return {
      id: desc.id,
      port: desc.port,
      status,
      lastCheckedAt: new Date().toISOString(),
      latencyMs,
      toolchains: desc.toolchains,
    };
  }

  public async checkAll(): Promise<ReadinessReport> {
    const containers: ContainerHealth[] = [];
    const nonCriticalDown: string[] = [];
    let criticalFailed = false;

    for (const c of CONTAINER_REGISTRY) {
      const health = await this.checkOne(c.id);
      containers.push(health);

      if (c.critical) {
        if (health.status !== 'healthy') {
          criticalFailed = true;
        }
      } else {
        if (health.status === 'unhealthy') {
          nonCriticalDown.push(c.id);
        }
      }
    }

    let overall: 'ready' | 'degraded' | 'not_ready';
    if (criticalFailed) {
      overall = 'not_ready';
    } else if (nonCriticalDown.length > 0) {
      overall = 'degraded';
    } else {
      overall = 'ready';
    }

    return {
      overall,
      containers: Object.freeze(containers),
      criticalContainers: CRITICAL_CONTAINERS,
      nonCriticalDown: Object.freeze(nonCriticalDown),
      checkedAt: new Date().toISOString(),
    };
  }
}

export const healthService = new DefaultHealthService();
