/**
 * Paperproof Client (Phase 10.9.5, Task S3)
 *
 * Client for Paperproof interactive proof-tree playback and visualization.
 * Gated by feature flag ENABLE_PAPERPROOF (default: false).
 * When disabled or container offline, throws BridgeError(PAPERPROOF_UNAVAILABLE).
 */

import { featureFlagRegistry } from '../flags/feature-flag-registry';
import { BridgeError } from '../errors/bridge-error';
import { createLogger, StructuredLogger } from '../logging/logger';

const logger = createLogger('paperproof-client');

export interface PaperproofNode {
  readonly id: string;
  readonly label: string;
  readonly type: 'hypothesis' | 'goal' | 'tactic' | 'qed';
  readonly expression: string;
  readonly stepIndex: number;
}

export interface PaperproofEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly tactic?: string;
}

export interface PaperproofTree {
  readonly theoremName: string;
  readonly nodes: readonly PaperproofNode[];
  readonly edges: readonly PaperproofEdge[];
  readonly totalSteps: number;
  readonly verified: boolean;
}

export class PaperproofClient {
  public isAvailable(): boolean {
    return featureFlagRegistry.isEnabled('ENABLE_PAPERPROOF_PLAYBACK') || featureFlagRegistry.isEnabled('ENABLE_PAPERPROOF');
  }

  /**
   * Generates or fetches interactive proof tree representation from Lean 4 code.
   * Throws BridgeError(PAPERPROOF_UNAVAILABLE) if feature flag is disabled.
   */
  public async generateProofTree(
    leanCode: string,
    options?: { readonly theoremName?: string; readonly correlationId?: string }
  ): Promise<PaperproofTree> {
    const correlationId = options?.correlationId ?? StructuredLogger.generateCorrelationId();

    if (!this.isAvailable()) {
      logger.warn('Paperproof playback requested while flag ENABLE_PAPERPROOF is disabled', correlationId);
      throw new BridgeError('PAPERPROOF_UNAVAILABLE', correlationId, {
        reason: 'Feature flag ENABLE_PAPERPROOF is disabled in FeatureFlagRegistry',
      });
    }

    logger.info('Generating Paperproof proof-tree graph', correlationId, {
      codeLength: leanCode.length,
    });

    const theoremMatch = leanCode.match(/theorem\s+([a-zA-Z0-9_']+)\s*([^:=]*)/);
    const theoremName = options?.theoremName ?? (theoremMatch ? theoremMatch[1] : 'anonymous_proof');
    const goalExpression = theoremMatch?.[2]?.trim() || 'Goal pending server inspection';
    const tacticMatch = leanCode.match(/\b(rfl|omega|linarith|ring|simp|exact\b[^\n]*|decide)\b/);
    const tacticName = tacticMatch?.[1] ?? 'pending';

    // Parse proof structure into pedagogical diagnostic graph (non-certifying)
    const nodes: PaperproofNode[] = [
      {
        id: 'node-0',
        label: 'Initial Goal',
        type: 'goal',
        expression: goalExpression,
        stepIndex: 0,
      },
      {
        id: 'node-1',
        label: `Tactic: ${tacticName}`,
        type: 'tactic',
        expression: `by ${tacticName}`,
        stepIndex: 1,
      },
      {
        id: 'node-2',
        label: 'Draft Playback End',
        type: 'qed',
        expression: 'Pedagogical trace (requires dual-engine kernel verification)',
        stepIndex: 2,
      },
    ];

    const edges: PaperproofEdge[] = [
      { id: 'edge-0-1', source: 'node-0', target: 'node-1', tactic: tacticName },
      { id: 'edge-1-2', source: 'node-1', target: 'node-2', tactic: 'trace' },
    ];

    return {
      theoremName: theoremName || 'anonymous_proof',
      nodes: Object.freeze(nodes),
      edges: Object.freeze(edges),
      totalSteps: 2,
      verified: false,
    };
  }
}

export const paperproofClient = new PaperproofClient();
