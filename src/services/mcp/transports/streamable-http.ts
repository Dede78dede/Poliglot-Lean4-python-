import { mcpServerRegistry, type McpToolResult } from '../mcp-server-registry';

export interface StreamableHttpRequest {
  readonly method: string; // HTTP method: POST, GET, DELETE, etc.
  readonly path: string;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly body: unknown;
}

export interface StreamableHttpResponse {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: unknown;
}

export interface StreamableHttpRateLimiterStatus {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetMs: number;
}

export class StreamableHttpRateLimiter {
  private tokens: number = 100;
  private lastRefill: number = Date.now();
  private readonly capacity: number = 100;
  private readonly refillIntervalMs: number = 60_000; // 100 requests per 1 minute

  public checkLimit(): StreamableHttpRateLimiterStatus {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.refillIntervalMs) {
      this.tokens = this.capacity;
      this.lastRefill = now;
    }

    if (this.tokens > 0) {
      this.tokens--;
      return {
        allowed: true,
        remaining: this.tokens,
        resetMs: Math.max(0, this.refillIntervalMs - (now - this.lastRefill)),
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(0, this.refillIntervalMs - (now - this.lastRefill)),
    };
  }

  public reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }
}

export class StreamableHttpServerHandler {
  private readonly rateLimiter = new StreamableHttpRateLimiter();
  private readonly requiredToken: string | undefined;

  constructor(serverToken?: string) {
    this.requiredToken =
      serverToken ?? (typeof process !== 'undefined' ? process.env?.['POLYGLOT_MCP_SERVER_TOKEN'] : undefined);
  }

  public async handleRequest(req: StreamableHttpRequest): Promise<StreamableHttpResponse> {
    const standardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Mcp-Spec-Version': '2026-07-28',
    };

    // 1. DELETE returns 405 Method Not Allowed (stateless server per 2026-07-28 revision)
    if (req.method === 'DELETE') {
      return {
        status: 405,
        headers: { ...standardHeaders, Allow: 'POST' },
        body: { error: 'Method Not Allowed: Stateless MCP server does not support session deletion.' },
      };
    }

    // 2. Reject GET requests for stream endpoint (removed in 2026-07-28 revision)
    if (req.method === 'GET') {
      return {
        status: 405,
        headers: { ...standardHeaders, Allow: 'POST' },
        body: { error: 'Method Not Allowed: GET stream endpoint was removed in MCP 2026-07-28. Use POST for all interactions.' },
      };
    }

    if (req.method !== 'POST') {
      return {
        status: 405,
        headers: { ...standardHeaders, Allow: 'POST' },
        body: { error: `Method Not Allowed: ${req.method}` },
      };
    }

    // 3. Rate limiting check (100 req/min)
    const rateCheck = this.rateLimiter.checkLimit();
    standardHeaders['X-RateLimit-Limit'] = '100';
    standardHeaders['X-RateLimit-Remaining'] = String(rateCheck.remaining);
    standardHeaders['X-RateLimit-Reset'] = String(Math.ceil(rateCheck.resetMs / 1000));

    if (!rateCheck.allowed) {
      return {
        status: 429,
        headers: { ...standardHeaders, 'Retry-After': String(Math.ceil(rateCheck.resetMs / 1000)) },
        body: {
          error: 'Rate limit exceeded: Max 100 requests per minute allowed on /mcp endpoint.',
          retryAfterMs: rateCheck.resetMs,
        },
      };
    }

    // 4. Authentication: Bearer token check
    // Optional in development unless POLYGLOT_MCP_SERVER_TOKEN is explicitly set, mandatory in production
    const isProd = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
    if (this.requiredToken || isProd) {
      const authHeader = req.headers['authorization'] || req.headers['Authorization'];
      const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : undefined;

      if (!token || (this.requiredToken && token !== this.requiredToken)) {
        return {
          status: 401,
          headers: standardHeaders,
          body: { error: 'Unauthorized: Valid Bearer token required for MCP server.' },
        };
      }
    }

    // 5. SEP-2243 Header Verification (Mcp-Method and Mcp-Name)
    const getHeader = (h: string): string | undefined => {
      const val = req.headers[h.toLowerCase()] ?? req.headers[h];
      return Array.isArray(val) ? val[0] : val;
    };

    const mcpMethod = getHeader('Mcp-Method') || (req.body as Record<string, unknown>)?.['method'];
    const mcpToolName = getHeader('Mcp-Name') || (req.body as Record<string, unknown>)?.['params'] && ((req.body as Record<string, unknown>)['params'] as Record<string, unknown>)?.['name'];

    const bodyObj = (req.body ?? {}) as Record<string, unknown>;
    const jsonRpcMethod = String(mcpMethod || bodyObj['method'] || '');

    // Dispatch JSON-RPC / MCP Methods
    if (jsonRpcMethod === 'tools/list') {
      const tools = mcpServerRegistry.list().map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        permission: t.permission,
      }));

      return {
        status: 200,
        headers: standardHeaders,
        body: {
          jsonrpc: '2.0',
          id: bodyObj['id'] ?? 1,
          result: { tools },
        },
      };
    }

    if (jsonRpcMethod === 'tools/call') {
      const params = (bodyObj['params'] ?? {}) as Record<string, unknown>;
      const toolName = String(mcpToolName || params['name'] || '');
      const toolArgs = (params['arguments'] ?? {}) as Record<string, unknown>;

      const tool = mcpServerRegistry.getByName(toolName);
      if (!tool) {
        return {
          status: 404,
          headers: standardHeaders,
          body: {
            jsonrpc: '2.0',
            id: bodyObj['id'] ?? 1,
            error: {
              code: -32601,
              message: `Tool not found: ${toolName}`,
            },
          },
        };
      }

      const result: McpToolResult = await tool.handler(toolArgs);

      return {
        status: 200,
        headers: standardHeaders,
        body: {
          jsonrpc: '2.0',
          id: bodyObj['id'] ?? 1,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.data ?? result),
              },
            ],
            isError: !result.success,
            truncated: result.truncated ?? false,
            proposalToken: result.proposalToken,
            requiresConfirmation: result.requiresConfirmation,
          },
        },
      };
    }

    if (jsonRpcMethod === 'subscriptions/listen') {
      // Long-lived event streaming for notifications per 2026-07-28 spec
      return {
        status: 200,
        headers: {
          ...standardHeaders,
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
        },
        body: {
          event: 'connected',
          timestamp: Date.now(),
          subscription: 'active',
        },
      };
    }

    return {
      status: 400,
      headers: standardHeaders,
      body: {
        jsonrpc: '2.0',
        id: bodyObj['id'] ?? 1,
        error: {
          code: -32600,
          message: `Unsupported MCP method: ${jsonRpcMethod}`,
        },
      },
    };
  }
}

export const streamableHttpServerHandler = new StreamableHttpServerHandler();
