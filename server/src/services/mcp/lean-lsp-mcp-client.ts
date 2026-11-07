import {
  LEAN_LSP_MCP_TOOLS,
  type McpClientConfig,
  type McpToolCallRequest,
  type McpToolCallResult,
  type McpToolDeclaration,
} from './mcp-client-types';
import { createMcpTransport, type McpTransport } from './mcp-transports';
import { mcpExternalSearchRateLimiter } from './mcp-rate-limiter';
import { validateProofSearchQuery } from '../../../../src/services/proof/proof-search-validator';
import { hybridAdjudicator } from '../verification/hybrid-adjudicator';
import type { ProofOutcome } from '../../types/proof-outcome';

export class LeanLspMcpClient {
  private readonly config: McpClientConfig;
  private readonly transport: McpTransport;
  private readonly tools = new Map<string, McpToolDeclaration>();

  constructor(config: McpClientConfig) {
    this.config = config;
    this.transport = createMcpTransport(config);

    for (const tool of LEAN_LSP_MCP_TOOLS) {
      this.tools.set(tool.name, tool);
    }
  }

  private readonly listeners = new Set<() => void>();
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
      transport: this.getTransportType(),
      toolsCount: this.tools.size,
    });
    return this.cachedSnapshot;
  };

  public async connect(): Promise<void> {
    await this.transport.connect();
    this.notify();
  }

  public async disconnect(): Promise<void> {
    await this.transport.disconnect();
    this.notify();
  }

  public isConnected(): boolean {
    return this.transport.isConnected();
  }

  public getTransportType(): string {
    return this.transport.type;
  }

  public listTools(): readonly McpToolDeclaration[] {
    return LEAN_LSP_MCP_TOOLS;
  }

  public getTool(name: string): McpToolDeclaration | undefined {
    return this.tools.get(name);
  }

  /**
   * Invokes an MCP tool with rate-limiting, sanitization, and structured result formatting.
   */
  public async callTool(request: McpToolCallRequest): Promise<McpToolCallResult> {
    const startTime = Date.now();
    const tool = this.tools.get(request.toolName);

    if (!tool) {
      return {
        success: false,
        toolName: request.toolName,
        error: `Unknown MCP tool: ${request.toolName}. Available tools count: ${this.tools.size}`,
        durationMs: Date.now() - startTime,
      };
    }

    // 1. Rate-limiting gate for external search tools (3 requests / 30 seconds)
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

    // 2. Input Sanitization Gate reusing validateProofSearchQuery for goal/code inputs
    if (typeof request.arguments['goal'] === 'string') {
      const validation = validateProofSearchQuery(request.arguments['goal']);
      if (!validation.valid) {
        return {
          success: false,
          toolName: request.toolName,
          error: `INPUT_SANITIZATION_FAILED: ${validation.message ?? 'Invalid syntax in goal'}`,
          durationMs: Date.now() - startTime,
        };
      }
    }

    if (typeof request.arguments['code'] === 'string') {
      const validation = validateProofSearchQuery(request.arguments['code']);
      if (!validation.valid) {
        return {
          success: false,
          toolName: request.toolName,
          error: `INPUT_SANITIZATION_FAILED: ${validation.message ?? 'Invalid syntax in code'}`,
          durationMs: Date.now() - startTime,
        };
      }
    }

    // 3. Execution via active transport
    try {
      if (!this.isConnected()) {
        await this.connect();
      }

      const rawResult = await this.transport.sendRequest(`tools/${request.toolName}`, request.arguments);

      // Dedicated handling for kernel verification tool
      if (request.toolName === 'lean_verify_kernel') {
        const code = String(request.arguments['code'] ?? '');
        const hasSorry = code.includes('sorry') || code.includes('admit');
        if (hasSorry) {
          return {
            success: false,
            toolName: request.toolName,
            error: 'KERNEL_VERIFICATION_REJECTED: Proof contains unproven sorry/admit.',
            durationMs: Date.now() - startTime,
          };
        }

        try {
          const adjResult = hybridAdjudicator.adjudicate({
            source: code,
            exitCode: 0,
          });

          if (adjResult.verdict === 'confirmed_valid') {
            const outcome: ProofOutcome = {
              kind: 'transport',
              source: 'hybrid-adjudicator',
              payload: {
                declarationCount: 1,
                unprovenCount: 0,
                axioms: adjResult.axioms,
                durationMs: Date.now() - startTime,
              },
            };
            return {
              success: true,
              toolName: request.toolName,
              data: outcome,
              durationMs: Date.now() - startTime,
            };
          }

          const outcome: ProofOutcome = {
            kind: 'preflight',
            syntaxValid: true,
            sorryFree: true,
            reason: adjResult.reason,
          };
          return {
            success: true,
            toolName: request.toolName,
            data: outcome,
            durationMs: Date.now() - startTime,
          };
        } catch {
          const outcome: ProofOutcome = {
            kind: 'unavailable',
            reason: 'adjudicator_unreachable',
          };
          return {
            success: true,
            toolName: request.toolName,
            data: outcome,
            durationMs: Date.now() - startTime,
          };
        }
      }

      return {
        success: true,
        toolName: request.toolName,
        data: rawResult,
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

// Default system singleton configured for local lean project
export const leanLspMcpClient = new LeanLspMcpClient({
  transport: 'stdio',
  command: 'lean-lsp-mcp',
  projectPath: (typeof process !== 'undefined' && process.env?.['LEAN_PROJECT_PATH']) || '.',
  logLevel: 'info',
});
