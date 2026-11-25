import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import {
  ConsensusRequestSchema,
  LeanExecuteRequestSchema,
} from '../../../src/types/contracts';
import { KiminaClientProxy, KiminaTimeoutError } from '../services/kimina-client-proxy';
import { type LeanProjectFile, type LeanProjectRunner } from '../services/lean-project-runner';
import {
  CANONICAL_VERIFICATION_PROTOCOL,
  type AdjudicationResultV1,
  type VerificationRequestV1,
} from '../services/verification/hybrid-adjudicator';
import { ConsensusExecutionOrchestrator } from '../services/verification/consensus-orchestrator';
import { isValidSha256Digest, normalizeSha256, sha256Hex } from '../services/verification/server-provenance';

function buildCanonicalProjectPayload(files: readonly LeanProjectFile[]): string {
  return JSON.stringify(
    [...files]
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((f) => ({ path: f.path, content: f.content })),
  );
}

export function createLeanRouter(proxy: KiminaClientProxy, runner?: LeanProjectRunner): Router {
  const router = Router();
  const orchestrator = new ConsensusExecutionOrchestrator(proxy, runner);

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

    const adjudication = await orchestrator.executeConsensus({
      verificationReq,
      kiminaSource,
      lakeFiles,
      sessionId: effectiveSessionId,
      timeoutMs,
    });
    res.status(200).json(adjudication);
  });

  return router;
}
