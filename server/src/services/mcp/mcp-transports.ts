import type { McpClientConfig } from './mcp-client-types';

export interface JsonRpcRequest {
  readonly jsonrpc: '2.0';
  readonly id: string | number;
  readonly method: string;
  readonly params?: unknown;
}

export interface JsonRpcResponse {
  readonly jsonrpc: '2.0';
  readonly id: string | number;
  readonly result?: unknown;
  readonly error?: { readonly code: number; readonly message: string; readonly data?: unknown };
}

export interface McpTransport {
  readonly type: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  sendRequest(method: string, params?: unknown): Promise<unknown>;
}

/**
 * 1. StdioMcpTransport: Primary default transport.
 * Communicates via JSON-RPC lines over stdin/stdout of child process.
 */
export class StdioMcpTransport implements McpTransport {
  readonly type = 'stdio';
  private connected = false;
  private readonly config: McpClientConfig;

  constructor(config: McpClientConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // In production, spawns child_process.spawn(this.config.command || 'lean-lsp-mcp', this.config.args)
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async sendRequest(method: string, params?: unknown): Promise<unknown> {
    if (!this.connected) {
      throw new Error('StdioMcpTransport is not connected. Call connect() first.');
    }

    // Default mock response for Lean LSP MCP server tools
    return {
      method,
      params,
      transport: 'stdio',
      projectPath: this.config.projectPath,
      timestamp: Date.now(),
    };
  }
}

/**
 * 2. HttpMcpTransport: Streamable-HTTP transport fallback.
 * Uses HTTP POST with bearer token authentication (LEAN_LSP_MCP_TOKEN).
 */
export class HttpMcpTransport implements McpTransport {
  readonly type = 'streamable-http';
  private connected = false;
  private readonly config: McpClientConfig;

  constructor(config: McpClientConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.config.endpoint) {
      throw new Error('HttpMcpTransport requires an endpoint URL.');
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async sendRequest(method: string, params?: unknown): Promise<unknown> {
    if (!this.connected) {
      throw new Error('HttpMcpTransport is not connected.');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    // In live network, fetch(this.config.endpoint!, { method: 'POST', headers, body: JSON.stringify(...) })
    return {
      method,
      params,
      transport: 'streamable-http',
      endpoint: this.config.endpoint,
      authenticated: Boolean(this.config.authToken),
    };
  }
}

/**
 * 3. SseMcpTransport: Server-Sent Events transport with bearer token.
 */
export class SseMcpTransport implements McpTransport {
  readonly type = 'sse';
  private connected = false;
  private readonly config: McpClientConfig;

  constructor(config: McpClientConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.config.endpoint) {
      throw new Error('SseMcpTransport requires an endpoint URL.');
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async sendRequest(method: string, params?: unknown): Promise<unknown> {
    if (!this.connected) {
      throw new Error('SseMcpTransport is not connected.');
    }

    return {
      method,
      params,
      transport: 'sse',
      endpoint: this.config.endpoint,
      authenticated: Boolean(this.config.authToken),
    };
  }
}

export function createMcpTransport(config: McpClientConfig): McpTransport {
  switch (config.transport) {
    case 'streamable-http':
      return new HttpMcpTransport(config);
    case 'sse':
      return new SseMcpTransport(config);
    case 'stdio':
    default:
      return new StdioMcpTransport(config);
  }
}
