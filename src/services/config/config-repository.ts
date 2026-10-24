import { z } from 'zod';

export const ProviderConfigSchema = z.object({
  providerId: z.string().min(1),
  name: z.string().min(1),
  endpoint: z.string().url().optional(),
  defaultModel: z.string().min(1),
  rateLimitRpm: z.number().int().positive().optional(),
  priority: z.number().int().min(1).max(100),
  secretRef: z.string().optional(), // Reference ID to Token Vault, NEVER plaintext key
  enabled: z.boolean().default(true),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export const PolyglotConfigExportSchema = z.object({
  version: z.literal('1.0.0'),
  exportedAt: z.string(),
  checksum: z.string().optional(),
  providers: z.array(ProviderConfigSchema),
  resourceProfile: z.enum(['lite', 'standard', 'full']).default('standard'),
});

export type PolyglotConfigExport = z.infer<typeof PolyglotConfigExportSchema>;

export const DEFAULT_PROVIDER_CONFIGS: readonly ProviderConfig[] = [
  {
    providerId: 'nvidia-nim',
    name: 'NVIDIA NIM',
    endpoint: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    rateLimitRpm: 40,
    priority: 1,
    enabled: true,
  },
  {
    providerId: 'groq',
    name: 'Groq Cloud',
    endpoint: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    rateLimitRpm: 30,
    priority: 2,
    enabled: true,
  },
  {
    providerId: 'cerebras',
    name: 'Cerebras Inference',
    endpoint: 'https://api.cerebras.ai/v1',
    defaultModel: 'llama3.3-70b',
    rateLimitRpm: 30,
    priority: 3,
    enabled: true,
  },
  {
    providerId: 'gemini',
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.5-flash',
    rateLimitRpm: 15,
    priority: 4,
    enabled: true,
  },
  {
    providerId: 'openrouter',
    name: 'OpenRouter Free Tier',
    endpoint: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    rateLimitRpm: 20,
    priority: 5,
    enabled: true,
  },
  {
    providerId: 'mistral',
    name: 'Mistral Free Experiment',
    endpoint: 'https://api.mistral.ai/v1',
    defaultModel: 'codestral-latest',
    rateLimitRpm: 10,
    priority: 6,
    enabled: true,
  },
];

export class ConfigRepository {
  private readonly configs = new Map<string, ProviderConfig>();
  private readonly storageKey = 'polyglot_provider_configs_v1';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              const validated = ProviderConfigSchema.safeParse(item);
              if (validated.success) {
                this.configs.set(validated.data.providerId, validated.data);
              }
            }
          }
        }
      } catch {
        // fallback to defaults
      }
    }

    if (this.configs.size === 0) {
      for (const d of DEFAULT_PROVIDER_CONFIGS) {
        this.configs.set(d.providerId, d);
      }
    }
  }

  private save(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(Array.from(this.configs.values())));
    }
  }

  public listConfigs(): readonly ProviderConfig[] {
    return Array.from(this.configs.values());
  }

  public getConfig(providerId: string): ProviderConfig | undefined {
    return this.configs.get(providerId);
  }

  public setConfig(config: ProviderConfig): void {
    const validated = ProviderConfigSchema.parse(config);
    this.configs.set(validated.providerId, validated);
    this.save();
  }

  /**
   * Exports provider configurations WITHOUT any secrets.
   */
  public exportConfig(resourceProfile: 'lite' | 'standard' | 'full' = 'standard'): PolyglotConfigExport {
    const sanitizedProviders = Array.from(this.configs.values()).map((p) => {
      // Ensure no raw secret key could ever be exported
      const { secretRef, ...rest } = p;
      return {
        ...rest,
        ...(secretRef ? { secretRef } : {}),
      };
    });

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      providers: sanitizedProviders,
      resourceProfile,
    };
  }

  /**
   * Validates and imports a JSON configuration.
   */
  public importConfig(jsonPayload: unknown): { readonly success: boolean; readonly count: number; readonly error?: string } {
    const validation = PolyglotConfigExportSchema.safeParse(jsonPayload);
    if (!validation.success) {
      return {
        success: false,
        count: 0,
        error: `Schema validation failed: ${validation.error.message}`,
      };
    }

    let count = 0;
    for (const p of validation.data.providers) {
      this.configs.set(p.providerId, p);
      count++;
    }
    this.save();
    return { success: true, count };
  }
}

export const configRepository = new ConfigRepository();
