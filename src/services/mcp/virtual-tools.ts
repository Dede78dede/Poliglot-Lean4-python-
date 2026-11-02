/**
 * Virtual Tools for Progressive Tool Discovery (Phase 10.10, Task T2)
 *
 * Implements the 3 virtual tools exposed when ENABLE_TOOL_SEARCH=true:
 * 1. polyglot_search_tools
 * 2. polyglot_describe_tool
 * 3. polyglot_invoke_tool
 */

import { mcpServerRegistry, type McpServerTool } from './mcp-server-registry';
import { searchTools } from './tool-search';
import { ERROR_REGISTRY, createProblemDetails } from '../errors/error-registry';

export const VIRTUAL_TOOL_DEFINITIONS: readonly McpServerTool[] = [
  {
    name: 'polyglot_search_tools',
    description: 'Searches the Polyglot Code Studio tool catalog using BM25 query matching, returning compact ToolCards to minimize token usage.',
    permission: 'safe',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keywords, e.g. "proof verification" or "mathlib"' },
        category: { type: 'string', description: 'Optional category filter, e.g. "verification", "search"' },
      },
      required: ['query'],
    },
    handler: async (rawArgs) => {
      const args = (rawArgs ?? {}) as { query?: string; category?: string };
      const query = args.query ?? '';
      const results = searchTools(query, args.category);
      return {
        success: true,
        toolName: 'polyglot_search_tools',
        data: {
          totalFound: results.length,
          tools: results,
        },
      };
    },
  },
  {
    name: 'polyglot_describe_tool',
    description: 'Retrieves the complete JSON Schema, description, and permissions for a specific Polyglot tool discovered via search.',
    permission: 'safe',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Exact name of the tool to describe' },
      },
      required: ['name'],
    },
    handler: async (rawArgs) => {
      const args = (rawArgs ?? {}) as { name?: string };
      const toolName = args.name ?? '';
      const tool = mcpServerRegistry.getByName(toolName);
      if (!tool) {
        return {
          success: false,
          toolName: 'polyglot_describe_tool',
          data: {
            error: `Tool not found: ${toolName}`,
          },
        };
      }
      return {
        success: true,
        toolName: 'polyglot_describe_tool',
        data: {
          name: tool.name,
          description: tool.description,
          permission: tool.permission,
          inputSchema: tool.inputSchema,
        },
      };
    },
  },
  {
    name: 'polyglot_invoke_tool',
    description: 'Invokes a discovered Polyglot tool by name. If the target tool requires confirmation (confirm tier), a valid proposalToken must be supplied.',
    permission: 'safe', // virtual dispatcher itself is safe, enforces confirm on child tool
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the tool to invoke' },
        arguments: { type: 'object', description: 'Arguments object matching the target tool schema' },
        proposalToken: { type: 'string', description: 'Two-phase commit proposal token (mandatory for confirm-tier tools)' },
      },
      required: ['name', 'arguments'],
    },
    handler: async (rawArgs) => {
      const args = (rawArgs ?? {}) as {
        name?: string;
        arguments?: Record<string, unknown>;
        proposalToken?: string;
      };
      const toolName = args.name ?? '';
      const tool = mcpServerRegistry.getByName(toolName);

      if (!tool) {
        return {
          success: false,
          toolName: 'polyglot_invoke_tool',
          data: {
            error: `Tool not found: ${toolName}`,
          },
        };
      }

      // Check confirm tier policy
      if (tool.permission === 'confirm' && !args.proposalToken) {
        const problem = createProblemDetails(
          ERROR_REGISTRY.PROPOSAL_TOKEN_REQUIRED,
          `req-${Date.now()}`,
          { targetTool: toolName }
        );
        return {
          success: false,
          toolName: 'polyglot_invoke_tool',
          data: problem,
          requiresConfirmation: true,
        };
      }

      // Pass invocation to real tool
      const targetArgs: Record<string, unknown> = {
        ...(args.arguments ?? {}),
      };
      if (args.proposalToken) {
        targetArgs['proposalToken'] = args.proposalToken;
      }

      const result = await tool.handler(targetArgs);
      return {
        ...result,
        toolName: `polyglot_invoke_tool:${toolName}`,
      };
    },
  },
];
