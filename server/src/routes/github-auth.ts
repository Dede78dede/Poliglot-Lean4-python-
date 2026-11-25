import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

const DeviceCodeSchema = z.object({
  clientId: z.string().trim().regex(/^[a-zA-Z0-9._-]{4,128}$/).optional(),
});

const DeviceTokenSchema = z.object({
  clientId: z.string().trim().regex(/^[a-zA-Z0-9._-]{4,128}$/).optional(),
  deviceCode: z.string().trim().min(1).max(256),
});

export function createGitHubAuthRouter(): Router {
  const router = Router();

  // POST /api/v1/auth/github/device/code
  router.post('/device/code', async (req: Request, res: Response) => {
    try {
      const parsed = DeviceCodeSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({
          error: 'INVALID_CLIENT_ID',
          message: 'clientId must be a valid alphanumeric GitHub OAuth Client ID.',
        });
        return;
      }

      const resolvedClientId = parsed.data.clientId || process.env.GITHUB_CLIENT_ID;
      if (!resolvedClientId) {
        res.status(400).json({
          error: 'MISSING_CLIENT_ID',
          message: 'GitHub OAuth Client ID is required to initiate Device Flow. Please provide a Client ID or use a Personal Access Token (PAT).',
        });
        return;
      }

      const response = await fetch('https://github.com/login/device/code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: resolvedClientId,
          scope: 'repo,contents:write',
        }),
      });

      const data = await response.json();
      if (!response.ok || (data as { error?: string }).error) {
        res.status(response.status >= 400 ? response.status : 400).json({
          error: (data as { error?: string }).error || 'DEVICE_FLOW_FAILED',
          message: (data as { error_description?: string }).error_description || 'Failed to start GitHub device flow',
        });
        return;
      }

      res.json(data);
    } catch (err: unknown) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Unknown server error',
      });
    }
  });

  // POST /api/v1/auth/github/device/token
  router.post('/device/token', async (req: Request, res: Response) => {
    try {
      const parsed = DeviceTokenSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        res.status(400).json({
          error: 'MISSING_PARAMETERS',
          message: 'Valid clientId and deviceCode are required to poll for authorization token.',
        });
        return;
      }

      const resolvedClientId = parsed.data.clientId || process.env.GITHUB_CLIENT_ID;
      if (!resolvedClientId) {
        res.status(400).json({
          error: 'MISSING_CLIENT_ID',
          message: 'GitHub OAuth Client ID is required.',
        });
        return;
      }

      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: resolvedClientId,
          device_code: parsed.data.deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      });

      const data = await response.json();
      res.json(data);
    } catch (err: unknown) {
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Unknown server error',
      });
    }
  });

  return router;
}
