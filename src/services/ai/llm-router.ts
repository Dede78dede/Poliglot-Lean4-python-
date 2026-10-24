import type { AiProvider, AiSuggestionRequest, AiSuggestion } from '../../../server/src/services/ai/ai-provider';
import type { StorageResult } from '../../types/storage';
import {
  NvidiaNimProvider,
  GroqProvider,
  CerebrasProvider,
  GeminiProvider,
  OpenRouterProvider,
  MistralProvider,
  type BaseFreeLlmProvider,
} from './providers/free-providers';
import { tokenBudgetManager } from './token-budget-manager';

import { ExternalStoreBase } from '../stores/external-store-base';

export interface CircuitBreakerState {
  readonly failureCount: number;
  readonly openUntil: number; // timestamp
}

export class LlmRouter extends ExternalStoreBase<readonly string[]> {
  private readonly providers = new Map<string, BaseFreeLlmProvider>();
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();
  private readonly maxFailuresBeforeBreak = 5;
  private readonly cooldownMs = 60_000; // 60s cooldown

  constructor() {
    super({ id: 'llmRouter', multiTabSync: false });
    this.registerProvider(new NvidiaNimProvider());
    this.registerProvider(new GroqProvider());
    this.registerProvider(new CerebrasProvider());
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new OpenRouterProvider());
    this.registerProvider(new MistralProvider());
  }

  protected computeSnapshot(): readonly string[] {
    return Object.freeze(Array.from(this.providers.keys()));
  }

  public registerProvider(provider: BaseFreeLlmProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: string): BaseFreeLlmProvider | undefined {
    return this.providers.get(id);
  }

  public listProviders(): readonly BaseFreeLlmProvider[] {
    return Array.from(this.providers.values());
  }

  public isCircuitOpen(providerId: string): boolean {
    const cb = this.circuitBreakers.get(providerId);
    if (!cb) return false;
    if (Date.now() < cb.openUntil) return true;
    // Cooldown passed, reset
    this.circuitBreakers.delete(providerId);
    return false;
  }

  public recordFailure(providerId: string): void {
    const current = this.circuitBreakers.get(providerId) ?? { failureCount: 0, openUntil: 0 };
    const newCount = current.failureCount + 1;
    if (newCount >= this.maxFailuresBeforeBreak) {
      this.circuitBreakers.set(providerId, {
        failureCount: newCount,
        openUntil: Date.now() + this.cooldownMs,
      });
    } else {
      this.circuitBreakers.set(providerId, {
        failureCount: newCount,
        openUntil: 0,
      });
    }
  }

  public recordSuccess(providerId: string): void {
    this.circuitBreakers.delete(providerId);
  }

  /**
   * Routes an AI request through the free API chain:
   * 1. Check token budget for each provider
   * 2. Skip providers with open circuit breakers or active rate limits
   * 3. For NVIDIA NIM, use model-aware routing (cycle models to maximize throughput)
   * 4. Fallback chain on rate-limit or errors
   */
  public async routeSuggestion(request: AiSuggestionRequest): Promise<StorageResult<AiSuggestion[]>> {
    // Ranked by priority: NIM (40 RPM/model) -> Groq (high speed) -> Cerebras -> Gemini -> OpenRouter -> Mistral
    const candidateIds = ['nvidia-nim', 'groq', 'cerebras', 'gemini', 'openrouter', 'mistral'];

    // Check if ALL token budgets are exhausted
    const allExhausted = candidateIds.every((id) => tokenBudgetManager.isExhausted(id));
    if (allExhausted) {
      return {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'All free API provider token budgets are exhausted for today.',
          details: { reason: 'BUDGET_EXHAUSTED' },
        },
      };
    }

    for (const id of candidateIds) {
      const provider = this.providers.get(id);
      if (!provider) continue;

      // 1. Token budget check
      if (tokenBudgetManager.isExhausted(id)) {
        continue;
      }

      // 2. Circuit breaker check
      if (this.isCircuitOpen(id)) {
        continue;
      }

      // 3. Availability / Rate limit check
      const available = await provider.isAvailable();
      if (!available) {
        continue;
      }

      // 4. Attempt call with fallback
      try {
        const result = await provider.suggest(request);
        if (result.success) {
          this.recordSuccess(id);
          return result;
        } else {
          this.recordFailure(id);
          // Continue to fallback candidate
        }
      } catch {
        this.recordFailure(id);
        // Continue to fallback candidate
      }
    }

    return {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'All candidate free API providers are currently rate-limited, cooling down, or exhausted.',
        details: { reason: 'ALL_PROVIDERS_UNAVAILABLE' },
      },
    };
  }
}

export const llmRouter = new LlmRouter();
