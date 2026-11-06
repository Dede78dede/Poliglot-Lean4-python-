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
  kiminaEvidence: z.any().optional(),
  lakeEvidence: z.any().optional(),
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

    const { kiminaEvidence, lakeEvidence, ...requestData } = parse.data;

    if (!kiminaEvidence || !lakeEvidence) {
      res.status(400).json({
        type: 'https://polyglot.dev/errors/missing-evidence',
        title: 'Missing Sub-Engine Evidence',
        status: 400,
        detail: 'Both kiminaEvidence and lakeEvidence are required to adjudicate hybrid consensus.',
      });
      return;
    }

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

    const adjudication = adjudicateHybridConsensus(
      verificationReq,
      kiminaEvidence as EngineEvidence,
      lakeEvidence as EngineEvidence,
    );

    res.status(200).json(adjudication);
  });

  return router;
}
