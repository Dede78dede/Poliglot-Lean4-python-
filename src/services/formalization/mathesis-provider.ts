/**
 * Mathesis Autoformalization Provider with LeanScorer (Phase 11.2, 12 & Phase 15 Wave 3)
 *
 * Implements natural language to Lean 4 formalization using remote Mathesis HTTP service.
 * Validates remote payloads with Zod and enforces LeanScorer threshold (>= 0.8).
 *
 * Fail-closed rules:
 * - ENABLE_MATHESIS=false -> 503 FEATURE_DISABLED
 * - MATHESIS_ENDPOINT unconfigured/empty, HTTP >= 400, network failure, timeout, or invalid JSON -> 503 MATHESIS_UNAVAILABLE
 * - Zero hardcoded theorem stubs or score simulation bypasses.
 *
 * Epistemic barrier:
 * Mathesis confidence and LeanScorer scores are heuristic ratings and do NOT certify truth.
 * Only SEAL_KERNEL_VERIFIED_TIER5 certifies truth.
 */

import { z } from 'zod';
import { featureFlagRegistry } from '../flags/feature-flag-registry';
import { BridgeError } from '../errors/bridge-error';
import { createLogger, StructuredLogger } from '../logging/logger';

const logger = createLogger('mathesis-provider');

export const MATHESIS_MIN_SCORE = 0.8;
export const MATHESIS_SCORE_THRESHOLD = MATHESIS_MIN_SCORE;
export const DEFAULT_MATHESIS_TIMEOUT_MS = 10_000;

export interface MathesisFormalizeRequest {
  readonly naturalLanguagePrompt: string;
  readonly context?: string;
  readonly targetToolchain?: string;
  readonly correlationId?: string;
  readonly endpointOverride?: string;
  readonly timeoutMs?: number;
}

export interface MathesisCandidate {
  readonly declarationName: string;
  readonly leanCode: string;
  readonly rawScore: number;
  readonly leanScorerScore: number;
  readonly passedThreshold: boolean;
  readonly fallbackCompilationScore?: number;
}

export interface MathesisFormalizeResult {
  readonly provider: 'mathesis';
  readonly leanCode: string;
  readonly declarations: readonly string[];
  readonly confidenceScore: number;
  readonly leanScorerScore: number;
  readonly accepted: boolean;
  readonly executionDurationMs: number;
  readonly candidates: readonly MathesisCandidate[];
}

const MathesisRemoteCandidateSchema = z.object({
  declarationName: z.string().min(1),
  leanCode: z.string().min(1),
  rawScore: z.number().min(0).max(1).optional(),
  leanScorerScore: z.number().min(0).max(1),
  fallbackCompilationScore: z.number().min(0).max(1).optional(),
});

const MathesisRemoteResponseSchema = z.object({
  leanCode: z.string().min(1).optional(),
  declarations: z.array(z.string().min(1)).optional(),
  leanScorerScore: z.number().min(0).max(1).optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  candidates: z.array(MathesisRemoteCandidateSchema).min(1),
});

export class MathesisProvider {
  public readonly name = 'mathesis';

  public getEndpoint(override?: string): string {
    if (override !== undefined) return override.trim();
    if (typeof process !== 'undefined' && process.env?.MATHESIS_ENDPOINT) {
      return process.env.MATHESIS_ENDPOINT.trim();
    }
    return '';
  }

  public isAvailable(endpointOverride?: string): boolean {
    const endpoint = this.getEndpoint(endpointOverride);
    if (endpoint.length === 0) return false;
    try {
      const parsed = new URL(endpoint);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Evaluates a Lean 4 formal candidate using LeanScorer structural heuristics.
   * Returns a score between 0.0 and 1.0.
   */
  public evaluateCandidateWithLeanScorer(leanCode: string, prompt: string): number {
    if (!leanCode || leanCode.trim().length === 0) return 0.0;

    let score = 0.6;
    if (leanCode.includes('theorem') || leanCode.includes('def') || leanCode.includes('lemma')) {
      score += 0.15;
    }
    if (leanCode.includes(':= by') || leanCode.includes(':=') || leanCode.includes('rfl')) {
      score += 0.1;
    }
    const promptWords = prompt.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const codeLower = leanCode.toLowerCase();
    const matchingWords = promptWords.filter((w) => codeLower.includes(w));
    if (promptWords.length > 0) {
      score += Math.min(0.15, (matchingWords.length / promptWords.length) * 0.15);
    }

    return Math.min(1.0, Math.max(0.0, Math.round(score * 100) / 100));
  }

  public async formalize(request: MathesisFormalizeRequest): Promise<MathesisFormalizeResult> {
    const correlationId = request.correlationId ?? StructuredLogger.generateCorrelationId();
    const startTime = Date.now();

    if (!featureFlagRegistry.isEnabled('ENABLE_MATHESIS')) {
      throw new BridgeError('FEATURE_DISABLED', correlationId, {
        feature: 'ENABLE_MATHESIS',
        message: 'Mathesis autoformalization is disabled by feature flag ENABLE_MATHESIS',
      });
    }

    const endpoint = this.getEndpoint(request.endpointOverride);
    if (!this.isAvailable(request.endpointOverride)) {
      logger.warn('Mathesis invocation failed fast: MATHESIS_ENDPOINT is unconfigured or invalid', correlationId);
      throw new BridgeError('MATHESIS_UNAVAILABLE', correlationId, {
        reason: 'MATHESIS_ENDPOINT is unconfigured, empty, or not a valid http(s) URL.',
        instructions: 'Configure MATHESIS_ENDPOINT in .env or Settings (e.g. MATHESIS_ENDPOINT="http://localhost:8088/v1/mathesis").',
      });
    }

    const timeoutMs = Math.max(100, request.timeoutMs ?? DEFAULT_MATHESIS_TIMEOUT_MS);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    timer.unref?.();

    logger.info('Executing Mathesis formalization via remote endpoint', correlationId, {
      endpoint,
      promptLength: request.naturalLanguagePrompt.length,
    });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
        },
        body: JSON.stringify({
          prompt: request.naturalLanguagePrompt.trim(),
          context: request.context,
          targetToolchain: request.targetToolchain ?? 'v4.34.0-rc1',
          correlationId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new BridgeError('MATHESIS_UNAVAILABLE', correlationId, {
          reason: `Remote Mathesis endpoint returned HTTP ${response.status}`,
          httpStatus: response.status,
          endpoint,
        });
      }

      let rawJson: unknown;
      try {
        rawJson = await response.json();
      } catch (parseErr) {
        throw new BridgeError('MATHESIS_UNAVAILABLE', correlationId, {
          reason: 'Remote Mathesis endpoint returned invalid JSON',
          detail: parseErr instanceof Error ? parseErr.message : String(parseErr),
        });
      }

      const parsed = MathesisRemoteResponseSchema.safeParse(rawJson);
      if (!parsed.success) {
        throw new BridgeError('MATHESIS_UNAVAILABLE', correlationId, {
          reason: 'Remote Mathesis payload failed Zod schema validation',
          issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        });
      }

      const remote = parsed.data;
      const normalizedCandidates: MathesisCandidate[] = remote.candidates.map((cand) => {
        const scorerScore = Number(cand.leanScorerScore);
        return {
          declarationName: cand.declarationName,
          leanCode: cand.leanCode,
          rawScore: cand.rawScore ?? scorerScore,
          leanScorerScore: scorerScore,
          passedThreshold: scorerScore >= MATHESIS_MIN_SCORE,
          fallbackCompilationScore: cand.fallbackCompilationScore,
        };
      });

      // Select highest-scoring candidate for primary result
      const bestCandidate = normalizedCandidates.reduce((best, curr) =>
        curr.leanScorerScore > best.leanScorerScore ? curr : best
      );

      const primaryScore = bestCandidate.leanScorerScore;
      const accepted = bestCandidate.passedThreshold;
      const leanCode = remote.leanCode ?? bestCandidate.leanCode;
      const declarations =
        remote.declarations && remote.declarations.length > 0
          ? remote.declarations
          : normalizedCandidates.map((c) => c.declarationName);

      return {
        provider: 'mathesis',
        leanCode,
        declarations,
        confidenceScore: remote.confidenceScore ?? primaryScore,
        leanScorerScore: primaryScore,
        accepted,
        executionDurationMs: Date.now() - startTime,
        candidates: normalizedCandidates,
      };
    } catch (err: unknown) {
      if (err instanceof BridgeError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new BridgeError('MATHESIS_UNAVAILABLE', correlationId, {
        reason: controller.signal.aborted
          ? `Mathesis request timed out after ${timeoutMs}ms`
          : `Failed to reach remote Mathesis endpoint: ${message}`,
        endpoint,
        instructions: 'Ensure remote Mathesis HTTP service is running and reachable at MATHESIS_ENDPOINT.',
      });
    } finally {
      clearTimeout(timer);
    }
  }
}

export const mathesisProvider = new MathesisProvider();
