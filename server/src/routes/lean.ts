import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { LeanExecuteRequestSchema } from '../../../src/types/contracts';
import { KiminaClientProxy, KiminaTimeoutError } from '../services/kimina-client-proxy';
import {
  CANONICAL_VERIFICATION_PROTOCOL,
  STANDARD_AXIOM_POLICY,
  adjudicateHybridConsensus,
  type VerificationRequestV1,
  type EngineEvidence,
  type HybridAdjudicationResult,
  type AdjudicationResultV1,
} from '../services/verification/hybrid-adjudicator';

const ConsensusRequestSchema = z.object({
  protocolVersion: z.literal(CANONICAL_VERIFICATION_PROTOCOL),
  requestId: z.string().min(1),
  scope: z.enum(['snippet', 'project']),
  sourceDigest: z.string().min(1),
  contextDigest: z.string().optional(),
  targetIds: z.array(z.string()).optional(),
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

export function createLeanRouter(proxy: KiminaClientProxy): Router {
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
  router.post('/consensus', (req: Request, res: Response): void => {
    // Invariant 2 (Defect B contained): Reject any caller-forged evidence immediately
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

    // Engine evidence must be generated server-side through genuine engine execution.
    // Untrusted external requests without verified server-side evidence fail closed.
    const adjudication: AdjudicationResultV1 = {
      protocolVersion: CANONICAL_VERIFICATION_PROTOCOL,
      requestId: verificationReq.requestId,
      verdict: 'unconfirmed',
      verified: false,
      seal: null,
      axiomPolicyCompliance: false,
      enginesConsulted: ['kimina', 'lake'],
      consensusAchieved: false,
      reason: 'Server-side dual-engine execution required. Client cannot supply engine evidence.',
      diagnostics: [],
    };

    res.status(200).json(adjudication);
  });

  return router;
}
