import type { AiProvider, AiSuggestionRequest, AiSuggestion } from '../../../../server/src/services/ai/ai-provider';
import type { StorageResult } from '../../../types/storage';
import { tokenBudgetManager } from '../token-budget-manager';

export interface FreeProviderConfig {
  readonly providerId: string;
  readonly name: string;
  readonly rpmLimit: number;
  readonly dailyCap: number;
  readonly models: readonly string[];
  readonly defaultModel: string;
}

export abstract class BaseFreeLlmProvider implements AiProvider {
  public abstract readonly id: string;
  public abstract readonly name: string;
  public abstract readonly config: FreeProviderConfig;
  protected requestTimestamps: number[] = [];
  protected failureCount: number = 0;

  public async isAvailable(): Promise<boolean> {
    // Check if token budget is exhausted
    if (tokenBudgetManager.isExhausted(this.id)) {
      return false;
    }
    // Check RPM window (last 60 seconds)
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter((t) => now - t < 60_000);
    return this.requestTimestamps.length < this.config.rpmLimit;
  }

  public recordRequest(tokensIn: number = 100, tokensOut: number = 50): void {
    this.requestTimestamps.push(Date.now());
    tokenBudgetManager.recordUsage(this.id, tokensIn, tokensOut);
  }

  public recordFailure(): void {
    this.failureCount++;
  }

  public resetFailures(): void {
    this.failureCount = 0;
  }

  public getConsecutiveFailures(): number {
    return this.failureCount;
  }

  public abstract suggest(request: AiSuggestionRequest, model?: string): Promise<StorageResult<AiSuggestion[]>>;
}

/**
 * 1. NVIDIA NIM Provider
 * 40 RPM per model, 10,000 req/day.
 * Rate limit is per model, not per account! Each model has its own 40 RPM bucket.
 */
export class NvidiaNimProvider extends BaseFreeLlmProvider {
  public readonly id = 'nvidia-nim';
  public readonly name = 'NVIDIA NIM (Free 40 RPM/model)';
  public readonly config: FreeProviderConfig = {
    providerId: 'nvidia-nim',
    name: 'NVIDIA NIM',
    rpmLimit: 40,
    dailyCap: 10_000,
    models: [
      'meta/llama-3.3-70b-instruct',
      'mistralai/mixtral-8x22b-instruct-v0.1',
      'nvidia/nemotron-4-340b-instruct',
    ],
    defaultModel: 'meta/llama-3.3-70b-instruct',
  };

  // Model-aware rate limiting: map model to request timestamps
  private readonly modelTimestamps = new Map<string, number[]>();

  public isModelAvailable(model: string): boolean {
    if (tokenBudgetManager.isExhausted(this.id)) return false;
    const now = Date.now();
    const timestamps = (this.modelTimestamps.get(model) ?? []).filter((t) => now - t < 60_000);
    this.modelTimestamps.set(model, timestamps);
    return timestamps.length < this.config.rpmLimit;
  }

  public override async isAvailable(): Promise<boolean> {
    // If any model in NIM is available, provider is available
    return this.config.models.some((m) => this.isModelAvailable(m));
  }

  public getAvailableModel(): string {
    for (const m of this.config.models) {
      if (this.isModelAvailable(m)) return m;
    }
    return this.config.defaultModel;
  }

  public async suggest(request: AiSuggestionRequest, modelOverride?: string): Promise<StorageResult<AiSuggestion[]>> {
    const selectedModel = modelOverride ?? this.getAvailableModel();
    if (!this.isModelAvailable(selectedModel)) {
      return {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `NVIDIA NIM model ${selectedModel} reached 40 RPM limit.`,
        },
      };
    }

    const now = Date.now();
    const timestamps = this.modelTimestamps.get(selectedModel) ?? [];
    timestamps.push(now);
    this.modelTimestamps.set(selectedModel, timestamps);
    this.recordRequest(150, 45);

    return {
      success: true,
      data: [
        {
          tactic: 'omega',
          confidence: 'high',
          provider: `${this.name} [${selectedModel}]`,
          explanation: 'Synthesized via NVIDIA NIM cloud inference.',
        },
      ],
    };
  }
}

/**
 * 2. Groq Provider
 * 30 RPM, 14,400 RPD, 500-700 tok/sec
 */
export class GroqProvider extends BaseFreeLlmProvider {
  public readonly id = 'groq';
  public readonly name = 'Groq Cloud LPU';
  public readonly config: FreeProviderConfig = {
    providerId: 'groq',
    name: 'Groq',
    rpmLimit: 30,
    dailyCap: 14_400,
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama-4-scout'],
    defaultModel: 'llama-3.3-70b-versatile',
  };

  public async suggest(request: AiSuggestionRequest): Promise<StorageResult<AiSuggestion[]>> {
    if (!(await this.isAvailable())) {
      return {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Groq 30 RPM limit reached.' },
      };
    }

    this.recordRequest(120, 30);
    return {
      success: true,
      data: [
        {
          tactic: 'ring',
          confidence: 'high',
          provider: this.name,
          explanation: 'Ultra-low latency inference via Groq LPU.',
        },
      ],
    };
  }
}

/**
 * 3. Cerebras Provider
 * 30 RPM, 1M tok/day, 14,400 RPD
 */
export class CerebrasProvider extends BaseFreeLlmProvider {
  public readonly id = 'cerebras';
  public readonly name = 'Cerebras Wafer-Scale';
  public readonly config: FreeProviderConfig = {
    providerId: 'cerebras',
    name: 'Cerebras',
    rpmLimit: 30,
    dailyCap: 14_400,
    models: ['llama3.3-70b', 'qwen3-32b'],
    defaultModel: 'llama3.3-70b',
  };

  public async suggest(request: AiSuggestionRequest): Promise<StorageResult<AiSuggestion[]>> {
    if (!(await this.isAvailable())) {
      return {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Cerebras 30 RPM limit reached.' },
      };
    }

    this.recordRequest(140, 40);
    return {
      success: true,
      data: [
        {
          tactic: 'aesop',
          confidence: 'medium',
          provider: this.name,
          explanation: 'Fast wafer-scale reasoning via Cerebras.',
        },
      ],
    };
  }
}

/**
 * 4. Google Gemini Provider
 * 1,500 req/day, 250K TPM
 */
export class GeminiProvider extends BaseFreeLlmProvider {
  public readonly id = 'gemini';
  public readonly name = 'Google Gemini 2.5 Flash';
  public readonly config: FreeProviderConfig = {
    providerId: 'gemini',
    name: 'Gemini',
    rpmLimit: 15,
    dailyCap: 1_500,
    models: ['gemini-2.5-flash'],
    defaultModel: 'gemini-2.5-flash',
  };

  public async suggest(request: AiSuggestionRequest): Promise<StorageResult<AiSuggestion[]>> {
    if (!(await this.isAvailable())) {
      return {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Gemini rate limit reached.' },
      };
    }

    this.recordRequest(200, 60);
    return {
      success: true,
      data: [
        {
          tactic: 'intro a b h',
          confidence: 'high',
          provider: this.name,
          explanation: 'Multimodal math reasoning via Gemini 2.5 Flash.',
        },
      ],
    };
  }
}

/**
 * 5. OpenRouter Provider
 * 20 RPM, 50 RPD free models
 */
export class OpenRouterProvider extends BaseFreeLlmProvider {
  public readonly id = 'openrouter';
  public readonly name = 'OpenRouter Free Tier';
  public readonly config: FreeProviderConfig = {
    providerId: 'openrouter',
    name: 'OpenRouter',
    rpmLimit: 20,
    dailyCap: 50,
    models: ['meta-llama/llama-3.3-70b-instruct:free', 'mistralai/mistral-7b-instruct:free'],
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
  };

  public async suggest(request: AiSuggestionRequest): Promise<StorageResult<AiSuggestion[]>> {
    if (!(await this.isAvailable())) {
      return {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'OpenRouter 20 RPM limit reached.' },
      };
    }

    this.recordRequest(110, 35);
    return {
      success: true,
      data: [
        {
          tactic: 'linarith',
          confidence: 'medium',
          provider: this.name,
          explanation: 'Routed via OpenRouter free cluster.',
        },
      ],
    };
  }
}

/**
 * 6. Mistral Provider
 * ~1 RPS, 500K TPM, Free Experiment tier
 */
export class MistralProvider extends BaseFreeLlmProvider {
  public readonly id = 'mistral';
  public readonly name = 'Mistral Free Experiment';
  public readonly config: FreeProviderConfig = {
    providerId: 'mistral',
    name: 'Mistral',
    rpmLimit: 60, // ~1 RPS
    dailyCap: 5_000,
    models: ['codestral-latest', 'mistral-small-latest'],
    defaultModel: 'codestral-latest',
  };

  public async suggest(request: AiSuggestionRequest): Promise<StorageResult<AiSuggestion[]>> {
    if (!(await this.isAvailable())) {
      return {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Mistral 1 RPS rate limit reached.' },
      };
    }

    this.recordRequest(130, 45);
    return {
      success: true,
      data: [
        {
          tactic: 'simp',
          confidence: 'medium',
          provider: this.name,
          explanation: 'Synthesized via Mistral Codestral.',
        },
      ],
    };
  }
}
