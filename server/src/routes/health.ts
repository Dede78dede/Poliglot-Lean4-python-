import type { Request, Response } from 'express';
import type { KiminaClientProxy } from '../services/kimina-client-proxy';

export function createHealthRouter(proxy: KiminaClientProxy) {
  return async (_req: Request, res: Response): Promise<void> => {
    const config = proxy.getConfig();
    let kiminaConnected = false;

    if (config.mode === 'real' || config.mode === 'auto') {
      try {
        const pingCtrl = new AbortController();
        const timeout = setTimeout(() => pingCtrl.abort(), 1500);
        const upstream = await fetch(`${config.baseUrl}/health`, { signal: pingCtrl.signal }).catch(() => null);
        clearTimeout(timeout);
        kiminaConnected = Boolean(upstream?.ok);
      } catch {
        kiminaConnected = false;
      }
    }

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      kiminaMode: config.mode,
      kiminaConnected,
      version: '1.0.0',
    });
  };
}
