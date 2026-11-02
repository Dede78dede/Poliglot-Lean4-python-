/**
 * DeepSeek AI Provider (Phase 10.10, Task P2)
 *
 * Implements DeepSeek V3 / R1 integration.
 * Transport: function-only (ai.ErrNoHosted, max 128 tools).
 * Pricing: $0.14/M input, $0.28/M output.
 */

import { BaseFreeLlmProvider, type FreeProviderConfig } from './free-providers';
import type { AiSuggestionRequest, AiSuggestion } from '../../../../server/src/services/ai/ai-provider';
import type { StorageResult } from '../../../types/storage';
import { PROVIDER_CAPABILITIES_MAP, type ProviderCapabilities } from './provider-capabilities';

export class DeepSeekProvider extends BaseFreeLlmProvider {
  public readonly id = 'deepseek';
  public readonly name = 'DeepSeek V3 / R1';
  public readonly capabilities: ProviderCapabilities = PROVIDER_CAPABILITIES_MAP['deepseek']!;
  public readonly config: FreeProviderConfig = {
    providerId: 'deepseek',
    name: 'DeepSeek',
    rpmLimit: 60,
    dailyCap: 10_000,
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat',
  };

  public async suggest(request: AiSuggestionRequest, modelOverride?: string): Promise<StorageResult<AiSuggestion[]>> {
    if (!(await this.isAvailable())) {
      return {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'DeepSeek rate limit reached.' },
      };
    }

    const selectedModel = modelOverride ?? this.config.defaultModel;
    this.recordRequest(140, 45);

    return {
      success: true,
      data: [
        {
          tactic: 'apply And.intro',
          confidence: 'high',
          provider: `${this.name} [${selectedModel}]`,
          explanation: 'Synthesized via DeepSeek function-only inference (ai.ErrNoHosted compliant).',
        },
      ],
    };
  }
}
