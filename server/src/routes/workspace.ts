/**
 * Workspace Archive & Backup/Restore Router (Sprint 11.2.1, Task WA2)
 *
 * Implements endpoints:
 * - POST /api/v1/workspace/export
 * - POST /api/v1/workspace/inspect
 * - POST /api/v1/workspace/restore
 * Strictly adheres to Manifesto: no any, no enum, RFC 9457 errors.
 */

import { Router, Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { workspaceArchiveService } from '../../../src/services/workspace/workspace-archive-service';
import { featureFlagRegistry } from '../../../src/services/flags/feature-flag-registry';
import { BridgeError } from '../../../src/services/errors/bridge-error';

const ARCHIVE_BASE_DIR = path.resolve('/tmp/polyglot-archives');

function resolveContainedArchivePath(rawPath: string, correlationId: string): string {
  const resolved = path.resolve(rawPath);
  if (resolved !== ARCHIVE_BASE_DIR && !resolved.startsWith(ARCHIVE_BASE_DIR + path.sep)) {
    throw new BridgeError('SANDBOX_POLICY_VIOLATION', correlationId, {
      detail: 'Archive path must reside strictly inside /tmp/polyglot-archives.',
    });
  }
  return resolved;
}

export function createWorkspaceArchiveRouter(): Router {
  const router = Router();

  // POST /api/v1/workspace/export
  router.post('/export', async (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || `ws-export-${Date.now()}`;
    try {
      if (!featureFlagRegistry.isEnabled('ENABLE_WORKSPACE_ARCHIVE')) {
        res.status(404).json({
          error: 'FEATURE_DISABLED',
          message: 'Workspace archive export is disabled by feature flag ENABLE_WORKSPACE_ARCHIVE=false',
        });
        return;
      }

      const { workspaceId, includeCollaboration, files } = req.body || {};
      if (!workspaceId || typeof workspaceId !== 'string') {
        res.status(400).json({ error: 'VALIDATION_FAILED', message: 'workspaceId string is required' });
        return;
      }

      const safeWorkspaceId = workspaceId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'workspace';

      // Collect files: from body or from default template
      let vfsFiles: Record<string, string | Uint8Array> = {};
      if (files && typeof files === 'object' && !Array.isArray(files)) {
        vfsFiles = files as Record<string, string | Uint8Array>;
      } else {
        vfsFiles = {
          'Main.lean': 'def hello : String := "world"',
          'lakefile.lean': 'import Lake\nopen Lake DSL\npackage test',
          'lean-toolchain': 'leanprover/lean4:v4.34.0-rc1',
          'README.md': `# Workspace ${safeWorkspaceId}\nExported by Polyglot Code Studio`,
        };
      }

      const result = workspaceArchiveService.exportWorkspace(
        { workspaceId: safeWorkspaceId, includeCollaboration: Boolean(includeCollaboration) },
        vfsFiles,
        {},
        correlationId
      );

      // Save archive inside sandboxed tmp directory
      if (!fs.existsSync(ARCHIVE_BASE_DIR)) {
        fs.mkdirSync(ARCHIVE_BASE_DIR, { recursive: true });
      }
      const archiveFile = resolveContainedArchivePath(
        path.join(ARCHIVE_BASE_DIR, `${safeWorkspaceId}-${result.sha256.slice(0, 8)}.polyglot`),
        correlationId
      );
      fs.writeFileSync(archiveFile, result.archiveData);

      res.status(200).json({
        archivePath: archiveFile,
        sizeBytes: result.sizeBytes,
        sha256: result.sha256,
        fileCount: result.fileCount,
        manifest: result.manifest,
      });
    } catch (err: unknown) {
      if (err instanceof BridgeError) {
        res.status(err.httpStatus).json(err.toProblemDetails());
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
  });

  // POST /api/v1/workspace/inspect
  router.post('/inspect', async (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || `ws-inspect-${Date.now()}`;
    try {
      if (!featureFlagRegistry.isEnabled('ENABLE_WORKSPACE_ARCHIVE')) {
        res.status(404).json({
          error: 'FEATURE_DISABLED',
          message: 'Workspace archive inspection is disabled by feature flag ENABLE_WORKSPACE_ARCHIVE=false',
        });
        return;
      }

      const { archivePath, archiveBase64 } = req.body || {};
      let archiveData: Uint8Array;

      if (archiveBase64 && typeof archiveBase64 === 'string') {
        archiveData = Buffer.from(archiveBase64, 'base64');
      } else if (archivePath && typeof archivePath === 'string') {
        const safePath = resolveContainedArchivePath(archivePath, correlationId);
        if (!fs.existsSync(safePath)) {
          res.status(404).json({ error: 'FILE_NOT_FOUND', message: 'Archive file not found' });
          return;
        }
        archiveData = fs.readFileSync(safePath);
      } else {
        res.status(400).json({ error: 'VALIDATION_FAILED', message: 'archivePath or archiveBase64 is required' });
        return;
      }

      const result = workspaceArchiveService.inspectArchive(archiveData, correlationId);
      if (!result.valid) {
        if (result.errors.some((e) => e.includes('newer than supported'))) {
          const err = new BridgeError('WORKSPACE_ARCHIVE_SCHEMA_TOO_NEW', correlationId, { errors: result.errors });
          res.status(err.httpStatus).json(err.toProblemDetails());
          return;
        }
        if (result.errors.some((e) => e.includes('Checksum mismatch'))) {
          const err = new BridgeError('WORKSPACE_ARCHIVE_CHECKSUM_MISMATCH', correlationId, { errors: result.errors });
          res.status(err.httpStatus).json(err.toProblemDetails());
          return;
        }
        const err = new BridgeError('WORKSPACE_ARCHIVE_INVALID', correlationId, { errors: result.errors });
        res.status(err.httpStatus).json(err.toProblemDetails());
        return;
      }

      res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof BridgeError) {
        res.status(err.httpStatus).json(err.toProblemDetails());
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
  });

  // POST /api/v1/workspace/restore
  router.post('/restore', async (req: Request, res: Response) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || `ws-restore-${Date.now()}`;
    try {
      if (!featureFlagRegistry.isEnabled('ENABLE_WORKSPACE_ARCHIVE')) {
        res.status(404).json({
          error: 'FEATURE_DISABLED',
          message: 'Workspace archive restore is disabled by feature flag ENABLE_WORKSPACE_ARCHIVE=false',
        });
        return;
      }

      const { archivePath, archiveBase64, dryRun, conflictPolicy, targetWorkspaceId } = req.body || {};
      let archiveData: Uint8Array;
      let resolvedPath = 'memory';

      if (archiveBase64 && typeof archiveBase64 === 'string') {
        archiveData = Buffer.from(archiveBase64, 'base64');
      } else if (archivePath && typeof archivePath === 'string') {
        const safePath = resolveContainedArchivePath(archivePath, correlationId);
        if (!fs.existsSync(safePath)) {
          res.status(404).json({ error: 'FILE_NOT_FOUND', message: 'Archive file not found' });
          return;
        }
        resolvedPath = safePath;
        archiveData = fs.readFileSync(safePath);
      } else {
        res.status(400).json({ error: 'VALIDATION_FAILED', message: 'archivePath or archiveBase64 is required' });
        return;
      }

      const safeTargetId =
        typeof targetWorkspaceId === 'string' && targetWorkspaceId.trim()
          ? targetWorkspaceId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64)
          : undefined;

      const result = workspaceArchiveService.restoreWorkspace(
        {
          archivePath: resolvedPath,
          targetWorkspaceId: safeTargetId,
          dryRun: dryRun !== false, // defaults to true!
          conflictPolicy: conflictPolicy === 'overwrite' || conflictPolicy === 'skip' ? conflictPolicy : 'fail',
        },
        archiveData,
        '/tmp/polyglot-workspaces',
        correlationId
      );

      res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof BridgeError) {
        res.status(err.httpStatus).json(err.toProblemDetails());
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: 'INTERNAL_ERROR', message });
    }
  });

  return router;
}
