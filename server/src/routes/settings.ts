/**
 * Settings API Routes (Sprint 11.0.2 + Persistent Disk & RBAC Guard)
 *
 * Implements:
 * - GET /api/v1/settings
 * - PUT /api/v1/settings (Zod-validated, Admin RBAC)
 * - POST /api/v1/settings/export (Masked secrets)
 * - POST /api/v1/settings/import (Zod-validated, Admin RBAC)
 */

import fs from 'node:fs';
import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import { PolyglotSettingsSchema } from '../../../src/services/settings/settings-schema';
import { DEFAULT_SETTINGS } from '../../../src/services/settings/settings-store';
import type { PolyglotSettings } from '../../../src/services/settings/settings-types';
import { featureFlagRegistry } from '../../../src/services/flags/feature-flag-registry';
import { APP_ROLES } from '../../../src/services/auth/roles';
import { requireRole, type AuthenticatedRequest } from '../../../src/middleware/auth';

const SETTINGS_STORAGE_PATH = path.resolve('data/settings.json');

function sanitizeSettingsForResponse(settings: PolyglotSettings): PolyglotSettings {
  const providers = { ...settings.providers };
  for (const [id, prov] of Object.entries(providers)) {
    if (prov?.apiKey) {
      providers[id] = { ...prov, apiKey: '••••••••' };
    }
  }
  return {
    ...settings,
    providers,
    mcp: {
      ...settings.mcp,
      bearerToken: settings.mcp.bearerToken ? '••••••••' : '',
    },
  };
}

function loadSettingsFromDisk(storagePath = SETTINGS_STORAGE_PATH): PolyglotSettings {
  const fallback: PolyglotSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  try {
    if (!fs.existsSync(storagePath)) {
      return fallback;
    }
    const raw = fs.readFileSync(storagePath, 'utf-8');
    const parsed = PolyglotSettingsSchema.safeParse(JSON.parse(raw));
    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // Ignore parse error and fall back to defaults
  }
  return fallback;
}

function saveSettingsToDisk(settings: PolyglotSettings, storagePath = SETTINGS_STORAGE_PATH): void {
  try {
    const dir = path.dirname(storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(storagePath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch {
    // Best-effort in read-only test contexts
  }
}

function syncFlagsToRegistry(flags: Readonly<Record<string, boolean>>): void {
  for (const [k, v] of Object.entries(flags)) {
    try {
      featureFlagRegistry.set(k as Parameters<typeof featureFlagRegistry.set>[0], Boolean(v));
    } catch {
      // Ignore unknown flags gracefully
    }
  }
}

export function createSettingsRouter(storagePath = SETTINGS_STORAGE_PATH): Router {
  const router = Router();
  let currentSettings: PolyglotSettings = loadSettingsFromDisk(storagePath);

  // GET /api/v1/settings
  router.get('/', (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const sanitized = sanitizeSettingsForResponse(currentSettings);
    res.status(200).json({
      settings: sanitized,
      editable: authReq.userRole === APP_ROLES.ADMIN,
    });
  });

  // PUT /api/v1/settings
  router.put('/', requireRole(APP_ROLES.ADMIN), (req: Request, res: Response): void => {
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

    currentSettings = sanitizeSettingsForResponse(parseRes.data);
    syncFlagsToRegistry(currentSettings.flags);
    saveSettingsToDisk(currentSettings, storagePath);
    res.status(200).json({ success: true, settings: currentSettings });
  });

  // POST /api/v1/settings/export
  router.post('/export', (_req: Request, res: Response) => {
    const sanitized = sanitizeSettingsForResponse(currentSettings);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="polyglot-settings.json"');
    res.status(200).send(JSON.stringify(sanitized, null, 2));
  });

  // POST /api/v1/settings/import
  router.post('/import', requireRole(APP_ROLES.ADMIN), (req: Request, res: Response): void => {
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

    currentSettings = sanitizeSettingsForResponse(parseRes.data);
    syncFlagsToRegistry(currentSettings.flags);
    saveSettingsToDisk(currentSettings, storagePath);
    res.status(200).json({ success: true, settings: currentSettings });
  });

  return router;
}
