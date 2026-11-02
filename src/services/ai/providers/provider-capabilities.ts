/**
 * AI Provider Capabilities Matrix & Transport Schema (Phase 10.10, Task P1)
 *
 * Defines the capability matrix for all 14 supported AI providers:
 * - Native MCP vs Function-only vs Hybrid
 * - Authentication scheme (Bearer, x-api-key, Bearer+Header)
 * - Tool calling capacity and tool choice support
 * - Thinking mode support (none, optional, always-on, interleaved)
 * - Token pricing & Free Tier limits
 */

export type ProviderTransport = 'native-mcp' | 'function-only' | 'hybrid';
export type ProviderAuthScheme = 'bearer' | 'x-api-key' | 'query-param' | 'bearer-plus-header';
export type ProviderThinkingMode = 'none' | 'optional' | 'always-on' | 'interleaved';

export interface ProviderCapabilities {
  readonly nativeMcp: boolean;
  readonly transport: ProviderTransport;
  readonly authScheme: ProviderAuthScheme;
  readonly authHeaderName?: string;
  readonly maxTools: number;
  readonly thinkingMode: ProviderThinkingMode;
  readonly supportsToolChoice: 'none' | 'auto' | 'required' | 'named' | 'all';
  readonly pricingUsdPerMillionInput: number;
  readonly pricingUsdPerMillionOutput: number;
  readonly freeTierRpm: number;
  readonly freeTierTpm?: number;
  readonly notes: readonly string[];
}

export const PROVIDER_CAPABILITIES_MAP: Record<string, ProviderCapabilities> = {
  gemini: {
    nativeMcp: true,
    transport: 'native-mcp',
    authScheme: 'bearer',
    maxTools: 128,
    thinkingMode: 'optional',
    supportsToolChoice: 'all',
    pricingUsdPerMillionInput: 0.15,
    pricingUsdPerMillionOutput: 0.60,
    freeTierRpm: 15,
    freeTierTpm: 250_000,
    notes: ['Native Gemini 2.5 Flash / Pro with function calling & MCP bridge'],
  },
  'nvidia-nim': {
    nativeMcp: false,
    transport: 'function-only',
    authScheme: 'bearer',
    maxTools: 128,
    thinkingMode: 'none',
    supportsToolChoice: 'auto',
    pricingUsdPerMillionInput: 0.0,
    pricingUsdPerMillionOutput: 0.0,
    freeTierRpm: 40,
    notes: ['40 RPM per model bucket. Function-calling gateway required for tool use.'],
  },
  groq: {
    nativeMcp: false,
    transport: 'function-only',
    authScheme: 'bearer',
    maxTools: 128,
    thinkingMode: 'none',
    supportsToolChoice: 'auto',
    pricingUsdPerMillionInput: 0.59,
    pricingUsdPerMillionOutput: 0.79,
    freeTierRpm: 30,
    freeTierTpm: 12_000,
    notes: ['12K TPM free tier makes Tool Search (ENABLE_TOOL_SEARCH) essential to avoid rate limit'],
  },
  cerebras: {
    nativeMcp: false,
    transport: 'function-only',
    authScheme: 'bearer',
    maxTools: 128,
    thinkingMode: 'none',
    supportsToolChoice: 'auto',
    pricingUsdPerMillionInput: 0.10,
    pricingUsdPerMillionOutput: 0.10,
    freeTierRpm: 30,
    notes: ['Ultra-fast wafer scale engine inference'],
  },
  mistral: {
    nativeMcp: false,
    transport: 'function-only',
    authScheme: 'bearer',
    maxTools: 128,
    thinkingMode: 'none',
    supportsToolChoice: 'auto',
    pricingUsdPerMillionInput: 2.0,
    pricingUsdPerMillionOutput: 6.0,
    freeTierRpm: 60,
    freeTierTpm: 500_000,
    notes: ['Codestral code reasoning specialist'],
  },
  openrouter: {
    nativeMcp: false,
    transport: 'function-only',
    authScheme: 'bearer',
    maxTools: 128,
    thinkingMode: 'optional',
    supportsToolChoice: 'all',
    pricingUsdPerMillionInput: 0.0,
    pricingUsdPerMillionOutput: 0.0,
    freeTierRpm: 20,
    notes: ['19 free models with tool calling capabilities'],
  },
  leanstral: {
    nativeMcp: true,
    transport: 'native-mcp',
    authScheme: 'bearer',
    maxTools: 128,
    thinkingMode: 'none',
    supportsToolChoice: 'auto',
    pricingUsdPerMillionInput: 0.0,
    pricingUsdPerMillionOutput: 0.0,
    freeTierRpm: 1000,
    notes: ['Local offline 119B/6.5B MoE Apache-2.0 container instance'],
  },
  axle: {
    nativeMcp: false,
    transport: 'function-only',
    authScheme: 'x-api-key',
    authHeaderName: 'x-api-key',
    maxTools: 32,
    thinkingMode: 'none',
    supportsToolChoice: 'auto',
    pricingUsdPerMillionInput: 0.0,
    pricingUsdPerMillionOutput: 0.0,
    freeTierRpm: 60,
    notes: ['Remote cloud prover service with two-phase commit consent gate'],
  },
  anthropic: {
    nativeMcp: true,
    transport: 'native-mcp',
    authScheme: 'x-api-key',
    authHeaderName: 'x-api-key',
    maxTools: 128,
    thinkingMode: 'optional',
    supportsToolChoice: 'all',
    pricingUsdPerMillionInput: 3.0,
    pricingUsdPerMillionOutput: 15.0,
    freeTierRpm: 5,
    notes: ['Claude 3.7 / 3.5 Sonnet with extended thinking mode and MCP stdio/HTTP support'],
  },
  openai: {
    nativeMcp: true,
    transport: 'native-mcp',
    authScheme: 'bearer',
    maxTools: 128,
    thinkingMode: 'optional',
    supportsToolChoice: 'all',
    pricingUsdPerMillionInput: 2.5,
    pricingUsdPerMillionOutput: 10.0,
    freeTierRpm: 3,
    notes: ['GPT-4.5 / o1 / o3 with mcp_approval_request confirmation protocol'],
  },
  'no-ai': {
    nativeMcp: false,
    transport: 'function-only',
    authScheme: 'bearer',
    maxTools: 0,
    thinkingMode: 'none',
    supportsToolChoice: 'none',
    pricingUsdPerMillionInput: 0.0,
    pricingUsdPerMillionOutput: 0.0,
    freeTierRpm: 1000,
    notes: ['Zero-AI deterministic formal heuristic prover'],
  },
  deepseek: {
    nativeMcp: false,
    transport: 'function-only',
    authScheme: 'bearer',
    maxTools: 128,
    thinkingMode: 'optional',
    supportsToolChoice: 'auto',
    pricingUsdPerMillionInput: 0.14,
    pricingUsdPerMillionOutput: 0.28,
    freeTierRpm: 0,
    notes: ['DeepSeek V3 / R1 (ai.ErrNoHosted: function tools only, max 128 tools)'],
  },
  kimi: {
    nativeMcp: false,
    transport: 'function-only',
    authScheme: 'bearer',
    maxTools: 128,
    thinkingMode: 'none',
    supportsToolChoice: 'all',
    pricingUsdPerMillionInput: 0.60,
    pricingUsdPerMillionOutput: 2.50,
    freeTierRpm: 0,
    notes: ['Moonshot AI / Kimi k2.6 & k3 (OpenAI-compatible Chat Completions, no hosted MCP)'],
  },
  minimax: {
    nativeMcp: false,
    transport: 'hybrid',
    authScheme: 'bearer-plus-header',
    authHeaderName: 'GroupId',
    maxTools: 64,
    thinkingMode: 'interleaved',
    supportsToolChoice: 'auto',
    pricingUsdPerMillionInput: 0.20,
    pricingUsdPerMillionOutput: 0.60,
    freeTierRpm: 0,
    notes: ['MiniMax MiniMax-Text-01 (interleaved thinking mode mandatory, proprietary + client function call)'],
  },
};
