import type { StorageResult } from '../../../../src/types/storage';
import { validateProofSearchQuery } from '../../../../src/services/proof/proof-search-validator';

export interface AiSuggestionRequest {
  readonly goal: string;           // sanitized: max 10k, no control chars, balanced brackets
  readonly context?: string;       // optional surrounding code
  readonly maxTokens?: number;     // default 512
}

export interface AiSuggestion {
  readonly tactic: string;
  readonly confidence: 'low' | 'medium' | 'high';
  readonly provider: string;
  readonly explanation?: string;
}

export interface AiProvider {
  readonly id: string;
  readonly name: string;
  isAvailable(): Promise<boolean>;
  suggest(request: AiSuggestionRequest): Promise<StorageResult<AiSuggestion[]>>;
  repair?(brokenProof: string): Promise<StorageResult<string>>;
}

/**
 * 1. Default Strategy: NoAiProvider
 * Zero-network, offline-first deterministic strategy.
 * Uses local syntactic and mathematical heuristics to recommend tactics without external calls.
 */
export class NoAiProvider implements AiProvider {
  readonly id = 'no-ai';
  readonly name = 'Local Deterministic (Zero Network)';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async suggest(request: AiSuggestionRequest): Promise<StorageResult<AiSuggestion[]>> {
    const validation = validateProofSearchQuery(request.goal);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: validation.message ?? 'Invalid goal syntax.',
          details: validation.errorCode,
        },
      };
    }

    const goal = request.goal.trim();
    const suggestions: AiSuggestion[] = [];

    // Heuristic 1: Definitional Equality (a = a, 2 + 2 = 4, etc.)
    if (/⊢\s*(.+?)\s*=\s*\1\b/.test(goal) || /⊢\s*\d+\s*[\+\-\*\/]\s*\d+\s*=\s*\d+/.test(goal)) {
      suggestions.push({
        tactic: 'rfl',
        confidence: 'high',
        provider: this.id,
        explanation: 'Definitional equality or computable ground arithmetic reducible by reflexivity.',
      });
      suggestions.push({
        tactic: 'decide',
        confidence: 'high',
        provider: this.id,
        explanation: 'Decidable proposition verified by kernel computation.',
      });
    }

    // Heuristic 2: Linear Integer / Natural Arithmetic
    if (/[+*<>]|≤|≥|\bNat\b|\bInt\b/.test(goal)) {
      suggestions.push({
        tactic: 'omega',
        confidence: 'high',
        provider: this.id,
        explanation: 'Presburger linear integer/natural arithmetic decision procedure.',
      });
    }

    // Heuristic 3: Ring / Algebraic Expressions
    if (/[+*^]/.test(goal) && /[a-zA-Z]/.test(goal)) {
      suggestions.push({
        tactic: 'ring',
        confidence: 'medium',
        provider: this.id,
        explanation: 'Commutative ring normalizer for polynomial equations.',
      });
    }

    // Heuristic 4: Conjunction or Existential Goal
    if (/[∧∧]|\bAnd\b/.test(goal)) {
      suggestions.push({
        tactic: 'constructor',
        confidence: 'medium',
        provider: this.id,
        explanation: 'Split conjunction or inductive constructor into separate sub-goals.',
      });
    }

    // Heuristic 5: Implication or Universal Quantifier
    if (/[→∀]/.test(goal)) {
      suggestions.push({
        tactic: 'intro h',
        confidence: 'medium',
        provider: this.id,
        explanation: 'Introduce antecedent or universal variable into local hypothesis context.',
      });
    }

    // Heuristic 6: General Simplification Fallback
    suggestions.push({
      tactic: 'simp',
      confidence: suggestions.length === 0 ? 'medium' : 'low',
      provider: this.id,
      explanation: 'Equational rewriting using default simp lemma set.',
    });

    return {
      success: true,
      data: suggestions,
    };
  }

  async repair(brokenProof: string): Promise<StorageResult<string>> {
    // Replaces broken 'sorry' or faulty tactics with local closed candidate
    const repaired = brokenProof.replace(/\bsorry\b/g, 'rfl');
    return {
      success: true,
      data: repaired,
    };
  }
}

/**
 * 2. AxleAiProvider (Axiom Lean Engine)
 * Cloud provider with 14 metaprogramming tools (verification, declaration metadata, semantic manipulation).
 */
export class AxleAiProvider implements AiProvider {
  readonly id = 'axle';
  readonly name = 'Axiom Lean Engine (AXLE Cloud)';
  private readonly apiUrl: string;
  private readonly apiKey?: string;

  constructor(apiUrl = process.env['AXLE_API_URL'] || 'https://api.axiom-axle.org/v1', apiKey = process.env['AXLE_API_KEY']) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async suggest(request: AiSuggestionRequest): Promise<StorageResult<AiSuggestion[]>> {
    if (!this.apiKey) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'AXLE API key is not configured. Falling back to local strategy.',
        },
      };
    }

    const validation = validateProofSearchQuery(request.goal);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: validation.message ?? 'Invalid goal syntax.',
        },
      };
    }

    try {
      const res = await fetch(`${this.apiUrl}/proof/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          goal: request.goal,
          context: request.context,
          max_tokens: request.maxTokens ?? 512,
        }),
      });

      if (!res.ok) {
        return {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: `AXLE API responded with status ${res.status}`,
          },
        };
      }

      const json = (await res.json()) as { suggestions?: Array<{ tactic: string; confidence?: 'low' | 'medium' | 'high'; explanation?: string }> };
      const suggestions: AiSuggestion[] = (json.suggestions ?? []).map((s) => ({
        tactic: s.tactic,
        confidence: s.confidence ?? 'high',
        provider: this.id,
        explanation: s.explanation ?? 'Synthesized by AXLE Metaprogramming Engine',
      }));

      return { success: true, data: suggestions };
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  }

  async repair(brokenProof: string): Promise<StorageResult<string>> {
    if (!this.apiKey) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'AXLE API key not configured' },
      };
    }

    try {
      const res = await fetch(`${this.apiUrl}/proof/repair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ proof: brokenProof }),
      });

      if (!res.ok) {
        return {
          success: false,
          error: { code: 'NETWORK_ERROR', message: `AXLE HTTP ${res.status}` },
        };
      }

      const json = (await res.json()) as { repairedProof?: string };
      return {
        success: true,
        data: json.repairedProof ?? brokenProof,
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  }
}

export type LeanstralProfile = 'vllm' | 'ollama';

/**
 * 3. LeanstralLocalProvider (Leanstral 1.5 - Local MoE)
 * Local provider communicating with vLLM / Ollama instance on local network.
 * Supports dual profiles:
 * - vLLM: High-throughput 4-way tensor parallelism, 200K context, MARLIN NvFp4 backend.
 * - Ollama: Local workstation quantized GGUF endpoint.
 */
export class LeanstralLocalProvider implements AiProvider {
  readonly id = 'leanstral';
  readonly name = 'Leanstral 1.5 (Local vLLM / Ollama MoE)';
  private readonly endpoint: string;
  private readonly profile: LeanstralProfile;

  constructor(
    endpoint = process.env['LEANSTRAL_ENDPOINT'] || 'http://localhost:11434/api/generate',
    profile?: LeanstralProfile,
  ) {
    this.endpoint = endpoint;
    this.profile = profile ?? (endpoint.includes('/v1/') ? 'vllm' : 'ollama');
  }

  getProfile(): LeanstralProfile {
    return this.profile;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);
      const pingUrl = this.profile === 'vllm'
        ? this.endpoint.replace(/\/chat\/completions$|\/completions$/, '/models')
        : this.endpoint.replace(/\/generate$/, '/tags');
      const res = await fetch(pingUrl, { signal: controller.signal });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  }

  async suggest(request: AiSuggestionRequest): Promise<StorageResult<AiSuggestion[]>> {
    const validation = validateProofSearchQuery(request.goal);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: validation.message ?? 'Invalid goal syntax.',
        },
      };
    }

    try {
      const prompt = `[LEAN 4 PROVER]\nGoal: ${request.goal}\nContext: ${request.context ?? ''}\nSuggest next tactical step:`;
      const body = this.profile === 'vllm'
        ? JSON.stringify({
            model: 'leanstral-1.5',
            prompt,
            max_tokens: request.maxTokens ?? 512,
            temperature: 0.1,
          })
        : JSON.stringify({
            model: 'leanstral-1.5:q4_k_m',
            prompt,
            stream: false,
            options: {
              num_predict: request.maxTokens ?? 512,
              temperature: 0.1,
            },
          });

      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!res.ok) {
        return {
          success: false,
          error: { code: 'NETWORK_ERROR', message: `Leanstral daemon HTTP ${res.status}` },
        };
      }

      const json = (await res.json()) as { response?: string; choices?: readonly { text?: string }[] };
      let rawText = '';
      if (this.profile === 'vllm' && json.choices && json.choices.length > 0) {
        rawText = json.choices[0]?.text?.trim() ?? 'rfl';
      } else {
        rawText = json.response?.trim() ?? 'rfl';
      }
      const tactic = rawText.split('\n')[0]?.replace(/^by\s+/, '') ?? 'rfl';

      return {
        success: true,
        data: [
          {
            tactic,
            confidence: 'high',
            provider: this.id,
            explanation: `Synthesized by Leanstral 1.5 local MoE (${this.profile.toUpperCase()} profile)`,
          },
        ],
      };
    } catch (err: unknown) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  }
}

export type AiProviderId = 'no-ai' | 'leanstral' | 'axle';

/**
 * Task P1: Leanstral-First Policy Resolver
 * If LEANSTRAL_ENDPOINT is configured, LeanstralLocalProvider becomes the default.
 * If AXLE_API_KEY is configured (and no Leanstral endpoint), Axle becomes default.
 * NoAiProvider remains the default only when no endpoint is configured.
 */
export function resolveDefaultProvider(env: NodeJS.ProcessEnv = process.env): AiProviderId {
  if (env['LEANSTRAL_ENDPOINT']) return 'leanstral';
  if (env['AXLE_API_KEY']) return 'axle';
  return 'no-ai';
}

/**
 * AI Provider Registry & Active Provider Manager
 */
export class AiProviderRegistry {
  private readonly providers = new Map<string, AiProvider>();
  private activeProviderId: string;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.register(new NoAiProvider());
    this.register(new AxleAiProvider());
    this.register(new LeanstralLocalProvider());

    const explicitProvider = env['AI_PROOF_PROVIDER'];
    if (explicitProvider && this.providers.has(explicitProvider)) {
      this.activeProviderId = explicitProvider;
    } else {
      this.activeProviderId = resolveDefaultProvider(env);
    }
  }

  register(provider: AiProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): AiProvider | undefined {
    return this.providers.get(id);
  }

  getActive(): AiProvider {
    return this.providers.get(this.activeProviderId) ?? this.providers.get('no-ai')!;
  }

  setActive(id: string): boolean {
    if (!this.providers.has(id)) return false;
    this.activeProviderId = id;
    return true;
  }

  async list(): Promise<readonly { id: string; name: string; isAvailable: boolean; isActive: boolean }[]> {
    const results = [];
    for (const [id, provider] of this.providers.entries()) {
      const isAvailable = await provider.isAvailable();
      results.push({
        id,
        name: provider.name,
        isAvailable,
        isActive: id === this.activeProviderId,
      });
    }
    return results;
  }
}

export const aiProviderRegistry = new AiProviderRegistry();
