export type AiProviderId = 'no-ai' | 'leanstral' | 'axle';

export interface AiProviderDescriptor {
  readonly id: AiProviderId;
  readonly name: string;
  readonly isLocal: boolean;
  readonly defaultEndpoint?: string;
  readonly description: string;
}

export const AI_PROVIDERS: readonly AiProviderDescriptor[] = [
  {
    id: 'leanstral',
    name: 'Leanstral 1.5 (Local MoE)',
    isLocal: true,
    defaultEndpoint: 'http://localhost:8000/v1/completions',
    description: '119B/6.5B MoE Apache-2.0 local reasoning engine (vLLM / Ollama)',
  },
  {
    id: 'axle',
    name: 'AXLE Cloud Metaprogramming',
    isLocal: false,
    description: 'Remote cloud prover service (requires explicit user consent)',
  },
  {
    id: 'no-ai',
    name: 'Deterministic Heuristics (Zero-AI)',
    isLocal: true,
    description: 'Local syntax, equality, and arithmetic decision procedures',
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
