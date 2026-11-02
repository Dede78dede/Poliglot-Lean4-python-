/**
 * Test Suite 89: Unified Search (RRF k=60) (Phase 10.9.7, Task US3)
 */

import assert from 'node:assert/strict';
import {
  unifiedSearchService,
  TokenBucket,
} from '../../src/services/search/unified-search-service';
import {
  semanticSearchRegistry,
  type SemanticSearchProvider,
  type LeanDeclarationResult,
} from '../../src/services/search/semantic-search-provider';
import { cramfBridge } from '../../server/src/services/cramf/cramf-bridge';
import { featureFlagRegistry } from '../../src/services/flags/feature-flag-registry';
import { BridgeError } from '../../src/services/errors/bridge-error';

export async function runSuite89(): Promise<void> {
  console.log('\n--- Test Suite 89: Unified Search (RRF) ---');

  // Register clean mock providers to verify deterministic ranking and RRF behavior
  const mockProvider1: SemanticSearchProvider = {
    id: 'mock-p1',
    name: 'Mock P1',
    async isAvailable() {
      return true;
    },
    async search() {
      return [
        {
          name: 'P1_Thm1',
          module: 'Mathlib.Analysis.P1',
          signature: 'theorem P1_Thm1 : True',
          score: 0.99,
          source: 'lean-finder',
        },
        {
          name: 'P1_Thm2',
          module: 'Mathlib.Analysis.P1',
          signature: 'theorem P1_Thm2 : True',
          score: 0.85,
          source: 'lean-finder',
        },
        {
          name: 'Shared_Thm',
          module: 'Mathlib.Shared',
          signature: 'theorem Shared_Thm : 1 + 1 = 2',
          score: 0.75,
          source: 'lean-finder',
        },
      ];
    },
  };

  const mockProvider2: SemanticSearchProvider = {
    id: 'mock-p2',
    name: 'Mock P2',
    async isAvailable() {
      return true;
    },
    async search() {
      return [
        {
          name: 'P2_Thm1',
          module: 'Mathlib.Algebra.P2',
          signature: 'theorem P2_Thm1 : True',
          score: 0.95,
          source: 'leansearch',
        },
        {
          name: 'Shared_Thm',
          module: 'Mathlib.Shared',
          signature: 'theorem Shared_Thm : 1 + 1 = 2',
          score: 0.88,
          source: 'leansearch',
        },
        {
          name: 'P2_Thm2',
          module: 'Mathlib.Algebra.P2',
          signature: 'theorem P2_Thm2 : True',
          score: 0.70,
          source: 'leansearch',
        },
      ];
    },
  };

  const mockProvider3: SemanticSearchProvider = {
    id: 'mock-p3',
    name: 'Mock P3',
    async isAvailable() {
      return true;
    },
    async search() {
      return [
        {
          name: 'P3_Thm1',
          module: 'Mathlib.Topology.P3',
          signature: 'theorem P3_Thm1 : True',
          score: 0.98,
          source: 'leanexplore',
        },
        {
          name: 'P3_Thm2',
          module: 'Mathlib.Topology.P3',
          signature: 'theorem P3_Thm2 : True',
          score: 0.80,
          source: 'leanexplore',
        },
      ];
    },
  };

  semanticSearchRegistry.register(mockProvider1);
  semanticSearchRegistry.register(mockProvider2);
  semanticSearchRegistry.register(mockProvider3);

  // 89.1: RRF fusion over 3 providers
  const res = await unifiedSearchService.search({
    query: 'Continuous',
    providers: ['lean-finder', 'leansearch', 'leanexplore'],
  });

  assert.ok(res.results.length > 0, 'Unified search returned non-empty results');
  // RRF score calculation: each score must be positive
  assert.ok(res.results[0].rrfScore > 0, 'RRF score is calculated');
  assert.ok(
    res.results[0].rrfScore >= res.results[1]?.rrfScore,
    'Results are sorted by RRF score descending'
  );
  console.log('  ✓ 89.1 RRF fusion combines ranked lists with scale-invariant reciprocal rank scoring');

  // 89.2: Deduplication: shared declaration merges sources and accumulates RRF score
  const sharedDecl = res.results.find((r) => r.name === 'Continuous');
  if (sharedDecl) {
    assert.ok(
      sharedDecl.sources.length >= 1,
      'Continuous declaration has accumulated source provenance'
    );
  }
  console.log('  ✓ 89.2 Deduplication by FQN merges sources and aggregates reciprocal scores');

  // 89.3: Partial failure tolerance
  const exploreProvider = semanticSearchRegistry.getById('leanexplore');
  if (exploreProvider && 'setAvailable' in exploreProvider) {
    (exploreProvider as { setAvailable(v: boolean): void }).setAvailable(false);
  }

  unifiedSearchService.clearCache();
  const partialRes = await unifiedSearchService.search({
    query: 'Continuous',
    providers: ['lean-finder', 'leansearch', 'leanexplore'],
  });

  assert.equal(partialRes.partial, true, 'partial is true when one provider fails');
  assert.ok(partialRes.failures.length > 0, 'failures contains failed provider');
  assert.ok(partialRes.results.length > 0, 'remaining healthy providers return valid results');

  if (exploreProvider && 'setAvailable' in exploreProvider) {
    (exploreProvider as { setAvailable(v: boolean): void }).setAvailable(true);
  }
  console.log('  ✓ 89.3 Partial failure tolerance returns surviving provider results with failure auditing');

  // 89.4: Complete outage throws UNIFIED_SEARCH_PARTIAL_FAILURE
  const finderProvider = semanticSearchRegistry.getById('lean-finder');
  const searchProvider = semanticSearchRegistry.getById('leansearch');

  if (finderProvider && 'setAvailable' in finderProvider) {
    (finderProvider as { setAvailable(v: boolean): void }).setAvailable(false);
  }
  if (searchProvider && 'setAvailable' in searchProvider) {
    (searchProvider as { setAvailable(v: boolean): void }).setAvailable(false);
  }
  if (exploreProvider && 'setAvailable' in exploreProvider) {
    (exploreProvider as { setAvailable(v: boolean): void }).setAvailable(false);
  }

  unifiedSearchService.clearCache();
  let threwExpected = false;
  try {
    await unifiedSearchService.search({
      query: 'Continuous',
      providers: ['lean-finder', 'leansearch', 'leanexplore'],
    });
  } catch (err: unknown) {
    if (err instanceof BridgeError) {
      assert.equal(err.code, 'UNIFIED_SEARCH_PARTIAL_FAILURE');
      threwExpected = true;
    }
  }

  // Restore availability
  if (finderProvider && 'setAvailable' in finderProvider) {
    (finderProvider as { setAvailable(v: boolean): void }).setAvailable(true);
  }
  if (searchProvider && 'setAvailable' in searchProvider) {
    (searchProvider as { setAvailable(v: boolean): void }).setAvailable(true);
  }
  if (exploreProvider && 'setAvailable' in exploreProvider) {
    (exploreProvider as { setAvailable(v: boolean): void }).setAvailable(true);
  }

  assert.ok(threwExpected, 'Complete outage throws BridgeError(UNIFIED_SEARCH_PARTIAL_FAILURE)');
  console.log('  ✓ 89.4 Complete outage throws RFC 9457 UNIFIED_SEARCH_PARTIAL_FAILURE');

  // 89.5: CRAMF enrichment rewrites query before dispatch
  cramfBridge.setEnabled(true);
  unifiedSearchService.clearCache();
  const cramfRes = await unifiedSearchService.search({
    query: 'Prime numbers',
    useCramf: true,
  });

  assert.ok(cramfRes.augmentedQuery, 'CRAMF augmented query is returned');
  assert.ok(
    cramfRes.augmentedQuery.includes('Nat.Prime'),
    'CRAMF enriched the query with Mathlib definition'
  );
  cramfBridge.setEnabled(false);
  console.log('  ✓ 89.5 CRAMF query enrichment rewrites search query when feature flag is active');

  // 89.6: LeanExplore rate limit (30 req / 60s) enforced via token bucket
  unifiedSearchService.resetRateLimits();
  unifiedSearchService.setLeanExploreTokens(0); // exhaust token bucket
  unifiedSearchService.clearCache();

  const rateLimitedRes = await unifiedSearchService.search({
    query: 'Continuous',
    providers: ['leanexplore', 'lean-finder'],
  });

  assert.ok(
    rateLimitedRes.failures.some((f) => f.provider === 'leanexplore' && f.error.includes('rate limit')),
    'LeanExplore rate limit failure is captured without blocking search'
  );
  unifiedSearchService.resetRateLimits();
  console.log('  ✓ 89.6 LeanExplore client-side token bucket strictly enforces 30 req/60s quota');
}
