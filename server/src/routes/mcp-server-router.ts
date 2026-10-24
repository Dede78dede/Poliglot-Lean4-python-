import { Router, type Request, type Response } from 'express';
import { streamableHttpServerHandler } from '../../../src/services/mcp/transports/streamable-http';
import '../../../src/services/mcp/mcp-server'; // ensure 10 tools are registered

export function createMcpServerRouter(): Router {
  const router = Router();

  const handleAll = async (req: Request, res: Response) => {
    try {
      const response = await streamableHttpServerHandler.handleRequest({
        method: req.method,
        path: req.path,
        headers: req.headers,
        body: req.body,
      });

      for (const [headerName, headerValue] of Object.entries(response.headers)) {
        res.setHeader(headerName, headerValue);
      }

      res.status(response.status).json(response.body);
    } catch (err: unknown) {
      res.status(500).json({
        error: 'Internal server error processing MCP request',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // Mount handlers for POST, GET, DELETE, and all other methods on /mcp
  router.post('/', handleAll);
  router.get('/', handleAll);
  router.delete('/', handleAll);
  router.all('*', handleAll);

  return router;
}
