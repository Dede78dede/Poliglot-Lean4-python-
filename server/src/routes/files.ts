import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { archiveService } from '../../../src/services/files/archive-service';
import { trashService } from '../../../src/services/files/trash-service';
import { previewService } from '../../../src/services/files/preview-service';
import { BridgeError } from '../../../src/services/errors/bridge-error';

const ArchiveRequestSchema = z.object({
  files: z.array(
    z.object({
      path: z.string().min(1),
      content: z.string(),
    })
  ).min(1),
});

const ArchivePayloadSchema = z.object({
  archiveBase64: z.string().min(1),
});

export function createFilesRouter(): Router {
  const router = Router();

  // GET /api/v1/files/tree - List active VFS tree & status
  router.get('/tree', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      trashCount: trashService.listTrash().length,
    });
  });

  // POST /api/v1/files/archive - Create ZIP archive
  router.post('/archive', (req: Request, res: Response): void => {
    const parse = ArchiveRequestSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        type: 'https://polyglot.dev/errors/invalid-request',
        title: 'Validation Failed',
        status: 400,
        detail: parse.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
      });
      return;
    }

    try {
      const bytes = archiveService.createArchive(parse.data.files);
      const base64 = Buffer.from(bytes).toString('base64');
      res.status(200).json({
        archiveBase64: base64,
        sizeBytes: bytes.byteLength,
        fileCount: parse.data.files.length,
      });
    } catch (err: unknown) {
      if (err instanceof BridgeError && err.httpStatus) {
        res.status((err as any).httpStatus).json((err as any).toProblemDetails());
        return;
      }
      res.status(500).json({
        type: 'https://polyglot.dev/errors/archive-operation-failed',
        title: 'Archive Operation Failed',
        status: 500,
        detail: err instanceof Error ? err.message : 'Unknown archive error',
      });
    }
  });

  // POST /api/v1/files/preview - Preview ZIP archive
  router.post('/preview', (req: Request, res: Response): void => {
    const parse = ArchivePayloadSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        type: 'https://polyglot.dev/errors/invalid-request',
        title: 'Validation Failed',
        status: 400,
        detail: 'archiveBase64 string required',
      });
      return;
    }

    try {
      const bytes = new Uint8Array(Buffer.from(parse.data.archiveBase64, 'base64'));
      const preview = previewService.previewArchiveBytes(bytes);
      res.status(200).json(preview);
    } catch (err: unknown) {
      res.status(400).json({
        type: 'https://polyglot.dev/errors/archive-operation-failed',
        title: 'Archive Preview Failed',
        status: 400,
        detail: err instanceof Error ? err.message : 'Invalid archive data',
      });
    }
  });

  // POST /api/v1/files/extract - Extract ZIP archive
  router.post('/extract', (req: Request, res: Response): void => {
    const parse = ArchivePayloadSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({
        type: 'https://polyglot.dev/errors/invalid-request',
        title: 'Validation Failed',
        status: 400,
        detail: 'archiveBase64 string required',
      });
      return;
    }

    try {
      const bytes = new Uint8Array(Buffer.from(parse.data.archiveBase64, 'base64'));
      const result = archiveService.extractArchive(bytes);
      res.status(200).json(result);
    } catch (err: unknown) {
      if (err instanceof BridgeError && err.httpStatus) {
        res.status((err as any).httpStatus).json((err as any).toProblemDetails());
        return;
      }
      res.status(500).json({
        type: 'https://polyglot.dev/errors/archive-operation-failed',
        title: 'Archive Extraction Failed',
        status: 500,
        detail: err instanceof Error ? err.message : 'Failed to extract archive',
      });
    }
  });

  // DELETE /api/v1/files/trash - Empty entire trash
  router.delete('/trash', (_req: Request, res: Response) => {
    const result = trashService.emptyTrash();
    res.status(200).json({
      status: 'emptied',
      deletedCount: result.deletedCount,
    });
  });

  // GET /api/v1/files/trash - List all trash items
  router.get('/trash', (_req: Request, res: Response) => {
    const items = trashService.listTrash();
    res.status(200).json({ items });
  });

  // POST /api/v1/files/:path(*)/restore - Restore a trashed file
  router.post('/:path(*)/restore', (req: Request, res: Response): void => {
    const targetPath = req.params['path'] ?? '';
    try {
      const restored = trashService.restoreFromTrash(targetPath);
      res.status(200).json({
        restored: true,
        originalPath: restored.originalPath,
        content: restored.content,
      });
    } catch (err: unknown) {
      if (err instanceof BridgeError && err.httpStatus) {
        res.status((err as any).httpStatus).json((err as any).toProblemDetails());
        return;
      }
      res.status(404).json({
        type: 'https://polyglot.dev/errors/trash-operation-failed',
        title: 'Restore Failed',
        status: 404,
        detail: err instanceof Error ? err.message : 'File not found in trash',
      });
    }
  });

  // DELETE /api/v1/files/:path(*) - Soft delete file to trash
  router.delete('/:path(*)', (req: Request, res: Response): void => {
    const targetPath = req.params['path'] ?? '';
    const content = typeof req.body?.content === 'string' ? req.body.content : '';

    try {
      const item = trashService.moveToTrash(targetPath, content);
      res.status(200).json({
        trashed: true,
        item,
      });
    } catch (err: unknown) {
      if (err instanceof BridgeError && err.httpStatus) {
        res.status((err as any).httpStatus).json((err as any).toProblemDetails());
        return;
      }
      res.status(500).json({
        type: 'https://polyglot.dev/errors/trash-operation-failed',
        title: 'Move to Trash Failed',
        status: 500,
        detail: err instanceof Error ? err.message : 'Could not move file to trash',
      });
    }
  });

  return router;
}
