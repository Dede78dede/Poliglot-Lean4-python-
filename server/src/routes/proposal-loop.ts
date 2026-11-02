/**
 * Proposal Loop Express Routes (Phase 12, Sprint 12.2, Task PL3)
 */

import { Router } from 'express';
import { proposalLoop } from '../../../src/services/proof/proposal-loop/proposal-loop';
import { automationMetrics } from '../../../src/services/proof/metrics/automation-metrics';

export const proposalLoopRouter = Router();

proposalLoopRouter.post('/', async (req, res) => {
  try {
    const { declarationId, goal, config, toolchain } = req.body as {
      declarationId: string;
      goal: string;
      config?: Record<string, unknown>;
      toolchain?: string;
    };

    if (!declarationId || !goal) {
      return res.status(400).json({
        type: 'https://polyglot.dev/errors/invalid-json-input',
        title: 'INVALID_JSON_INPUT',
        status: 400,
        detail: 'declarationId and goal are required fields for ProposalLoop.',
      });
    }

    const result = await proposalLoop.run(declarationId, goal, {
      config,
      toolchain,
    });

    automationMetrics.recordProposal(result.proved, result.totalCostUsd);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      type: 'https://polyglot.dev/errors/internal-server-error',
      title: 'INTERNAL_SERVER_ERROR',
      status: 500,
      detail: message,
    });
  }
});

proposalLoopRouter.get('/events/:declarationId', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { declarationId } = req.params;
  res.write(`data: ${JSON.stringify({ type: 'LOOP_INIT', declarationId, timestamp: Date.now() })}\n\n`);

  const timer = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'HEARTBEAT', timestamp: Date.now() })}\n\n`);
  }, 10000);

  req.on('close', () => {
    clearInterval(timer);
    res.end();
  });
});
