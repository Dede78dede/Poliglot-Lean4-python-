import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { LeanExecuteRequestSchema } from '../../../src/types/contracts';
import { KiminaClientProxy, KiminaTimeoutError } from '../services/kimina-client-proxy';
import { type LeanProjectFile, type LeanProjectRunner } from '../services/lean-project-runner';
import {
  CANONICAL_VERIFICATION_PROTOCOL,
  STANDARD_AXIOM_ALLOWLIST,
  STANDARD_AXIOM_POLICY,
  adjudicateHybridConsensus,
  toAdjudicationResultV1,
  type AdjudicationResultV1,
  type EngineEvidence,
  type VerificationRequestV1,
} from '../services/verification/hybrid-adjudicator';
import { isValidSha256Digest, normalizeSha256, sha256Hex } from '../services/verification/server-provenance';

const ProjectFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

const ConsensusRequestSchema = z.object({
  protocolVersion: z.literal(CANONICAL_VERIFICATION_PROTOCOL),
  requestId: z.string().min(1),
  scope: z.enum(['snippet', 'project']),
  sourceDigest: z.string().min(1),
  contextDigest: z.string().optional(),
  targetIds: z.array(z.string()).optional(),
  code: z.string().optional(),
  files: z.array(ProjectFileSchema).optional(),
  sessionId: z.string().uuid().optional(),
  timeoutMs: z.number().int().positive().max(300_000).optional(),
  environment: z.object({
    leanToolchain: z.string(),
    kiminaImageDigest: z.string().optional(),
    lakeRunnerImageDigest: z.string().optional(),
    manifestDigest: z.string().optional(),
  }),
  axiomPolicyId: z.string().default(STANDARD_AXIOM_POLICY),
  requireConsensus: z.boolean().default(true),
  kiminaEvidence: z.never().optional(),
  lakeEvidence: z.never().optional(),
});

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

function buildCanonicalProjectPayload(files: readonly LeanProjectFile[]): string {
  return JSON.stringify(
    [...files]
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((f) => ({ path: f.path, content: f.content })),
  );
}

export function createLeanRouter(proxy: KiminaClientProxy, runner?: LeanProjectRunner): Router {
  const router = Router();

  // POST /api/v1/lean/execute
  router.post('/execute', async (req: Request, res: Response): Promise<void> => {
    const parseResult = LeanExecuteRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        type: 'https://polyglot.dev/errors/invalid-request',
        title: 'Validation Failed',
        status: 400,
        detail: parseResult.error.issues
          .map((i: z.ZodIssue) => `${i.path.join('.')}: ${i.message}`)
          .join(', '),
      });
      return;
    }

    const { code, timeoutMs } = parseResult.data;

    try {
      const result = await proxy.verify(code, timeoutMs);

      res.setHeader('X-Kimina-Simulated', String(result.simulated));
      res.status(200).json({
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        verified: result.verified,
        simulated: result.simulated,
        correlationId: result.correlationId,
        sorries: result.sorries,
        diagnostics: result.diagnostics,
      });
    } catch (err: unknown) {
      if (err instanceof KiminaTimeoutError) {
        res.status(408).json({
          type: 'https://polyglot.dev/errors/lean-timeout',
          title: 'Lean 4 Execution Timeout',
          status: 408,
          detail: err.message,
        });
        return;
      }

      console.error('[LeanRoute Error]', err);
      res.status(502).json({
        type: 'https://polyglot.dev/errors/upstream-error',
        title: 'Kimina Lean Server Unavailable',
        status: 502,
        detail: err instanceof Error ? err.message : 'Unknown upstream error',
      });
    }
  });

  // POST /api/v1/lean/consensus
  router.post('/consensus', async (req: Request, res: Response): Promise<void> => {
    // Invariant 2: Reject any caller-forged evidence immediately
    if (req.body && typeof req.body === 'object' && ('kiminaEvidence' in req.body || 'lakeEvidence' in req.body)) {
      res.status(400).json({
        type: 'https://polyglot.dev/errors/forged-evidence-rejected',
        title: 'Caller-Supplied Evidence Prohibited',
        status: 400,
        detail: 'Epistemic Invariant 2 violation: client callers may not supply engine evidence to mint consensus verification.',
      });
      return;
    }

    const parse = ConsensusRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        type: 'https://polyglot.dev/errors/invalid-request',
        title: 'Consensus Request Validation Failed',
        status: 400,
        detail: parse.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
      });
      return;
    }

    const requestData = parse.data;
    const verificationReq: VerificationRequestV1 = {
      protocolVersion: CANONICAL_VERIFICATION_PROTOCOL,
      requestId: requestData.requestId,
      scope: requestData.scope,
      sourceDigest: requestData.sourceDigest,
      contextDigest: requestData.contextDigest,
      targetIds: requestData.targetIds,
      environment: requestData.environment,
      axiomPolicyId: requestData.axiomPolicyId,
      requireConsensus: requestData.requireConsensus,
    };

    const hasCode = typeof requestData.code === 'string' && requestData.code.trim().length > 0;
    const hasFiles = Array.isArray(requestData.files) && requestData.files.length > 0;

    if (!hasCode && !hasFiles) {
      const adjudication: AdjudicationResultV1 = {
        protocolVersion: CANONICAL_VERIFICATION_PROTOCOL,
        requestId: verificationReq.requestId,
        verdict: 'unconfirmed',
        verified: false,
        seal: null,
        axiomPolicyCompliance: false,
        enginesConsulted: ['kimina', 'lake'],
        consensusAchieved: false,
        reason: 'Server-side dual-engine execution required. Supply canonical code or project files.',
        diagnostics: [],
      };
      res.status(200).json(adjudication);
      return;
    }

    if (!isValidSha256Digest(requestData.sourceDigest)) {
      res.status(400).json({
        type: 'https://polyglot.dev/errors/invalid-digest',
        title: 'Invalid Source Digest',
        status: 400,
        detail: 'sourceDigest must be a canonical 64-character SHA-256 hex digest.',
      });
      return;
    }

    const kiminaSource = hasCode
      ? requestData.code!
      : requestData.files!
          .filter((f) => f.path.endsWith('.lean'))
          .sort((a, b) => a.path.localeCompare(b.path))
          .map((f) => f.content)
          .join('\n\n');

    const canonicalPayload = hasCode ? requestData.code! : buildCanonicalProjectPayload(requestData.files!);
    const computedSourceDigest = sha256Hex(canonicalPayload);
    if (normalizeSha256(requestData.sourceDigest) !== normalizeSha256(computedSourceDigest)) {
      res.status(400).json({
        type: 'https://polyglot.dev/errors/digest-mismatch',
        title: 'Source Digest Mismatch',
        status: 400,
        detail: `Submitted sourceDigest (${requestData.sourceDigest}) does not match server SHA-256 digest of payload (${computedSourceDigest}).`,
      });
      return;
    }

    if (!runner) {
      const kiminaUnavail = buildUnavailableEvidence('kimina', verificationReq, 'Dual-engine runner unavailable.');
      const lakeUnavail = buildUnavailableEvidence('lake', verificationReq, 'LeanProjectRunner is not mounted.');
      const fallbackResult = adjudicateHybridConsensus(verificationReq, kiminaUnavail, lakeUnavail);
      res.status(200).json(toAdjudicationResultV1(fallbackResult));
      return;
    }

    const effectiveSessionId = requestData.sessionId ?? crypto.randomUUID();
    const timeoutMs = requestData.timeoutMs ?? proxy.getConfig().timeoutMs;

    const lakeFiles: LeanProjectFile[] = hasFiles
      ? [...requestData.files!]
      : [
          { path: 'lean-toolchain', content: `${requestData.environment.leanToolchain}\n` },
          {
            path: 'lakefile.toml',
            content: 'name = "consensus"\ndefaultTargets = ["Consensus"]\n[[lean_lib]]\nname = "Consensus"\n',
          },
          { path: 'Consensus.lean', content: requestData.code! },
        ];

    const [kiminaOutcome, lakeOutcome] = await Promise.allSettled([
      proxy.verify(kiminaSource, timeoutMs),
      runner.build(effectiveSessionId, lakeFiles),
    ]);

    const kiminaEvidence: EngineEvidence =
      kiminaOutcome.status === 'fulfilled'
        ? proxy.toEngineEvidence(verificationReq, kiminaOutcome.value)
        : buildUnavailableEvidence(
            'kimina',
            verificationReq,
            kiminaOutcome.reason instanceof Error ? kiminaOutcome.reason.message : String(kiminaOutcome.reason),
          );

    const lakeEvidence: EngineEvidence =
      lakeOutcome.status === 'fulfilled'
        ? runner.toEngineEvidence(verificationReq, lakeOutcome.value)
        : buildUnavailableEvidence(
            'lake',
            verificationReq,
            lakeOutcome.reason instanceof Error ? lakeOutcome.reason.message : String(lakeOutcome.reason),
          );

    const adjudication = adjudicateHybridConsensus(verificationReq, kiminaEvidence, lakeEvidence);
    res.status(200).json(toAdjudicationResultV1(adjudication));
  });

  return router;
}
