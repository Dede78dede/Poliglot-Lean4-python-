import { Router, Request, Response } from 'express';
import type { WorkspaceStore } from '../services/collaboration/workspace-store';
import { extractBlueprintDAG, type SourceFilePayload } from '../services/collaboration/blueprint-extractor';

export function createWorkspacesRouter(store: WorkspaceStore): Router {
  const router = Router();

  // List all workspaces
  router.get('/', (_req: Request, res: Response) => {
    try {
      const summaries = store.listWorkspaces();
      res.status(200).json({ workspaces: summaries });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: msg });
    }
  });

  // Create new workspace
  router.post('/', (req: Request, res: Response) => {
    try {
      const { id, name, description, toolchain, nodes, edges } = req.body || {};
      if (!id || !name) {
        res.status(400).json({ error: 'VALIDATION_ERROR', message: 'id and name are required' });
        return;
      }

      const ws = store.createWorkspace({
        id: String(id),
        name: String(name),
        description: String(description || ''),
        toolchain: toolchain ? String(toolchain) : undefined,
        nodes,
        edges,
      });

      res.status(201).json({ workspace: ws });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: msg });
    }
  });

  // Get workspace details
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const ws = store.getWorkspace(req.params.id);
      if (!ws) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Workspace not found' });
        return;
      }
      res.status(200).json({ workspace: ws });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: msg });
    }
  });

  // Get blueprint DAG
  router.get('/:id/blueprint', (req: Request, res: Response) => {
    try {
      const ws = store.getWorkspace(req.params.id);
      if (!ws) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Workspace not found' });
        return;
      }
      res.status(200).json({
        nodes: ws.nodes,
        edges: ws.edges,
        budget: ws.budget,
        roadmap: ws.roadmap,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: msg });
    }
  });

  // Extract blueprint DAG from provided files
  router.post('/:id/blueprint/extract', (req: Request, res: Response) => {
    try {
      const { files } = req.body as { files?: SourceFilePayload[] };
      if (!files || !Array.isArray(files)) {
        res.status(400).json({ error: 'VALIDATION_ERROR', message: 'files array is required' });
        return;
      }

      const extracted = extractBlueprintDAG(files);
      res.status(200).json(extracted);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: msg });
    }
  });

  // Claim declaration node
  router.post('/:id/blueprint/claim', (req: Request, res: Response) => {
    try {
      const { nodeId, userId, userName, userColor, agentType, notes } = req.body || {};
      if (!nodeId || !userId || !userName) {
        res.status(400).json({ error: 'VALIDATION_ERROR', message: 'nodeId, userId and userName required' });
        return;
      }

      const result = store.claimNode(
        req.params.id,
        String(nodeId),
        { id: String(userId), name: String(userName), color: userColor ? String(userColor) : undefined },
        agentType,
        notes ? String(notes) : undefined
      );

      if (!result.success) {
        const statusCode = result.code === 'CONFLICT_ALREADY_CLAIMED' ? 409 : 400;
        res.status(statusCode).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: msg });
    }
  });

  // Release declaration node
  router.post('/:id/blueprint/release', (req: Request, res: Response) => {
    try {
      const { nodeId, userId } = req.body || {};
      if (!nodeId || !userId) {
        res.status(400).json({ error: 'VALIDATION_ERROR', message: 'nodeId and userId required' });
        return;
      }

      const result = store.releaseNode(req.params.id, String(nodeId), String(userId));
      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: msg });
    }
  });

  // Verify node with Lean 4 kernel seal
  router.post('/:id/blueprint/verify', (req: Request, res: Response) => {
    try {
      const { nodeId, proofCode, userId, userName } = req.body || {};
      if (!nodeId) {
        res.status(400).json({ error: 'VALIDATION_ERROR', message: 'nodeId is required' });
        return;
      }

      const result = store.verifyNode(
        req.params.id,
        String(nodeId),
        proofCode ? String(proofCode) : undefined,
        userId && userName ? { id: String(userId), name: String(userName) } : undefined
      );

      if (!result.success) {
        const statusCode = result.code === 'HAS_SORRY' ? 422 : 400;
        res.status(statusCode).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: msg });
    }
  });

  // Get ledger
  router.get('/:id/ledger', (req: Request, res: Response) => {
    try {
      const ws = store.getWorkspace(req.params.id);
      if (!ws) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Workspace not found' });
        return;
      }
      res.status(200).json({
        ledger: ws.ledger,
        roadmap: ws.roadmap,
        budget: ws.budget,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: msg });
    }
  });

  // Append task / discussion to ledger
  router.post('/:id/ledger', (req: Request, res: Response) => {
    try {
      const { author, type, nodeId, payload } = req.body || {};
      if (!author || !type) {
        res.status(400).json({ error: 'VALIDATION_ERROR', message: 'author and type required' });
        return;
      }

      const entry = store.appendLedgerEntry(req.params.id, {
        id: `custom-${Date.now().toString(36)}`,
        timestamp: Date.now(),
        author,
        type,
        nodeId,
        payload: payload || {},
      });

      if (!entry) {
        res.status(404).json({ error: 'NOT_FOUND', message: 'Workspace not found' });
        return;
      }

      res.status(201).json({ entry });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message: msg });
    }
  });

  return router;
}
