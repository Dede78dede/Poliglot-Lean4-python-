/**
 * Semantic Search Provider Registry for Lean 4 & Mathlib
 *
 * Implements:
 * - Strategy pattern for multi-provider semantic search
 * - External store bridged via useSyncExternalStore
 * - Default provider: Lean Finder V2
 * - Fallback chain: Lean Finder V2 -> LeanSearch v2 -> LeanExplore
 * - Returns 503 SEARCH_UNAVAILABLE if all providers are down
 */

export interface LeanDeclarationResult {
  readonly name: string;
  readonly module: string;
  readonly signature: string;
  readonly docstring?: string;
  readonly score: number;
  readonly source: 'lean-finder' | 'leansearch' | 'leanexplore';
}

export interface SemanticSearchProvider {
  readonly id: string;
  readonly name: string;
  search(
    query: string,
    options?: { limit?: number; mode?: 'standard' | 'reasoning' }
  ): Promise<readonly LeanDeclarationResult[]>;
  isAvailable(): Promise<boolean>;
}

import { ExternalStoreBase } from '../stores/external-store-base';

export class SemanticSearchRegistry extends ExternalStoreBase<readonly SemanticSearchProvider[]> {
  private readonly providers = new Map<string, SemanticSearchProvider>();

  constructor() {
    super({ id: 'semanticSearchRegistry', multiTabSync: true });
  }

  public register(provider: SemanticSearchProvider): { dispose(): void } {
    this.providers.set(provider.id, provider);
    this.notify();

    return {
      dispose: () => {
        this.providers.delete(provider.id);
        this.notify();
      },
    };
  }

  public list(): readonly SemanticSearchProvider[] {
    return this.getSnapshot();
  }

  public getById(id: string): SemanticSearchProvider | undefined {
    return this.providers.get(id);
  }

  protected computeSnapshot(): readonly SemanticSearchProvider[] {
    return Object.freeze(Array.from(this.providers.values()));
  }

  /**
   * Searches Mathlib declarations with automatic fallback chain:
   * Lean Finder V2 -> LeanSearch v2 -> LeanExplore
   */
  public async searchWithFallback(
    query: string,
    options?: { limit?: number; mode?: 'standard' | 'reasoning' }
  ): Promise<readonly LeanDeclarationResult[]> {
    const fallbackChain = ['lean-finder', 'leansearch', 'leanexplore'];
    const errors: string[] = [];

    for (const providerId of fallbackChain) {
      const provider = this.providers.get(providerId);
      if (!provider) continue;

      try {
        const available = await provider.isAvailable();
        if (available) {
          const results = await provider.search(query, options);
          if (results.length > 0) {
            return results;
          }
        }
      } catch (err) {
        errors.push(`${providerId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Try any other registered providers
    for (const [id, provider] of this.providers.entries()) {
      if (fallbackChain.includes(id)) continue;
      try {
        if (await provider.isAvailable()) {
          const results = await provider.search(query, options);
          if (results.length > 0) return results;
        }
      } catch (err) {
        errors.push(`${id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    throw new Error(`503 SEARCH_UNAVAILABLE: All semantic search providers failed. (${errors.join('; ')})`);
  }
}

export const semanticSearchRegistry = new SemanticSearchRegistry();
