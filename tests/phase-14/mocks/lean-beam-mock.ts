/**
 * Test-only Ephemeral HTTP JSON-RPC 2.0 Server for lean-beam MCP tests.
 */

import http from 'node:http';

export interface LeanBeamMockOptions {
  readonly slowTactic?: string;
  readonly slowDelayMs?: number;
  readonly malformedForTactic?: string;
  readonly onAborted?: (tactic: string) => void;
}

export async function startLeanBeamMockServer(options: LeanBeamMockOptions = {}): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const handles = new Map<string, string[]>();

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk as Buffer));
    req.on('end', () => {
      let body: { id?: string | number; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } };
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      const toolName = body.params?.name ?? '';
      const args = body.params?.arguments ?? {};
      const tactic = String(args.text ?? '');

      const respond = () => {
        if (options.malformedForTactic && tactic.includes(options.malformedForTactic)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('not-valid-json{{{');
          return;
        }

        const lower = tactic.trim().toLowerCase();
        const isInvalid =
          lower.includes('broken') ||
          lower.includes('unknown_tactic') ||
          lower.includes('syntax error') ||
          lower.startsWith('fail') ||
          lower === 'invalid_tactic';

        let result: unknown;
        if (toolName === 'lean_todo') {
          result = [
            {
              path: String(args.path ?? 'Main.lean'),
              line: Number(args.startLine ?? 1),
              type: 'sorry',
              goal: '⊢ True',
            },
          ];
        } else if (toolName === 'lean_run_at_handle') {
          const handle = `beam-handle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const goalsAfter = isInvalid ? ['1 goal\n⊢ 1 + 1 = 2'] : ['1 goal\ncase h\n⊢ 2 = 2'];
          handles.set(handle, goalsAfter);
          result = {
            valid: !isInvalid,
            goalsBefore: ['1 goal\n⊢ 1 + 1 = 2'],
            goalsAfter,
            errors: isInvalid ? [`Unknown tactic: '${tactic}'`] : [],
            handle,
            speculativelyTested: true,
          };
        } else if (toolName === 'lean_run_with' || toolName === 'lean_run_with_linear') {
          const handleId = String(args.handle ?? '');
          const goalsBefore = handles.get(handleId) ?? ['1 goal\n⊢ 1 + 1 = 2'];
          result = {
            valid: !isInvalid,
            goalsBefore,
            goalsAfter: isInvalid ? goalsBefore : [],
            errors: isInvalid ? [`Unknown continuation tactic: ${tactic}`] : [],
            speculativelyTested: true,
          };
        } else {
          const isClosing =
            lower === 'rfl' ||
            lower === 'omega' ||
            lower === 'simp' ||
            lower.includes('linarith') ||
            lower.includes('omega') ||
            lower.startsWith('exact') ||
            lower === 'trivial';
          result = {
            valid: !isInvalid,
            goalsBefore: ['1 goal\n⊢ 1 + 1 = 2'],
            goalsAfter: isInvalid ? [] : isClosing ? [] : ['1 goal\ncase h\n⊢ 2 = 2'],
            errors: isInvalid ? [`Unknown tactic: '${tactic}'`] : [],
            speculativelyTested: true,
          };
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            id: body.id ?? 1,
            result,
          })
        );
      };

      if (options.slowTactic && tactic.includes(options.slowTactic)) {
        const delayTimer = setTimeout(respond, options.slowDelayMs ?? 1500);
        req.on('close', () => {
          if (!res.writableEnded) {
            clearTimeout(delayTimer);
            options.onAborted?.(tactic);
          }
        });
      } else {
        respond();
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as { port: number }).port;
  return {
    url: `http://127.0.0.1:${port}/mcp`,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}
