import { Router, type Request, type Response } from 'express';

export function createGitHubAuthRouter(): Router {
  const router = Router();

  // POST /api/v1/auth/github/device/code
  router.post('/device/code', async (req: Request, res: Response) => {
    try {
      const { clientId } = req.body as { clientId?: string };
      const resolvedClientId = clientId?.trim() || process.env.GITHUB_CLIENT_ID;

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
      console.error('[GitHub Device Code Error]', err);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Unknown server error',
      });
    }
  });

  // POST /api/v1/auth/github/device/token
  router.post('/device/token', async (req: Request, res: Response) => {
    try {
      const { clientId, deviceCode } = req.body as { clientId?: string; deviceCode?: string };
      const resolvedClientId = clientId?.trim() || process.env.GITHUB_CLIENT_ID;

      if (!resolvedClientId || !deviceCode) {
        res.status(400).json({
          error: 'MISSING_PARAMETERS',
          message: 'Both clientId and deviceCode are required to poll for authorization token.',
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
          device_code: deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      });

      const data = await response.json();
      res.json(data);
    } catch (err: unknown) {
      console.error('[GitHub Device Token Error]', err);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Unknown server error',
      });
    }
  });

  return router;
}
