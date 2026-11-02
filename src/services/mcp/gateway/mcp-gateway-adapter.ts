/**
 * Optional MCP Gateway Adapter Interface (Phase 10.10, Task G1)
 *
 * Provides a uniform gateway interface for non-native MCP providers (DeepSeek, Groq, Kimi, MiniMax, OpenRouter).
 * Complies with Manifesto: DIP, Strategy pattern, discriminated unions, RFC 9457 errors.
 */

export interface McpGatewayRequest {
  readonly providerId: string;
  readonly method: string;
  readonly headers?: Record<string, string | undefined>;
  readonly body: unknown;
}

export interface McpGatewayResponse {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly body: unknown;
}

export interface McpGatewayAdapter {
  readonly name: string;
  readonly isAvailable: () => Promise<boolean>;
  readonly forwardRequest: (req: McpGatewayRequest) => Promise<McpGatewayResponse>;
}
