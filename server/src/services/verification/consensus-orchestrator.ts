/**
 * Server-Internal Consensus Execution Orchestrator
 *
 * Isolates cryptographic HMAC provenance minting strictly to authentic server-side
 * kernel runs triggered internally by /api/v1/lean/consensus. No signing hook is
 * exported to callers, tests, or client bundles.
 */

import crypto from 'node:crypto';
import type { KiminaClientProxy } from '../kimina-client-proxy';
import type { LeanProjectFile, LeanProjectRunner } from '../lean-project-runner';
import {
  CANONICAL_VERIFICATION_PROTOCOL,
  STANDARD_AXIOM_ALLOWLIST,
  adjudicateHybridConsensus,
  toAdjudicationResultV1,
  type AdjudicationResultV1,
  type EngineEvidence,
  type VerificationRequestV1,
} from './hybrid-adjudicator';
import {
  PROVENANCE_ISSUER,
  PROVENANCE_MAX_AGE_MS,
  PROVENANCE_SCHEMA_VERSION,
  buildCanonicalProvenancePayload,
  resolveServerProvenanceKeyRing,
  type ServerExecutionProvenance,
} from './server-provenance';

export interface ConsensusOrchestrationInput {
  readonly verificationReq: VerificationRequestV1;
  readonly kiminaSource: string;
  readonly lakeFiles: readonly LeanProjectFile[];
  readonly sessionId: string;
  readonly timeoutMs: number;
}

function buildUnavailableEvidence(
  engine: 'kimina' | 'lake',
  req: VerificationRequestV1,
  errorMessage: string,
): EngineEvidence {
  return {
    engine,
    contractVersion: CANONICAL_VERIFICATION_PROTOCOL,
    outcome: 'unavailable',
    requestId: req.requestId,
    sourceDigest: req.sourceDigest,
    contextDigest: req.contextDigest,
    manifestDigest: req.environment.manifestDigest,
    targetIds: req.targetIds,
    toolchain: req.environment.leanToolchain,
    durationMs: null,
    exitCode: null,
    diagnostics: [],
    axiomAudit: {
      status: 'not_run',
      observedAxioms: [],
      allowedAxioms: [...STANDARD_AXIOM_ALLOWLIST],
    },
    error: errorMessage,
  };
}

function signServerExecutionProvenance(
  evidence: Omit<EngineEvidence, 'provenance'> & { readonly engine: 'kimina' | 'lake' },
): ServerExecutionProvenance {
  const keyRing = resolveServerProvenanceKeyRing(process.env);
  const nowMs = Date.now();
  const issuedAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + PROVENANCE_MAX_AGE_MS).toISOString();
  const provenanceId = `prov-${crypto.randomUUID()}`;
  const nonce = crypto.randomBytes(16).toString('hex');
  const imageDigest = evidence.imageDigest ?? `${evidence.engine}-server-v1`;
  const manifestDigest =
    evidence.manifestDigest ?? evidence.contextDigest ?? evidence.sourceDigest;

  const payload = buildCanonicalProvenancePayload(
    {
      ...evidence,
      imageDigest,
      manifestDigest,
    },
    {
      schemaVersion: PROVENANCE_SCHEMA_VERSION,
      provenanceId,
      keyId: keyRing.active.keyId,
      issuer: PROVENANCE_ISSUER,
      issuedAt,
      expiresAt,
      nonce,
    },
  );

  const signature = crypto
    .createHmac('sha256', keyRing.active.secret)
    .update(payload)
    .digest('hex');

  return {
    schemaVersion: PROVENANCE_SCHEMA_VERSION,
    provenanceId,
    keyId: keyRing.active.keyId,
    issuer: PROVENANCE_ISSUER,
    signature,
    issuedAt,
    expiresAt,
    nonce,
    engine: evidence.engine,
    imageDigest,
    manifestDigest,
  };
}

function attachPrivateServerProvenance(
  evidence: Omit<EngineEvidence, 'provenance'>,
): EngineEvidence {
  if (evidence.engine !== 'kimina' && evidence.engine !== 'lake') {
    return evidence;
  }
  const provenance = signServerExecutionProvenance({
    ...evidence,
    engine: evidence.engine,
  });
  return {
    ...evidence,
    provenance,
  };
}

export class ConsensusExecutionOrchestrator {
  private readonly proxy: KiminaClientProxy;
  private readonly runner?: LeanProjectRunner;

  constructor(proxy: KiminaClientProxy, runner?: LeanProjectRunner) {
    this.proxy = proxy;
    this.runner = runner;
  }

  async executeConsensus(input: ConsensusOrchestrationInput): Promise<AdjudicationResultV1> {
    if (!this.runner) {
      const kiminaUnavail = buildUnavailableEvidence(
        'kimina',
        input.verificationReq,
        'Dual-engine runner unavailable.',
      );
      const lakeUnavail = buildUnavailableEvidence(
        'lake',
        input.verificationReq,
        'LeanProjectRunner is not mounted.',
      );
      const fallbackResult = adjudicateHybridConsensus(
        input.verificationReq,
        kiminaUnavail,
        lakeUnavail,
      );
      return toAdjudicationResultV1(fallbackResult);
    }

    const [kiminaOutcome, lakeOutcome] = await Promise.allSettled([
      this.proxy.verify(input.kiminaSource, input.timeoutMs),
      this.runner.build(input.sessionId, input.lakeFiles),
    ]);

    const kiminaEvidence: EngineEvidence =
      kiminaOutcome.status === 'fulfilled'
        ? attachPrivateServerProvenance(
            this.proxy.toEngineEvidence(input.verificationReq, kiminaOutcome.value),
          )
        : buildUnavailableEvidence(
            'kimina',
            input.verificationReq,
            kiminaOutcome.reason instanceof Error
              ? kiminaOutcome.reason.message
              : String(kiminaOutcome.reason),
          );

    const lakeEvidence: EngineEvidence =
      lakeOutcome.status === 'fulfilled'
        ? attachPrivateServerProvenance(
            this.runner.toEngineEvidence(input.verificationReq, lakeOutcome.value),
          )
        : buildUnavailableEvidence(
            'lake',
            input.verificationReq,
            lakeOutcome.reason instanceof Error
              ? lakeOutcome.reason.message
              : String(lakeOutcome.reason),
          );

    const adjudication = adjudicateHybridConsensus(
      input.verificationReq,
      kiminaEvidence,
      lakeEvidence,
    );
    return toAdjudicationResultV1(adjudication);
  }
}
