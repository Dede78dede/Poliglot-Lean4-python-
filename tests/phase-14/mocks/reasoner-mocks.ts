/**
 * Ephemeral HTTP Mock Servers for Mathesis & TreeThink (Phase 15 Wave 3 Verification)
 *
 * Strictly test-only helper bound to 127.0.0.1 ephemeral ports.
 */

import http from 'node:http';
import { AddressInfo } from 'node:net';

export interface MathesisMockOptions {
  readonly score?: number;
  readonly fallbackCompilationScore?: number;
  readonly declarationName?: string;
  readonly leanCode?: string;
  readonly returnStatus?: number;
  readonly returnMalformedJson?: boolean;
  readonly returnInvalidSchema?: boolean;
}

export interface EphemeralMockHandle {
  readonly url: string;
  readonly requestCount: () => number;
  readonly close: () => Promise<void>;
}

export async function startMathesisMockServer(
  optionsOrHandler: MathesisMockOptions | ((body: Record<string, unknown>, reqCount: number) => unknown) = {}
): Promise<EphemeralMockHandle> {
  let count = 0;

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      count++;
      let parsedBody: Record<string, unknown> = {};
      try {
        parsedBody = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as Record<string, unknown>;
      } catch {
        // ignore parse issue
      }

      if (typeof optionsOrHandler === 'function') {
        const result = optionsOrHandler(parsedBody, count);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
        return;
      }

      const opts = optionsOrHandler;
      if (opts.returnStatus && opts.returnStatus >= 400) {
        res.statusCode = opts.returnStatus;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Upstream failure' }));
        return;
      }
      if (opts.returnMalformedJson) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end('{not valid json');
        return;
      }
      if (opts.returnInvalidSchema) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ wrong: 'shape' }));
        return;
      }

      const score = opts.score ?? 0.94;
      const declName = opts.declarationName ?? 'mathesis_synthesized_theorem';
      const leanCode =
        opts.leanCode ??
        [
          '-- Formalized via Mathesis HTTP Service',
          'import Mathlib.Data.Nat.Basic',
          '',
          `theorem ${declName} : True := by`,
          '  trivial',
        ].join('\n');

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          leanCode,
          declarations: [declName],
          leanScorerScore: score,
          confidenceScore: score,
          candidates: [
            {
              declarationName: declName,
              leanCode,
              rawScore: score,
              leanScorerScore: score,
              fallbackCompilationScore: opts.fallbackCompilationScore ?? 0.95,
            },
          ],
        })
      );
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}/v1/mathesis`,
    requestCount: () => count,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections?.();
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

export interface TreeThinkMockOptions {
  readonly closeOnDepth?: number;
  readonly neverClose?: boolean;
  readonly returnStatus?: number;
  readonly returnMalformedJson?: boolean;
}

export async function startTreeThinkMockServer(
  options: TreeThinkMockOptions = {}
): Promise<EphemeralMockHandle> {
  let count = 0;

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      count++;
      let body: { goal?: string; depth?: number; history?: string[] } = {};
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as typeof body;
      } catch {
        // ignore
      }

      if (options.returnStatus && options.returnStatus >= 400) {
        res.statusCode = options.returnStatus;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'TreeThink unavailable' }));
        return;
      }
      if (options.returnMalformedJson) {
        res.statusCode = 200;
        res.end('<<<broken>>>');
        return;
      }

      const depth = body.depth ?? 0;
      const closeOnDepth = options.closeOnDepth ?? 1;
      const shouldClose = !options.neverClose && depth >= closeOnDepth;

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      if (shouldClose) {
        res.end(
          JSON.stringify({
            candidates: [
              {
                tactic: 'omega',
                score: 0.92,
                closed: true,
                subgoals: [],
                proofSoFar: `by\n  ${[...(body.history ?? []), 'omega'].join('\n  ')}`,
              },
            ],
          })
        );
      } else {
        res.end(
          JSON.stringify({
            candidates: [
              {
                tactic: `intro h_${depth}`,
                score: 0.78,
                closed: false,
                subgoals: [`subgoal_depth_${depth + 1}_a`],
              },
              {
                tactic: `simp [h_${depth}]`,
                score: 0.65,
                closed: false,
                subgoals: [`subgoal_depth_${depth + 1}_b`],
              },
            ],
          })
        );
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}/v1/treethink`,
    requestCount: () => count,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections?.();
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
