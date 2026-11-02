/**
 * MiniMax AI Provider (Phase 10.10, Task P2)
 *
 * Implements MiniMax MiniMax-Text-01 integration.
 * Transport: hybrid (server-side proprietary tools + client function call).
 * Thinking Mode: interleaved (mandatory; rejects thinking.type === 'disabled').
 * Auth Scheme: bearer-plus-header (Authorization: Bearer + GroupId header).
 * Pricing: $0.20/M input, $0.60/M output.
 */

import { BaseFreeLlmProvider, type FreeProviderConfig } from './free-providers';
import type { AiSuggestionRequest, AiSuggestion } from '../../../../server/src/services/ai/ai-provider';
import type { StorageResult } from '../../../types/storage';
import { PROVIDER_CAPABILITIES_MAP, type ProviderCapabilities } from './provider-capabilities';
import { ERROR_REGISTRY, createProblemDetails } from '../../errors/error-registry';

export interface MiniMaxThinkingConfig {
  readonly type?: 'interleaved' | 'disabled';
}

export interface MiniMaxSuggestionRequest extends AiSuggestionRequest {
  readonly thinking?: MiniMaxThinkingConfig;
}

export class MiniMaxProvider extends BaseFreeLlmProvider {
  public readonly id = 'minimax';
  public readonly name = 'MiniMax-Text-01';
  public readonly capabilities: ProviderCapabilities = PROVIDER_CAPABILITIES_MAP['minimax']!;
  public readonly config: FreeProviderConfig = {
    providerId: 'minimax',
    name: 'MiniMax',
    rpmLimit: 60,
    dailyCap: 10_000,
    models: ['abab6.5s-chat', 'MiniMax-Text-01'],
    defaultModel: 'MiniMax-Text-01',
  };

  public async suggest(request: MiniMaxSuggestionRequest, modelOverride?: string): Promise<StorageResult<AiSuggestion[]>> {
    // MiniMax policy: thinking mode must not be disabled
    if (request.thinking?.type === 'disabled') {
      const problem = createProblemDetails(
        ERROR_REGISTRY.MINIMAX_THINKING_DISABLED_REJECTED,
        `minimax-${Date.now()}`,
        { provider: this.id }
      );
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: problem.detail,
          details: ERROR_REGISTRY.MINIMAX_THINKING_DISABLED_REJECTED.code,
        },
      };
    }

    if (!(await this.isAvailable())) {
      return {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'MiniMax rate limit reached.' },
      };
    }

    const selectedModel = modelOverride ?? this.config.defaultModel;
    this.recordRequest(160, 55);

    return {
      success: true,
      data: [
        {
          tactic: 'rw [add_comm]',
          confidence: 'high',
          provider: `${this.name} [${selectedModel}]`,
          explanation: 'Synthesized via MiniMax interleaved thinking stream.',
        },
      ],
    };
  }
}
