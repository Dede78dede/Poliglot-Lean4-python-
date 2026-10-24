export interface Disposable {
  dispose(): void;
}

export interface McpToolResult {
  readonly success: boolean;
  readonly toolName: string;
  readonly data?: unknown;
  readonly error?: string;
  readonly truncated?: boolean;
  readonly proposalToken?: string;
  readonly requiresConfirmation?: boolean;
}

export type McpToolPermission = 'safe' | 'confirm' | 'dangerous';

export interface McpServerTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly permission: McpToolPermission;
  readonly handler: (args: unknown) => Promise<McpToolResult>;
}

export interface McpServerSnapshot {
  readonly toolNames: readonly string[];
  readonly toolsCount: number;
  readonly tools: readonly McpServerTool[];
}

export interface McpServerRegistry {
  register(tool: McpServerTool): Disposable;
  list(): readonly McpServerTool[];
  getByName(name: string): McpServerTool | undefined;
  subscribe(listener: () => void): () => void;
  getSnapshot(): McpServerSnapshot;
}

import { ExternalStoreBase } from '../stores/external-store-base';

export class DefaultMcpServerRegistry extends ExternalStoreBase<McpServerSnapshot> implements McpServerRegistry {
  private readonly tools = new Map<string, McpServerTool>();

  constructor() {
    super({ id: 'mcpServerRegistry', multiTabSync: true });
  }

  public register(tool: McpServerTool): Disposable {
    this.tools.set(tool.name, tool);
    this.notify();

    return {
      dispose: () => {
        this.tools.delete(tool.name);
        this.notify();
      },
    };
  }

  public list(): readonly McpServerTool[] {
    return Array.from(this.tools.values());
  }

  public getByName(name: string): McpServerTool | undefined {
    return this.tools.get(name);
  }

  protected computeSnapshot(): McpServerSnapshot {
    return Object.freeze({
      toolNames: Object.freeze(Array.from(this.tools.keys())),
      toolsCount: this.tools.size,
      tools: Object.freeze(Array.from(this.tools.values())),
    });
  }
}

export const mcpServerRegistry = new DefaultMcpServerRegistry();
