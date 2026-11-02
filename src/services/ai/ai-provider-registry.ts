import { PROVIDER_CAPABILITIES_MAP, type ProviderCapabilities } from './providers/provider-capabilities';

export type AiProviderId =
  | 'no-ai'
  | 'leanstral'
  | 'axle'
  | 'gemini'
  | 'nvidia-nim'
  | 'groq'
  | 'cerebras'
  | 'mistral'
  | 'openrouter'
  | 'anthropic'
  | 'openai'
  | 'deepseek'
  | 'kimi'
  | 'minimax';

export interface AiProviderDescriptor {
  readonly id: AiProviderId;
  readonly name: string;
  readonly isLocal: boolean;
  readonly defaultEndpoint?: string;
  readonly description: string;
  readonly capabilities: ProviderCapabilities;
}

export const AI_PROVIDERS: readonly AiProviderDescriptor[] = [
  {
    id: 'leanstral',
    name: 'Leanstral 1.5 (Local MoE)',
    isLocal: true,
    defaultEndpoint: 'http://localhost:8000/v1/completions',
    description: '119B/6.5B MoE Apache-2.0 local reasoning engine (vLLM / Ollama)',
    capabilities: PROVIDER_CAPABILITIES_MAP['leanstral']!,
  },
  {
    id: 'axle',
    name: 'AXLE Cloud Metaprogramming',
    isLocal: false,
    description: 'Remote cloud prover service (requires explicit user consent)',
    capabilities: PROVIDER_CAPABILITIES_MAP['axle']!,
  },
  {
    id: 'no-ai',
    name: 'Deterministic Heuristics (Zero-AI)',
    isLocal: true,
    description: 'Local syntax, equality, and arithmetic decision procedures',
    capabilities: PROVIDER_CAPABILITIES_MAP['no-ai']!,
  },
  {
    id: 'gemini',
    name: 'Google Gemini 2.5 Flash',
    isLocal: false,
    description: 'Google Multimodal reasoning with native MCP and function calling',
    capabilities: PROVIDER_CAPABILITIES_MAP['gemini']!,
  },
  {
    id: 'nvidia-nim',
    name: 'NVIDIA NIM (Free 40 RPM/model)',
    isLocal: false,
    description: 'Hosted Llama 3.3, Mixtral, Nemotron models with 40 RPM per-model rate limit',
    capabilities: PROVIDER_CAPABILITIES_MAP['nvidia-nim']!,
  },
  {
    id: 'groq',
    name: 'Groq Cloud LPU',
    isLocal: false,
    description: 'Ultra-low latency inference via Groq LPU (12K TPM free tier)',
    capabilities: PROVIDER_CAPABILITIES_MAP['groq']!,
  },
  {
    id: 'cerebras',
    name: 'Cerebras Wafer-Scale',
    isLocal: false,
    description: 'Fast wafer-scale reasoning via Cerebras',
    capabilities: PROVIDER_CAPABILITIES_MAP['cerebras']!,
  },
  {
    id: 'mistral',
    name: 'Mistral Codestral',
    isLocal: false,
    description: 'Mistral Codestral specialized code & proof reasoning model',
    capabilities: PROVIDER_CAPABILITIES_MAP['mistral']!,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter Free Tier',
    isLocal: false,
    description: 'Aggregated router with 19 free models and tool calling support',
    capabilities: PROVIDER_CAPABILITIES_MAP['openrouter']!,
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    isLocal: false,
    description: 'Claude 3.7 / 3.5 Sonnet with extended thinking and native MCP support',
    capabilities: PROVIDER_CAPABILITIES_MAP['anthropic']!,
  },
  {
    id: 'openai',
    name: 'OpenAI GPT-4.5 / o-series',
    isLocal: false,
    description: 'OpenAI reasoning models with mcp_approval_request support',
    capabilities: PROVIDER_CAPABILITIES_MAP['openai']!,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek V3 / R1',
    isLocal: false,
    description: 'DeepSeek reasoning models (function tools only, ai.ErrNoHosted compliant)',
    capabilities: PROVIDER_CAPABILITIES_MAP['deepseek']!,
  },
  {
    id: 'kimi',
    name: 'Moonshot Kimi',
    isLocal: false,
    description: 'Moonshot AI Kimi k2.6 & k3 (OpenAI-compatible Chat Completions)',
    capabilities: PROVIDER_CAPABILITIES_MAP['kimi']!,
  },
  {
    id: 'minimax',
    name: 'MiniMax-Text-01',
    isLocal: false,
    description: 'MiniMax hybrid provider with interleaved thinking mode',
    capabilities: PROVIDER_CAPABILITIES_MAP['minimax']!,
  },
];

/**
 * Task P1: Resolves default AI proof engine according to the Leanstral-First policy.
 * - If LEANSTRAL_ENDPOINT is configured, Leanstral becomes the default.
 * - If AXLE_API_KEY is configured, AXLE becomes the default.
 * - Otherwise, NoAiProvider remains the safe offline default.
 */
export function resolveDefaultProvider(env: Record<string, string | undefined> = {}): AiProviderId {
  if (env['LEANSTRAL_ENDPOINT']) return 'leanstral';
  if (env['AXLE_API_KEY']) return 'axle';
  return 'no-ai';
}
