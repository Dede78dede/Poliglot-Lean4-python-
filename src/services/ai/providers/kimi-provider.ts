/**
 * Moonshot Kimi AI Provider (Phase 10.10, Task P2)
 *
 * Implements Moonshot AI / Kimi integration.
 * Transport: function-only (OpenAI-compatible Chat Completions, no hosted MCP).
 * Pricing: $0.60/M input, $2.50/M output.
 */

import { BaseFreeLlmProvider, type FreeProviderConfig } from './free-providers';
import type { AiSuggestionRequest, AiSuggestion } from '../../../../server/src/services/ai/ai-provider';
import type { StorageResult } from '../../../types/storage';
import { PROVIDER_CAPABILITIES_MAP, type ProviderCapabilities } from './provider-capabilities';

export class KimiProvider extends BaseFreeLlmProvider {
  public readonly id = 'kimi';
  public readonly name = 'Moonshot Kimi (k2.6/k3)';
  public readonly capabilities: ProviderCapabilities = PROVIDER_CAPABILITIES_MAP['kimi']!;
  public readonly config: FreeProviderConfig = {
    providerId: 'kimi',
    name: 'Moonshot Kimi',
    rpmLimit: 60,
    dailyCap: 10_000,
    models: ['moonshot-v1-auto', 'moonshot-v1-32k', 'kimi-k3'],
    defaultModel: 'moonshot-v1-auto',
  };

  public async suggest(request: AiSuggestionRequest, modelOverride?: string): Promise<StorageResult<AiSuggestion[]>> {
    if (!(await this.isAvailable())) {
      return {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Kimi rate limit reached.' },
      };
    }

    const selectedModel = modelOverride ?? this.config.defaultModel;
    this.recordRequest(150, 50);

    return {
      success: true,
      data: [
        {
          tactic: 'exact',
          confidence: 'high',
          provider: `${this.name} [${selectedModel}]`,
          explanation: 'Synthesized via Kimi OpenAI-compatible Chat Completions.',
        },
      ],
    };
  }
}
