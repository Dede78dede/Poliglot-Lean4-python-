/**
 * NoGatewayAdapter (Phase 10.10, Task G1)
 *
 * Default safe fallback when ENABLE_MCP_GATEWAY is false.
 * Zero-network local pass-through.
 */

import type { McpGatewayAdapter, McpGatewayRequest, McpGatewayResponse } from './mcp-gateway-adapter';

export class NoGatewayAdapter implements McpGatewayAdapter {
  public readonly name = 'no-gateway';

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async forwardRequest(req: McpGatewayRequest): Promise<McpGatewayResponse> {
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: {
        gateway: 'none',
        providerId: req.providerId,
        direct: true,
      },
    };
  }
}

export const noGatewayAdapter = new NoGatewayAdapter();
