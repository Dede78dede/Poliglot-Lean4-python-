/**
 * TreeThinkProvider (Phase 12 & Phase 15 Wave 3)
 *
 * Implements bounded MCTS / BFTS / BeamSearch tree search over Lean 4 proof states
 * backed by an authenticated/configured remote TreeThink search service or explicit
 * step evaluator.
 *
 * Fail-closed rules:
 * - ENABLE_TREETHINK=false -> BridgeError('FEATURE_DISABLED') with TREETHINK_UNAVAILABLE context.
 * - No LEAN_TREETHINK_ENDPOINT (and no stepEvaluator) or remote failure/invalid payload
 *   -> BridgeError('TREETHINK_UNAVAILABLE').
 * - Zero hardcoded proof stubs (`nodesExplored = 42` / `proved = true` removed).
 *
 * Epistemic Rules:
 * - TreeThink candidates are heuristic proposals only (`requiresKernelVerification: true`).
 * - Never emits a certifying verification flag or `SEAL_KERNEL_VERIFIED_TIER5`.
 */

import { z } from 'zod';
import { featureFlagRegistry } from '../../flags/feature-flag-registry';
import { BridgeError } from '../../errors/bridge-error';
import { StructuredLogger } from '../../logging/logger';

export interface TreeSearchExpansionCandidate {
  readonly tactic: string;
  readonly score: number;
  readonly closed: boolean;
  readonly subgoals?: readonly string[];
  readonly proofSoFar?: string;
}

export type TreeSearchStepEvaluator = (input: {
  readonly goal: string;
  readonly depth: number;
  readonly history: readonly string[];
  readonly signal: AbortSignal;
}) => Promise<readonly TreeSearchExpansionCandidate[]>;

export interface TreeSearchRequest {
  readonly goal: string;
  readonly method?: 'mcts' | 'bfts' | 'beam';
  readonly maxDepth?: number;
  readonly maxNodes?: number;
  readonly budgetSeconds?: number;
  readonly beamWidth?: number;
  readonly endpointOverride?: string;
  readonly stepEvaluator?: TreeSearchStepEvaluator;
  readonly correlationId?: string;
}

export interface TreeSearchResult {
  readonly proved: boolean;
  readonly status: 'candidate_found' | 'search_exhausted';
  readonly proof?: string;
  readonly method: 'mcts' | 'bfts' | 'beam';
  readonly nodesExplored: number;
  readonly maxDepthReached: number;
  readonly durationMs: number;
  readonly requiresKernelVerification: true;
}

const RemoteCandidateSchema = z.object({
  tactic: z.string().min(1),
  score: z.number().min(0).max(1),
  closed: z.boolean(),
  subgoals: z.array(z.string()).optional(),
  proofSoFar: z.string().optional(),
});

const RemoteExpandResponseSchema = z.object({
  candidates: z.array(RemoteCandidateSchema),
});

interface SearchNode {
  goal: string;
  depth: number;
  score: number;
  visits: number;
  history: string[];
}

export class TreeThinkProvider {
  public getEndpoint(override?: string): string {
    if (override !== undefined) return override.trim();
    if (typeof process !== 'undefined' && process.env?.LEAN_TREETHINK_ENDPOINT) {
      return process.env.LEAN_TREETHINK_ENDPOINT.trim();
    }
    return '';
  }

  public isAvailable(endpointOverride?: string): boolean {
    if (!featureFlagRegistry.isEnabled('ENABLE_TREETHINK')) return false;
    const ep = this.getEndpoint(endpointOverride);
    if (!ep) return false;
    try {
      const parsed = new URL(ep);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private async evaluateViaHttp(
    endpoint: string,
    correlationId: string,
    input: { goal: string; depth: number; history: readonly string[]; signal: AbortSignal }
  ): Promise<readonly TreeSearchExpansionCandidate[]> {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
        },
        body: JSON.stringify({
          goal: input.goal,
          depth: input.depth,
          history: input.history,
          correlationId,
        }),
        signal: input.signal,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BridgeError('TREETHINK_UNAVAILABLE', correlationId, {
        reason: input.signal.aborted
          ? 'TreeThink search timed out / budget exhausted while contacting remote service.'
          : `Failed to reach TreeThink endpoint: ${message}`,
        endpoint,
      });
    }

    if (!response.ok) {
      throw new BridgeError('TREETHINK_UNAVAILABLE', correlationId, {
        reason: `Remote TreeThink endpoint returned HTTP ${response.status}`,
        httpStatus: response.status,
        endpoint,
      });
    }

    let rawJson: unknown;
    try {
      rawJson = await response.json();
    } catch (parseErr) {
      throw new BridgeError('TREETHINK_UNAVAILABLE', correlationId, {
        reason: 'Remote TreeThink endpoint returned invalid JSON',
        detail: parseErr instanceof Error ? parseErr.message : String(parseErr),
      });
    }

    const parsed = RemoteExpandResponseSchema.safeParse(rawJson);
    if (!parsed.success) {
      throw new BridgeError('TREETHINK_UNAVAILABLE', correlationId, {
        reason: 'Remote TreeThink payload failed Zod schema validation',
        issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      });
    }

    return parsed.data.candidates;
  }

  public async treeSearch(request: TreeSearchRequest): Promise<TreeSearchResult> {
    const correlationId = request.correlationId ?? StructuredLogger.generateCorrelationId();
    const startTime = Date.now();

    if (!featureFlagRegistry.isEnabled('ENABLE_TREETHINK')) {
      const err = new BridgeError('FEATURE_DISABLED', correlationId, {
        feature: 'ENABLE_TREETHINK',
        message: 'TREETHINK_UNAVAILABLE: ENABLE_TREETHINK feature flag is disabled',
      });
      (err as any).message = 'TREETHINK_UNAVAILABLE: TreeThink search is disabled by feature flag ENABLE_TREETHINK';
      throw err;
    }

    const endpoint = this.getEndpoint(request.endpointOverride);
    const hasValidEndpoint = (() => {
      if (!endpoint) return false;
      try {
        const u = new URL(endpoint);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    })();

    if (!hasValidEndpoint && !request.stepEvaluator) {
      throw new BridgeError('TREETHINK_UNAVAILABLE', correlationId, {
        reason: 'LEAN_TREETHINK_ENDPOINT is unconfigured/invalid and no stepEvaluator was provided.',
        instructions: 'Set LEAN_TREETHINK_ENDPOINT to an HTTP(S) search service before enabling ENABLE_TREETHINK.',
      });
    }

    const method = request.method ?? 'mcts';
    const maxDepth = Math.max(1, Math.min(32, request.maxDepth ?? 8));
    const maxNodes = Math.max(1, Math.min(512, request.maxNodes ?? 64));
    const budgetMs = Math.max(50, (request.budgetSeconds ?? 10) * 1000);
    const beamWidth = Math.max(1, request.beamWidth ?? 4);

    const controller = new AbortController();
    const deadlineTimer = setTimeout(() => controller.abort(), budgetMs);
    deadlineTimer.unref?.();

    const evaluator: TreeSearchStepEvaluator =
      request.stepEvaluator ??
      ((input) => this.evaluateViaHttp(endpoint, correlationId, input));

    let nodesExplored = 0;
    let maxDepthReached = 0;
    const deadline = startTime + budgetMs;

    const frontier: SearchNode[] = [
      { goal: request.goal, depth: 0, score: 1.0, visits: 1, history: [] },
    ];

    try {
      while (frontier.length > 0 && nodesExplored < maxNodes && Date.now() < deadline && !controller.signal.aborted) {
        // Pick next node according to search method
        if (method === 'bfts' || method === 'beam') {
          frontier.sort((a, b) => b.score - a.score);
        } else {
          // MCTS-style UCB1 prioritization
          const logTotal = Math.log(Math.max(1, nodesExplored + 1));
          frontier.sort((a, b) => {
            const ucbA = a.score + 0.35 * Math.sqrt(logTotal / a.visits);
            const ucbB = b.score + 0.35 * Math.sqrt(logTotal / b.visits);
            return ucbB - ucbA;
          });
        }

        const current = frontier.shift()!;
        nodesExplored++;
        if (current.depth > maxDepthReached) {
          maxDepthReached = current.depth;
        }

        if (current.depth >= maxDepth) {
          continue;
        }

        const candidates = await evaluator({
          goal: current.goal,
          depth: current.depth,
          history: current.history,
          signal: controller.signal,
        });

        for (const cand of candidates) {
          const nextHistory = [...current.history, cand.tactic];
          if (cand.closed || (cand.subgoals && cand.subgoals.length === 0)) {
            maxDepthReached = Math.max(maxDepthReached, current.depth + 1);
            return {
              proved: true,
              status: 'candidate_found',
              proof: cand.proofSoFar ?? `by\n  ${nextHistory.join('\n  ')}`,
              method,
              nodesExplored,
              maxDepthReached,
              durationMs: Date.now() - startTime,
              requiresKernelVerification: true,
            };
          }

          if (current.depth + 1 <= maxDepth && cand.subgoals && cand.subgoals.length > 0) {
            frontier.push({
              goal: cand.subgoals[0],
              depth: current.depth + 1,
              score: cand.score,
              visits: 1,
              history: nextHistory,
            });
          }
        }

        if (method === 'beam' && frontier.length > beamWidth) {
          frontier.sort((a, b) => b.score - a.score);
          frontier.length = beamWidth;
        }
      }

      return {
        proved: false,
        status: 'search_exhausted',
        method,
        nodesExplored,
        maxDepthReached,
        durationMs: Date.now() - startTime,
        requiresKernelVerification: true,
      };
    } finally {
      clearTimeout(deadlineTimer);
    }
  }
}

export const treeThinkProvider = new TreeThinkProvider();
