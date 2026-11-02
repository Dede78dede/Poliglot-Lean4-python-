/**
 * Automation API Routes (Sprint 11.0.2, Task A4)
 *
 * Implements:
 * - POST /api/v1/automation/archive (trigger auto-archive)
 * - POST /api/v1/automation/scaffold (create project from template)
 * - GET /api/v1/automation/scheduled (list scheduled workflows)
 * - POST /api/v1/automation/scheduled/:id/enable and /disable
 * - POST /api/v1/projects/:id/export-bundle (RO-Crate .polyglot bundle)
 */

import { Router, type Request, type Response } from 'express';
import { SCAFFOLD_TEMPLATES } from '../../../src/services/automation/scaffold-templates';
import { createProjectExportBundle } from '../../../src/services/automation/project-export-bundle';

export function createAutomationRouter(): Router {
  const router = Router();

  // POST /api/v1/automation/archive
  router.post('/archive', async (req: Request, res: Response): Promise<void> => {
    const { files = {} } = req.body || {};
    const bundle = await createProjectExportBundle({
      projectId: 'auto-archive-workspace',
      projectName: 'Workspace Auto-Archive',
      vfsFiles: files,
    });

    res.status(200).json({
      success: true,
      sha256: bundle.sha256,
      sizeBytes: bundle.sizeBytes,
      fileCount: bundle.fileCount,
    });
  });

  // POST /api/v1/automation/scaffold
  router.post('/scaffold', (req: Request, res: Response): void => {
    const { templateId, projectName = 'scaffolded-project' } = req.body || {};
    const template = SCAFFOLD_TEMPLATES.find((t) => t.id === templateId);

    if (!template) {
      res.status(404).json({
        type: 'https://polyglot.dev/errors/scaffold-template-not-found',
        title: 'SCAFFOLD_TEMPLATE_NOT_FOUND',
        status: 404,
        detail: `Template '${templateId}' was not found in the registry.`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      projectName,
      template: {
        id: template.id,
        name: template.name,
        category: template.category,
        files: template.files,
      },
    });
  });

  // GET /api/v1/automation/scheduled
  router.get('/scheduled', (_req: Request, res: Response) => {
    res.status(200).json({
      workflows: [
        {
          id: 'nightly-proof-check',
          name: 'Nightly Proof Verification',
          scheduleCron: '0 2 * * *',
          enabled: false,
        },
        {
          id: 'weekly-vfs-archive',
          name: 'Weekly VFS Snapshot Archive',
          scheduleCron: '0 3 * * 0',
          enabled: false,
        },
        {
          id: 'weekly-dependency-audit',
          name: 'Weekly Dependency Vulnerability & Version Audit',
          scheduleCron: '0 4 * * 1',
          enabled: false,
        },
      ],
    });
  });

  // POST /api/v1/automation/scheduled/:id/enable
  router.post('/scheduled/:id/enable', (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      workflowId: req.params.id,
      enabled: true,
    });
  });

  // POST /api/v1/automation/scheduled/:id/disable
  router.post('/scheduled/:id/disable', (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      workflowId: req.params.id,
      enabled: false,
    });
  });

  // POST /api/v1/projects/:id/export-bundle
  router.post('/projects/:id/export-bundle', async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { files = {}, name = `project-${id}`, settings, flags, auditLog, bibliography, blueprintDag } = req.body || {};

    try {
      const bundle = await createProjectExportBundle({
        projectId: id,
        projectName: name,
        vfsFiles: files,
        settings,
        flags,
        auditLog,
        bibliography,
        blueprintDag,
      });

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('X-Bundle-Sha256', bundle.sha256);
      res.setHeader('X-Bundle-Size', String(bundle.sizeBytes));
      res.setHeader('Content-Disposition', `attachment; filename="${name}.polyglot"`);
      res.status(200).send(Buffer.from(bundle.zipBytes));
    } catch (err: unknown) {
      res.status(500).json({
        type: 'https://polyglot.dev/errors/bundle-export-failed',
        title: 'BUNDLE_EXPORT_FAILED',
        status: 500,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return router;
}
