export const AI_PROFILES = ['lite', 'standard', 'full'] as const;
export type AiProfile = (typeof AI_PROFILES)[number];

export interface AiProfileConfig {
  readonly profile: AiProfile;
  readonly minRamGb: number;
  readonly minVramGb: number;
  readonly recommendedVramGb: number;
  readonly localModel: 'none' | '7b-class' | 'leanstral-119b';
  readonly description: string;
}

export const AI_PROFILE_CONFIGS: Readonly<Record<AiProfile, AiProfileConfig>> = Object.freeze({
  lite: {
    profile: 'lite',
    minRamGb: 2,
    minVramGb: 0,
    recommendedVramGb: 0,
    localModel: 'none',
    description: 'No local AI. All non-AI features functional. Cloud free APIs optional.',
  },
  standard: {
    profile: 'standard',
    minRamGb: 8,
    minVramGb: 6,
    recommendedVramGb: 8,
    localModel: '7b-class',
    description: '7B-class Q4_K_M (4.5–5.5 GB on disk, 6.2 GB VRAM with 8K KV cache). Fits RTX 3060/4060. Quality below full Leanstral.',
  },
  full: {
    profile: 'full',
    minRamGb: 32,
    minVramGb: 78,
    recommendedVramGb: 80,
    localModel: 'leanstral-119b',
    description: 'Full Leanstral 1.5 119B Q4_K_M (78.5 GB VRAM, 256K context). Requires 4× A100 or NVFP4A16 DGX.',
  },
});
