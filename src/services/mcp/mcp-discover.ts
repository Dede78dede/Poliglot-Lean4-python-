/**
 * MCP 2026-07-28 Stateless Spec: server/discover (Phase 10.10, Task M1)
 *
 * Implements the mandatory server/discover discovery endpoint.
 * Zero session state, immutable capabilities.
 */

export interface McpDiscoverResponse {
  readonly protocolVersions: readonly ['2026-07-28'];
  readonly capabilities: {
    readonly tools: { readonly listChanged: false };
    readonly prompts: { readonly listChanged: false };
    readonly resources: { readonly listChanged: false };
  };
  readonly serverInfo: {
    readonly name: 'polyglot-code-studio';
    readonly version: string;
    readonly vendor: 'polyglot';
  };
}

export const MCP_SERVER_VERSION = '1.0.0';

export function getMcpDiscoverPayload(version = MCP_SERVER_VERSION): McpDiscoverResponse {
  return {
    protocolVersions: ['2026-07-28'],
    capabilities: {
      tools: { listChanged: false },
      prompts: { listChanged: false },
      resources: { listChanged: false },
    },
    serverInfo: {
      name: 'polyglot-code-studio',
      version,
      vendor: 'polyglot',
    },
  };
}
