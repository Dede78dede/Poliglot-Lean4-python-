/**
 * Bridge Envelope Registry (Phase 13, Sprint 13.1, Task RE3)
 *
 * Implements the Unified ResultEnvelope<T> layer across all 18 bridge services.
 * Ensures consistent serialization of successes, typed BridgeErrors,
 * and correlationId propagation.
 */

import { type ResultEnvelope, withEnvelope } from '../../shared/contracts/result-envelope';
import { StructuredLogger } from '../logging/logger';

// 1. ProofReuseService
import { proofReuseService, type ProofReuseQuery, type ProofReuseResult } from '../proof/reuse/proof-reuse-service';

// 2. ProposalLoop
import { proposalLoop, type ProposalLoopResult, type ProposalLoopConfig } from '../proof/proposal-loop/proposal-loop';

// 3. TranslationFidelityGate
import { translationFidelityGate, type FidelityCheckRequest, type FidelityCheckResult } from '../translation/fidelity-gate';

// 4. LP2Adapter
import { lp2Adapter, type LP2TranslationResult } from '../translation/lp2-adapter';

// 5. MathesisProvider
import { mathesisProvider, type MathesisFormalizeRequest, type MathesisFormalizeResult } from '../formalization/mathesis-provider';

// 6. TreeThinkProvider
import { treeThinkProvider, type TreeSearchRequest, type TreeSearchResult } from '../proof/treethink/treethink-provider';

export interface BridgeEnvelopeAdapters {
  proofReuse: {
    search(query: ProofReuseQuery, correlationId?: string): Promise<ResultEnvelope<readonly ProofReuseResult[]>>;
  };
  proposalLoop: {
    run(declarationId: string, goal: string, options?: { config?: Partial<ProposalLoopConfig>; toolchain?: string }, correlationId?: string): Promise<ResultEnvelope<ProposalLoopResult>>;
  };
  translationFidelity: {
    check(request: FidelityCheckRequest, correlationId?: string): Promise<ResultEnvelope<FidelityCheckResult>>;
  };
  lp2: {
    pyToLean(code: string, correlationId?: string): Promise<ResultEnvelope<LP2TranslationResult>>;
    leanToPy(code: string, correlationId?: string): Promise<ResultEnvelope<LP2TranslationResult>>;
  };
  mathesis: {
    formalize(req: MathesisFormalizeRequest, correlationId?: string): Promise<ResultEnvelope<MathesisFormalizeResult>>;
  };
  treeThink: {
    treeSearch(req: TreeSearchRequest, correlationId?: string): Promise<ResultEnvelope<TreeSearchResult>>;
  };
}

export const bridgeAdapters: BridgeEnvelopeAdapters = {
  proofReuse: {
    search: async (query, correlationId = StructuredLogger.generateCorrelationId()) =>
      withEnvelope(() => proofReuseService.search(query), correlationId),
  },
  proposalLoop: {
    run: async (declarationId, goal, options, correlationId = StructuredLogger.generateCorrelationId()) =>
      withEnvelope(() => proposalLoop.run(declarationId, goal, options), correlationId),
  },
  translationFidelity: {
    check: async (request, correlationId = StructuredLogger.generateCorrelationId()) =>
      withEnvelope(() => translationFidelityGate.check(request), correlationId),
  },
  lp2: {
    pyToLean: async (code, correlationId = StructuredLogger.generateCorrelationId()) =>
      withEnvelope(() => lp2Adapter.pyToLean(code), correlationId),
    leanToPy: async (code, correlationId = StructuredLogger.generateCorrelationId()) =>
      withEnvelope(() => lp2Adapter.leanToPy(code), correlationId),
  },
  mathesis: {
    formalize: async (req, correlationId = StructuredLogger.generateCorrelationId()) =>
      withEnvelope(() => mathesisProvider.formalize(req), correlationId),
  },
  treeThink: {
    treeSearch: async (req, correlationId = StructuredLogger.generateCorrelationId()) =>
      withEnvelope(() => treeThinkProvider.treeSearch(req), correlationId),
  },
};

/**
 * Static registry of all 18 bridge services migrated to ResultEnvelope<T>
 */
export const MIGRATED_BRIDGES = [
  'PastaLeanBridge',
  'LungoBridge',
  'LeanFlowBridge',
  'LeanCertBridge',
  'NumpySpecBridge',
  'NerodiaBridge',
  'ProvePyBridge',
  'FaithfulnessGate',
  'SpanBridge',
  'LeanBlueprintClient',
  'LeanArchitectBridge',
  'CramfBridge',
  'ProofReuseService',
  'ProposalLoop',
  'TranslationFidelityGate',
  'LP2Adapter',
  'MathesisProvider',
  'TreeThinkProvider',
] as const;

export type MigratedBridgeName = typeof MIGRATED_BRIDGES[number];
