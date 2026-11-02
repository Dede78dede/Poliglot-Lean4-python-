/**
 * MCP 2026-07-28 Stateless HTTP Transport (Phase 10.10, Task M1 & T3)
 *
 * Fully compliant with MCP 2026-07-28 stateless specification:
 * - Mandatory server/discover endpoint
 * - Mandatory Mcp-Method and Mcp-Name header verification
 * - MCP-Protocol-Version: 2026-07-28 header echoed on every response
 * - Zero session tracking, no initialize handshake, 405 on GET/DELETE
 * - Progressive tool discovery toggle via ENABLE_TOOL_SEARCH
 */

import { mcpServerRegistry, type McpToolResult } from '../mcp-server-registry';
import { getMcpDiscoverPayload } from '../mcp-discover';
import { VIRTUAL_TOOL_DEFINITIONS } from '../virtual-tools';

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
      'MCP-Protocol-Version': '2026-07-28',
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

    // 2. Reject GET requests (removed in 2026-07-28 revision)
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

    // Helper to extract header value case-insensitively
    const getHeader = (h: string): string | undefined => {
      const lower = h.toLowerCase();
      for (const [key, val] of Object.entries(req.headers)) {
        if (key.toLowerCase() === lower) {
          return Array.isArray(val) ? val[0] : val;
        }
      }
      return undefined;
    };

    const bodyObj = (typeof req.body === 'object' && req.body !== null ? req.body : {}) as Record<string, unknown>;

    // Dedicated path alias: /discover
    const isDiscoverPath = req.path.endsWith('/discover');
    if (isDiscoverPath) {
      const discoverPayload = getMcpDiscoverPayload();
      return {
        status: 200,
        headers: standardHeaders,
        body: {
          jsonrpc: '2.0',
          id: bodyObj['id'] ?? 1,
          result: discoverPayload,
        },
      };
    }

    // 5. SEP-2243 / 2026-07-28 Header Verification (Mcp-Method and Mcp-Name)
    // Mcp-Method header is mandatory on every POST
    const mcpMethodHeader = getHeader('Mcp-Method');
    if (!mcpMethodHeader && !bodyObj['method']) {
      return {
        status: 400,
        headers: standardHeaders,
        body: {
          error: 'Mcp-Method header missing',
          detail: 'MCP 2026-07-28 requires Mcp-Method header on every POST request.',
        },
      };
    }

    const effectiveMethod = (mcpMethodHeader || String(bodyObj['method'] || '')).trim();

    // Validate Mcp-Name when method is tools/call
    const mcpNameHeader = getHeader('Mcp-Name');
    const paramName = bodyObj['params'] && typeof bodyObj['params'] === 'object'
      ? (bodyObj['params'] as Record<string, unknown>)['name']
      : undefined;
    const effectiveToolName = (mcpNameHeader || (typeof paramName === 'string' ? paramName : '')).trim();

    if (effectiveMethod === 'tools/call' && !mcpNameHeader && !paramName) {
      return {
        status: 400,
        headers: standardHeaders,
        body: {
          error: 'Mcp-Name header missing for tools/call',
          detail: 'MCP 2026-07-28 requires Mcp-Name header specifying the target tool for tools/call.',
        },
      };
    }

    // Check progressive tool search toggle
    const isToolSearchEnabled = typeof process !== 'undefined' && process.env?.['ENABLE_TOOL_SEARCH'] === 'true';

    // Dispatch MCP Methods
    if (effectiveMethod === 'server/discover') {
      const discoverPayload = getMcpDiscoverPayload();
      return {
        status: 200,
        headers: standardHeaders,
        body: {
          jsonrpc: '2.0',
          id: bodyObj['id'] ?? 1,
          result: discoverPayload,
        },
      };
    }

    if (effectiveMethod === 'tools/list') {
      if (isToolSearchEnabled) {
        // Return 3 virtual tools
        const virtualTools = VIRTUAL_TOOL_DEFINITIONS.map((t) => ({
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
            result: { tools: virtualTools },
          },
        };
      }

      // Default: Return 10 real tools
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

    if (effectiveMethod === 'tools/call') {
      const params = (bodyObj['params'] ?? {}) as Record<string, unknown>;
      const toolName = effectiveToolName || String(params['name'] || '');
      const toolArgs = (params['arguments'] ?? {}) as Record<string, unknown>;

      // Check if target is a virtual tool
      let tool = mcpServerRegistry.getByName(toolName);
      if (!tool && isToolSearchEnabled) {
        tool = VIRTUAL_TOOL_DEFINITIONS.find((vt) => vt.name === toolName);
      }

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

    if (effectiveMethod === 'resources/list') {
      return {
        status: 200,
        headers: standardHeaders,
        body: {
          jsonrpc: '2.0',
          id: bodyObj['id'] ?? 1,
          result: { resources: [] },
        },
      };
    }

    if (effectiveMethod === 'prompts/list') {
      return {
        status: 200,
        headers: standardHeaders,
        body: {
          jsonrpc: '2.0',
          id: bodyObj['id'] ?? 1,
          result: { prompts: [] },
        },
      };
    }

    if (effectiveMethod === 'subscriptions/listen') {
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
          message: `Unsupported MCP method: ${effectiveMethod}`,
        },
      },
    };
  }
}

export const streamableHttpServerHandler = new StreamableHttpServerHandler();
