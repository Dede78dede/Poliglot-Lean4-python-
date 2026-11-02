/**
 * Unified Search Service (Phase 10.9.7, Task US1)
 *
 * Implements Reciprocal Rank Fusion (RRF k=60, Cormack et al. SIGIR 2009)
 * combining results across Lean Finder V2, LeanSearch v2, and LeanExplore.
 *
 * Features:
 * - Strategy pattern querying heterogeneous search engines
 * - RRF score fusion with scale-independent normalization
 * - Deduplication by fully-qualified declaration name (FQN)
 * - Partial failure tolerance with explicit failure auditing
 * - LeanExplore 30 req / 60s client-side token bucket rate limiting
 * - Optional CRAMF query augmentation when ENABLE_CRAMF is active
 * - Tab-local ExternalStoreBase reactivity (multiTabSync: false)
 * - In-memory cache with 30-minute TTL
 */

import { ExternalStoreBase } from '../stores/external-store-base';
import { BridgeError } from '../errors/bridge-error';
import { validateProofSearchQuery } from '../proof/proof-search-validator';
import { createLogger, StructuredLogger } from '../logging/logger';
import { featureFlagRegistry } from '../flags/feature-flag-registry';
import { semanticSearchRegistry, type LeanDeclarationResult } from './semantic-search-provider';
import './lean-finder-provider';
import './leansearch-provider';
import './leanexplore-provider';
import { cramfBridge } from '../../../server/src/services/cramf/cramf-bridge';

export interface UnifiedSearchQuery {
  readonly query: string;
  readonly limit?: number;               // default 10, max 50
  readonly packages?: readonly string[];  // LeanExplore package filter
  readonly mode?: 'standard' | 'reasoning'; // LeanSearch mode
  readonly useCramf?: boolean;           // CRAMF query enrichment (if ENABLE_CRAMF)
  readonly providers?: readonly ('lean-finder' | 'leansearch' | 'leanexplore')[];
  readonly correlationId?: string;
}

export interface UnifiedSearchSource {
  readonly provider: 'lean-finder' | 'leansearch' | 'leanexplore';
  readonly rank: number;
  readonly originalScore: number;
}

export interface UnifiedSearchResult {
  readonly fqn: string;                  // deduplication key
  readonly name: string;
  readonly module: string;
  readonly signature: string;
  readonly docstring?: string;
  readonly rrfScore: number;
  readonly sources: readonly UnifiedSearchSource[];
}

export interface UnifiedSearchResultWithFailures {
  readonly results: readonly UnifiedSearchResult[];
  readonly failures: readonly {
    readonly provider: 'lean-finder' | 'leansearch' | 'leanexplore';
    readonly error: string;
  }[];
  readonly partial: boolean;
  readonly augmentedQuery?: string;
}

export class TokenBucket {
  private tokens: number;
  private readonly capacity: number;
  private readonly refillRatePerMs: number;
  private lastRefill: number;

  constructor(capacity = 30, windowMs = 60_000) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRatePerMs = capacity / windowMs;
    this.lastRefill = Date.now();
  }

  public tryConsume(tokens = 1): boolean {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  public setTokens(tokens: number): void {
    this.tokens = tokens;
    this.lastRefill = Date.now();
  }

  public reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRatePerMs);
    this.lastRefill = now;
  }
}

interface CacheEntry {
  readonly result: UnifiedSearchResultWithFailures;
  readonly timestamp: number;
}

export class UnifiedSearchService extends ExternalStoreBase<UnifiedSearchResultWithFailures | null> {
  private static readonly RRF_K = 60;
  private static readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
  private readonly logger = createLogger('UnifiedSearchService');
  private readonly leanExploreBucket = new TokenBucket(30, 60_000);
  private readonly cache = new Map<string, CacheEntry>();

  constructor() {
    super({ id: 'unifiedSearchService', multiTabSync: false });
  }

  protected computeSnapshot(): UnifiedSearchResultWithFailures | null {
    return null;
  }

  public resetRateLimits(): void {
    this.leanExploreBucket.reset();
  }

  public setLeanExploreTokens(tokens: number): void {
    this.leanExploreBucket.setTokens(tokens);
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public async search(searchQuery: UnifiedSearchQuery): Promise<UnifiedSearchResultWithFailures> {
    const correlationId = searchQuery.correlationId ?? StructuredLogger.generateCorrelationId();
    this.logger.info(`Initiating unified search for query: "${searchQuery.query}"`, correlationId);

    // 1. Feature Flag Check
    const isEnabled = featureFlagRegistry.isEnabled('ENABLE_UNIFIED_SEARCH');
    if (!isEnabled) {
      this.logger.warn('Unified search requested while ENABLE_UNIFIED_SEARCH is disabled', correlationId);
    }

    // 2. Query Validation and Sanitization
    const validation = validateProofSearchQuery(searchQuery.query);
    if (!validation.valid) {
      this.logger.warn(`Search query validation failed: ${validation.message}`, correlationId);
      throw new BridgeError('UNIFIED_SEARCH_PARTIAL_FAILURE', correlationId, {
        errorCode: validation.errorCode,
        message: validation.message,
      });
    }

    // 3. CRAMF Query Enrichment
    let effectiveQuery = searchQuery.query;
    let augmentedQuery: string | undefined;

    const cramfEnabled =
      featureFlagRegistry.isEnabled('ENABLE_CRAMF') ||
      cramfBridge.isEnabled() ||
      searchQuery.useCramf === true;

    if (searchQuery.useCramf && cramfEnabled) {
      try {
        const cramfResult = await cramfBridge.augmentLeanFlow(searchQuery.query);
        if (cramfResult.enabled && cramfResult.augmentedQuery) {
          effectiveQuery = cramfResult.augmentedQuery;
          augmentedQuery = cramfResult.augmentedQuery;
          this.logger.info(`CRAMF query enriched successfully: "${effectiveQuery}"`, correlationId);
        }
      } catch (err) {
        this.logger.warn('CRAMF augmentation failed, proceeding with raw query', correlationId, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // 4. Cache Check
    const requestedProviders = searchQuery.providers ?? ['lean-finder', 'leansearch', 'leanexplore'];
    const cacheKey = `${effectiveQuery}:${searchQuery.mode ?? 'standard'}:${(searchQuery.packages ?? []).join(',')}:${requestedProviders.join(',')}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < UnifiedSearchService.CACHE_TTL_MS) {
      this.logger.info('Returning cached unified search result', correlationId, { cacheKey });
      this.notify();
      return cached.result;
    }

    // 5. Query Active Providers
    const failures: { provider: 'lean-finder' | 'leansearch' | 'leanexplore'; error: string }[] = [];
    const providerResults: { provider: 'lean-finder' | 'leansearch' | 'leanexplore'; results: readonly LeanDeclarationResult[] }[] = [];

    const providerPromises = requestedProviders.map(async (providerId) => {
      // LeanExplore Rate Limiting
      if (providerId === 'leanexplore') {
        const hasToken = this.leanExploreBucket.tryConsume(1);
        if (!hasToken) {
          failures.push({
            provider: 'leanexplore',
            error: 'LeanExplore rate limit (30 requests/60s) reached.',
          });
          return;
        }
      }

      const provider = semanticSearchRegistry.getById(providerId);
      if (!provider) {
        failures.push({
          provider: providerId,
          error: `Provider ${providerId} is not registered in SemanticSearchRegistry.`,
        });
        return;
      }

      try {
        const available = await provider.isAvailable();
        if (!available) {
          failures.push({
            provider: providerId,
            error: `Provider ${providerId} is currently unavailable.`,
          });
          return;
        }

        const res = await provider.search(effectiveQuery, {
          limit: searchQuery.limit ?? 10,
          mode: searchQuery.mode,
        });
        providerResults.push({ provider: providerId, results: res });
      } catch (err) {
        failures.push({
          provider: providerId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });

    await Promise.all(providerPromises);

    // 6. Check for Complete Outage
    if (providerResults.length === 0 && requestedProviders.length > 0) {
      this.logger.error('All search providers failed during unified search', correlationId, {
        failures,
      });
      throw new BridgeError('UNIFIED_SEARCH_PARTIAL_FAILURE', correlationId, {
        failures,
        query: searchQuery.query,
      });
    }

    // 7. Reciprocal Rank Fusion (RRF with k = 60) & FQN Deduplication
    const fqnMap = new Map<string, {
      fqn: string;
      name: string;
      module: string;
      signature: string;
      docstring?: string;
      rrfScore: number;
      sources: UnifiedSearchSource[];
    }>();

    for (const { provider, results } of providerResults) {
      results.forEach((item, index) => {
        const rank = index + 1; // 1-indexed rank
        const rrfContribution = 1 / (UnifiedSearchService.RRF_K + rank);
        
        // Canonical FQN: prefer module.name if name does not already include module
        const fqn = item.name.includes('.') ? item.name : `${item.module}.${item.name}`;

        const existing = fqnMap.get(fqn);
        if (existing) {
          existing.rrfScore += rrfContribution;
          existing.sources.push({
            provider,
            rank,
            originalScore: item.score,
          });
          if (!existing.docstring && item.docstring) {
            existing.docstring = item.docstring;
          }
        } else {
          fqnMap.set(fqn, {
            fqn,
            name: item.name,
            module: item.module,
            signature: item.signature,
            docstring: item.docstring,
            rrfScore: rrfContribution,
            sources: [
              {
                provider,
                rank,
                originalScore: item.score,
              },
            ],
          });
        }
      });
    }

    // 8. Sort and Slice Results
    const limit = Math.min(Math.max(searchQuery.limit ?? 10, 1), 50);
    const sortedResults: UnifiedSearchResult[] = Array.from(fqnMap.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, limit)
      .map((item) => ({
        fqn: item.fqn,
        name: item.name,
        module: item.module,
        signature: item.signature,
        docstring: item.docstring,
        rrfScore: item.rrfScore,
        sources: Object.freeze(item.sources),
      }));

    const response: UnifiedSearchResultWithFailures = {
      results: Object.freeze(sortedResults),
      failures: Object.freeze(failures),
      partial: failures.length > 0 && sortedResults.length > 0,
      augmentedQuery,
    };

    // Store in cache
    this.cache.set(cacheKey, {
      result: response,
      timestamp: Date.now(),
    });

    this.notify();
    return response;
  }
}

export const unifiedSearchService = new UnifiedSearchService();
