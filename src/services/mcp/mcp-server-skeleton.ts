import { commandRegistry } from '../navigation/command-registry';
import { contextKeyService } from '../navigation/context-key-service';

export const ENABLE_MCP_SERVER =
  typeof process !== 'undefined' && process.env?.['ENABLE_MCP_SERVER'] === 'true';

export interface McpServerToolResult {
  readonly success: boolean;
  readonly toolName: string;
  readonly data?: unknown;
  readonly error?: string;
  readonly truncated?: boolean;
}

export interface McpServerToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly permission: 'safe' | 'confirm' | 'dangerous';
  readonly handler: (args: Record<string, unknown>) => Promise<McpServerToolResult>;
}

export const SKELETON_TOOLS: readonly McpServerToolDefinition[] = [
  {
    name: 'polyglot_list_commands',
    description: 'Lists all registered commands in Polyglot Code Studio with categories and keybindings',
    permission: 'safe',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional filter by category (e.g. Navigation, Proof, Tools)',
        },
      },
    },
    handler: async (args) => {
      const all = commandRegistry.getAllCommands();
      const filtered = typeof args['category'] === 'string'
        ? all.filter((c) => c.category.toLowerCase() === (args['category'] as string).toLowerCase())
        : all;

      return {
        success: true,
        toolName: 'polyglot_list_commands',
        data: {
          totalCount: all.length,
          returnedCount: filtered.length,
          commands: filtered.map((c) => ({
            id: c.id,
            title: c.title,
            category: c.category,
            keybinding: c.keybinding,
            description: c.description,
          })),
        },
      };
    },
  },
  {
    name: 'polyglot_get_context_keys',
    description: 'Retrieves active context keys and their current boolean or string states',
    permission: 'safe',
    inputSchema: {
      type: 'object',
      properties: {
        keys: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional array of specific key names to inspect',
        },
      },
    },
    handler: async (args) => {
      const requested = Array.isArray(args['keys']) ? (args['keys'] as string[]) : undefined;
      const allKeys = contextKeyService.getSnapshot();
      const result: Record<string, unknown> = {};

      if (requested && requested.length > 0) {
        for (const k of requested) {
          result[k] = (allKeys as Record<string, unknown>)[k];
        }
      } else {
        Object.assign(result, allKeys);
      }

      return {
        success: true,
        toolName: 'polyglot_get_context_keys',
        data: {
          keysCount: Object.keys(result).length,
          contextKeys: result,
        },
      };
    },
  },
  {
    name: 'polyglot_get_proof_automation_status',
    description: 'Returns the operational status of proof automation engines (Duper, AXLE, Pantograph, Leanstral)',
    permission: 'safe',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      return {
        success: true,
        toolName: 'polyglot_get_proof_automation_status',
        data: {
          engines: {
            leanstral: {
              available: typeof process !== 'undefined' && Boolean(process.env?.['LEANSTRAL_ENDPOINT']),
              profile: 'vLLM / Ollama',
              model: 'Leanstral 1.5 119B/6.5B MoE',
            },
            axle: {
              available: typeof process !== 'undefined' && Boolean(process.env?.['AXLE_API_KEY']),
              tier: 'cloud-assisted',
            },
            duper: {
              available: true,
              type: 'first-order-superposition',
            },
            pantograph: {
              available: true,
              type: 'local-lean-driver',
            },
            kernelVerification: {
              available: true,
              tier: 'SEAL_KERNEL_VERIFIED_TIER5',
            },
          },
        },
      };
    },
  },
];

export class McpServerSkeleton {
  private readonly tools = new Map<string, McpServerToolDefinition>();

  constructor() {
    for (const tool of SKELETON_TOOLS) {
      this.tools.set(tool.name, tool);
    }
  }

  public isEnabled(): boolean {
    return ENABLE_MCP_SERVER;
  }

  public listTools(): readonly McpServerToolDefinition[] {
    return Array.from(this.tools.values());
  }

  public getTool(name: string): McpServerToolDefinition | undefined {
    return this.tools.get(name);
  }

  public async executeTool(name: string, args: Record<string, unknown>): Promise<McpServerToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        toolName: name,
        error: `Unknown tool: ${name}`,
      };
    }
    return tool.handler(args);
  }
}

export const mcpServerSkeleton = new McpServerSkeleton();
