import {
  LEAN_LSP_MCP_TOOLS,
  type McpClientConfig,
  type McpToolCallRequest,
  type McpToolCallResult,
  type McpToolCategory,
  type McpToolDeclaration,
} from '../../../server/src/services/mcp/mcp-client-types';
import { createMcpTransport, type McpTransport } from '../../../server/src/services/mcp/mcp-transports';
import { mcpExternalSearchRateLimiter } from '../../../server/src/services/mcp/mcp-rate-limiter';
import { validateProofSearchQuery } from '../proof/proof-search-validator';
import { semanticSearchRegistry } from '../search/semantic-search-provider';
import type { ProofOutcome } from '../../types/proof-outcome';

export interface McpClientInterface {
  readonly id: string;
  readonly name: string;
  readonly transport: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  listTools(): readonly McpToolDeclaration[];
  getTool(name: string): McpToolDeclaration | undefined;
  callTool(request: McpToolCallRequest): Promise<McpToolCallResult>;
  subscribe(listener: () => void): () => void;
  getSnapshot(): { readonly isConnected: boolean; readonly transport: string; readonly toolsCount: number };
}

export class LeanLspClient implements McpClientInterface {
  public readonly id = 'lean-lsp-mcp';
  public readonly name = 'Lean 4 LSP MCP Client';
  private readonly config: McpClientConfig;
  private readonly transportInstance: McpTransport;
  private readonly toolMap = new Map<string, McpToolDeclaration>();
  private readonly hoverCache = new Map<string, unknown>();
  private readonly listeners = new Set<() => void>();

  constructor(config: McpClientConfig) {
    this.config = config;
    this.transportInstance = createMcpTransport(config);

    // Dynamic tool enumeration
    for (const tool of LEAN_LSP_MCP_TOOLS) {
      this.toolMap.set(tool.name, tool);
    }
  }

  public get transport(): string {
    return this.transportInstance.type;
  }

  private cachedSnapshot: { readonly isConnected: boolean; readonly transport: string; readonly toolsCount: number } | null = null;

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    this.cachedSnapshot = null;
    for (const listener of this.listeners) {
      listener();
    }
  }

  public getSnapshot = (): { readonly isConnected: boolean; readonly transport: string; readonly toolsCount: number } => {
    if (this.cachedSnapshot) {
      return this.cachedSnapshot;
    }
    this.cachedSnapshot = Object.freeze({
      isConnected: this.isConnected(),
      transport: this.transport,
      toolsCount: this.toolMap.size,
    });
    return this.cachedSnapshot;
  };

  public async connect(): Promise<void> {
    await this.transportInstance.connect();
    this.notify();
  }

  public async disconnect(): Promise<void> {
    await this.transportInstance.disconnect();
    this.hoverCache.clear();
    this.notify();
  }

  public isConnected(): boolean {
    return this.transportInstance.isConnected();
  }

  public listTools(): readonly McpToolDeclaration[] {
    return Array.from(this.toolMap.values());
  }

  public getTool(name: string): McpToolDeclaration | undefined {
    return this.toolMap.get(name);
  }

  public getToolsByCategory(category: McpToolCategory): readonly McpToolDeclaration[] {
    return this.listTools().filter((t) => t.category === category);
  }

  public async callTool(request: McpToolCallRequest): Promise<McpToolCallResult> {
    const startTime = Date.now();
    const tool = this.toolMap.get(request.toolName);

    if (!tool) {
      return {
        success: false,
        toolName: request.toolName,
        error: `Unknown MCP tool: ${request.toolName}`,
        durationMs: Date.now() - startTime,
      };
    }

    // Cache check for lean_hover_info (cached by file + line + col)
    if (request.toolName === 'lean_hover_info') {
      const cacheKey = JSON.stringify(request.arguments);
      if (this.hoverCache.has(cacheKey)) {
        return {
          success: true,
          toolName: request.toolName,
          data: this.hoverCache.get(cacheKey),
          durationMs: Date.now() - startTime,
        };
      }
    }

    // Rate-limiting check on external search tools (3 req/30s)
    if (tool.isExternalSearch) {
      const limitResult = mcpExternalSearchRateLimiter.checkLimit();
      if (!limitResult.allowed) {
        return {
          success: false,
          toolName: request.toolName,
          rateLimited: true,
          error: `RATE_LIMITED: External search exceeded limit (3 req / 30s). Retry after ${limitResult.retryAfterMs ?? 30000}ms.`,
          durationMs: Date.now() - startTime,
        };
      }
    }

    // Query sanitization gate
    if (typeof request.arguments['goal'] === 'string') {
      const val = validateProofSearchQuery(request.arguments['goal']);
      if (!val.valid) {
        return {
          success: false,
          toolName: request.toolName,
          error: `INPUT_SANITIZATION_FAILED: ${val.message ?? 'Invalid syntax in goal'}`,
          durationMs: Date.now() - startTime,
        };
      }
    }
    if (typeof request.arguments['code'] === 'string') {
      const val = validateProofSearchQuery(request.arguments['code']);
      if (!val.valid) {
        return {
          success: false,
          toolName: request.toolName,
          error: `INPUT_SANITIZATION_FAILED: ${val.message ?? 'Invalid syntax in code'}`,
          durationMs: Date.now() - startTime,
        };
      }
    }

    try {
      if (!this.isConnected()) {
        await this.connect();
      }

      // Kernel verification gate
      if (request.toolName === 'lean_verify_kernel') {
        const outcome: ProofOutcome = {
          kind: 'unavailable',
          certificationTier: 'UNAVAILABLE',
          verified: false,
          reason: 'client_stub',
        };
        return {
          success: true,
          toolName: request.toolName,
          data: outcome,
          error: 'Verification requires the server adjudicator.',
          durationMs: Date.now() - startTime,
        };
      }

      // Semantic Search Provider integration (Task C6 & ADR-0029)
      if (tool.category === 'search' || request.toolName === 'lean_leansearch' || request.toolName === 'lean_loogle') {
        const query = String(request.arguments['query'] ?? request.arguments['goal'] ?? 'Continuous');
        try {
          const results = await semanticSearchRegistry.searchWithFallback(query);
          return {
            success: true,
            toolName: request.toolName,
            data: {
              query,
              count: results.length,
              results,
              provider: results[0]?.source ?? 'lean-finder',
            },
            durationMs: Date.now() - startTime,
          };
        } catch {
          // If fallback fails, proceed to transport
        }
      }

      const result = await this.transportInstance.sendRequest(`tools/${request.toolName}`, request.arguments);

      // Cache hover info results
      if (request.toolName === 'lean_hover_info') {
        const cacheKey = JSON.stringify(request.arguments);
        this.hoverCache.set(cacheKey, result);
      }

      return {
        success: true,
        toolName: request.toolName,
        data: result,
        durationMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      return {
        success: false,
        toolName: request.toolName,
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime,
      };
    }
  }
}

export const defaultLeanLspClient = new LeanLspClient({
  transport: 'stdio',
  command: 'lean-lsp-mcp',
  projectPath: (typeof process !== 'undefined' && process.env?.['LEAN_PROJECT_PATH']) || '.',
  logLevel: 'info',
});
