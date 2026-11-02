/**
 * LiteLLM Gateway Adapter (Phase 10.10, Task G1)
 *
 * Connects non-native MCP providers through LiteLLM proxy (e.g. DeepSeek, Kimi, MiniMax, Groq).
 * If gateway is unreachable, throws RFC 9457 BridgeError('GATEWAY_UNAVAILABLE').
 */

import type { McpGatewayAdapter, McpGatewayRequest, McpGatewayResponse } from './mcp-gateway-adapter';
import { BridgeError } from '../../errors/bridge-error';

export class LiteLlmGatewayAdapter implements McpGatewayAdapter {
  public readonly name = 'litellm';
  private readonly endpoint: string;

  constructor(endpoint?: string) {
    this.endpoint =
      endpoint ??
      (typeof process !== 'undefined' ? process.env?.['LITELLM_ENDPOINT'] : undefined) ??
      'http://localhost:4000';
  }

  public async isAvailable(): Promise<boolean> {
    try {
      if (typeof fetch === 'undefined') return false;
      const res = await fetch(`${this.endpoint}/health`, { method: 'GET', signal: AbortSignal.timeout(1500) });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async forwardRequest(req: McpGatewayRequest): Promise<McpGatewayResponse> {
    const isAvail = await this.isAvailable();
    if (!isAvail) {
      throw new BridgeError(
        'GATEWAY_UNAVAILABLE',
        `litellm-${Date.now()}`,
        { gateway: 'litellm', endpoint: this.endpoint, providerId: req.providerId }
      );
    }

    try {
      const res = await fetch(`${this.endpoint}/v1/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers as Record<string, string> ?? {}),
        },
        body: JSON.stringify(req.body),
      });

      const body = await res.json();
      return {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
        body,
      };
    } catch (err: unknown) {
      throw new BridgeError(
        'GATEWAY_UNAVAILABLE',
        `litellm-req-${Date.now()}`,
        { gateway: 'litellm', message: err instanceof Error ? err.message : String(err) }
      );
    }
  }
}

export const liteLlmGatewayAdapter = new LiteLlmGatewayAdapter();
