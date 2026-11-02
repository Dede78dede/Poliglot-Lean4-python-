/**
 * Settings API Routes (Sprint 11.0.2, Task ST4)
 *
 * Implements:
 * - GET /api/v1/settings
 * - PUT /api/v1/settings (Zod-validated)
 * - POST /api/v1/settings/export
 * - POST /api/v1/settings/import (Zod-validated)
 */

import { Router, type Request, type Response } from 'express';
import { PolyglotSettingsSchema } from '../../../src/services/settings/settings-schema';
import { DEFAULT_SETTINGS } from '../../../src/services/settings/settings-store';
import type { PolyglotSettings } from '../../../src/services/settings/settings-types';

let currentSettings: PolyglotSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

export function createSettingsRouter(): Router {
  const router = Router();

  // GET /api/v1/settings
  router.get('/', (_req: Request, res: Response) => {
    res.status(200).json({ settings: currentSettings });
  });

  // PUT /api/v1/settings
  router.put('/', (req: Request, res: Response): void => {
    const parseRes = PolyglotSettingsSchema.safeParse(req.body);
    if (!parseRes.success) {
      res.status(400).json({
        type: 'https://polyglot.dev/errors/settings-validation-failed',
        title: 'SETTINGS_VALIDATION_FAILED',
        status: 400,
        detail: 'Invalid settings schema or unknown keys present.',
        errors: parseRes.error.flatten(),
      });
      return;
    }

    currentSettings = parseRes.data;
    res.status(200).json({ success: true, settings: currentSettings });
  });

  // POST /api/v1/settings/export
  router.post('/export', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="polyglot-settings.json"');
    res.status(200).send(JSON.stringify(currentSettings, null, 2));
  });

  // POST /api/v1/settings/import
  router.post('/import', (req: Request, res: Response): void => {
    const parseRes = PolyglotSettingsSchema.safeParse(req.body);
    if (!parseRes.success) {
      res.status(400).json({
        type: 'https://polyglot.dev/errors/settings-validation-failed',
        title: 'SETTINGS_VALIDATION_FAILED',
        status: 400,
        detail: 'Failed to import settings: strict validation failed.',
        errors: parseRes.error.flatten(),
      });
      return;
    }

    currentSettings = parseRes.data;
    res.status(200).json({ success: true, settings: currentSettings });
  });

  return router;
}
