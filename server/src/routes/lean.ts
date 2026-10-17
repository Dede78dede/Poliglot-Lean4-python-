import type { Request, Response } from 'express';
import { z } from 'zod';
import { LeanExecuteRequestSchema } from '@/src/types/contracts';
import { KiminaClientProxy, KiminaTimeoutError } from '../services/kimina-client-proxy';

export function createLeanRouter(proxy: KiminaClientProxy) {
  return async (req: Request, res: Response): Promise<void> => {
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
  };
}
