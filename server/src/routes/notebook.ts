/**
 * Notebook Express Routes (Phase 13, Sprint 13.3, Task NB4)
 */

import { Router } from 'express';
import { featureFlagRegistry } from '../../../src/services/flags/feature-flag-registry';
import { notebookKernel } from '../../../src/workers/notebook.worker';

export const notebookRouter = Router();

interface SessionData {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

const activeSessions = new Map<string, SessionData>();

notebookRouter.post('/sessions', async (req, res) => {
  if (!featureFlagRegistry.isEnabled('ENABLE_NOTEBOOK')) {
    return res.status(403).json({
      type: 'https://polyglot.dev/errors/forbidden-operation',
      title: 'FORBIDDEN_OPERATION',
      status: 403,
      detail: 'Native notebook is disabled by feature flag ENABLE_NOTEBOOK=false.',
    });
  }

  const { name } = req.body as { name?: string };
  const id = `session-${Date.now()}`;
  const now = new Date().toISOString();

  const session: SessionData = {
    id,
    name: name ?? 'Untitled Notebook',
    createdAt: now,
    updatedAt: now,
  };

  activeSessions.set(id, session);
  return res.status(201).json(session);
});

notebookRouter.get('/sessions/:id', async (req, res) => {
  const { id } = req.params;
  const session = activeSessions.get(id);

  if (!session) {
    return res.status(404).json({
      type: 'https://polyglot.dev/errors/resource-not-found',
      title: 'RESOURCE_NOT_FOUND',
      status: 404,
      detail: `Notebook session ${id} not found.`,
    });
  }

  return res.json({
    ...session,
    kernelState: notebookKernel.getState(),
  });
});

notebookRouter.delete('/sessions/:id', async (req, res) => {
  const { id } = req.params;
  if (!activeSessions.has(id)) {
    return res.status(404).json({
      type: 'https://polyglot.dev/errors/resource-not-found',
      title: 'RESOURCE_NOT_FOUND',
      status: 404,
      detail: `Notebook session ${id} not found.`,
    });
  }

  activeSessions.delete(id);
  notebookKernel.restartKernel();
  return res.json({ deleted: true, id });
});

notebookRouter.post('/sessions/:id/cells', async (req, res) => {
  const { id } = req.params;
  if (!activeSessions.has(id)) {
    return res.status(404).json({
      type: 'https://polyglot.dev/errors/resource-not-found',
      title: 'RESOURCE_NOT_FOUND',
      status: 404,
      detail: `Notebook session ${id} not found.`,
    });
  }

  const { cellId, code, timeoutMs } = req.body as { cellId?: string; code?: string; timeoutMs?: number };
  if (!cellId || code === undefined) {
    return res.status(400).json({
      type: 'https://polyglot.dev/errors/invalid-json-input',
      title: 'INVALID_JSON_INPUT',
      status: 400,
      detail: 'cellId and code are required fields.',
    });
  }

  const result = await notebookKernel.executeCell(cellId, code, timeoutMs ?? 10_000);
  return res.json(result);
});
