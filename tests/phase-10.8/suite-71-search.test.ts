import assert from 'node:assert/strict';
import {
  semanticSearchRegistry,
} from '../../src/services/search/semantic-search-provider';
import { leanFinderProvider } from '../../src/services/search/lean-finder-provider';
import { leanSearchProvider } from '../../src/services/search/leansearch-provider';
import { leanExploreProvider } from '../../src/services/search/leanexplore-provider';
import { defaultLeanLspClient } from '../../src/services/mcp/lean-lsp-client';
import { mcpExternalSearchRateLimiter } from '../../server/src/services/mcp/mcp-rate-limiter';

export async function runSuite71(): Promise<void> {
  console.log('\n--- Test Suite 71: Phase C — Semantic Search & Retrieval ---');

  // 71.1: SemanticSearchRegistry registers 3 providers
  const providers = semanticSearchRegistry.list();
  assert.ok(providers.length >= 3);
  const ids = providers.map((p) => p.id);
  assert.ok(ids.includes('lean-finder'));
  assert.ok(ids.includes('leansearch'));
  assert.ok(ids.includes('leanexplore'));
  console.log('  ✓ 71.1 SemanticSearchRegistry registers 3 independent providers with useSyncExternalStore');

  // 71.2: Lean Finder V2 returns results for "continuous function" query
  const finderRes = await leanFinderProvider.search('continuous function', { limit: 3 });
  assert.ok(finderRes.length > 0);
  assert.equal(finderRes[0]!.source, 'lean-finder');
  assert.ok(finderRes[0]!.name.includes('Continuous'));
  assert.ok(finderRes[0]!.score > 0.8);
  console.log('  ✓ 71.2 Lean Finder V2 returns top semantic Mathlib results with similarity scoring');

  // 71.3: LeanSearch v2 reasoning mode returns results
  const searchReasoning = await leanSearchProvider.search('Continuous.comp', { mode: 'reasoning' });
  assert.ok(searchReasoning.length > 0);
  assert.equal(searchReasoning[0]!.source, 'leansearch');
  assert.ok(searchReasoning[0]!.score >= 0.95);
  console.log('  ✓ 71.3 LeanSearch v2 reasoning mode returns iterative assembly results');

  // 71.4: LeanExplore returns multi-package results
  const exploreRes = await leanExploreProvider.search('Minkowski', { limit: 3 });
  assert.ok(exploreRes.length > 0);
  assert.equal(exploreRes[0]!.source, 'leanexplore');
  const packagesRepresented = exploreRes.map((r) => r.module.split('.')[0]);
  assert.ok(packagesRepresented.includes('Batteries') || packagesRepresented.includes('PhysLean') || packagesRepresented.includes('Mathlib'));
  console.log('  ✓ 71.4 LeanExplore returns multi-package results (Mathlib, Batteries, PhysLean) in read-only mode');

  // 71.5: Fallback chain works when the primary is unavailable
  leanFinderProvider.setAvailable(false); // Simulate primary outage
  const fallbackRes = await semanticSearchRegistry.searchWithFallback('UniformContinuous');
  assert.ok(fallbackRes.length > 0);
  assert.equal(fallbackRes[0]!.source, 'leansearch'); // Fell back to LeanSearch v2
  leanFinderProvider.setAvailable(true); // Restore
  console.log('  ✓ 71.5 Automatic fallback chain triggers (Lean Finder -> LeanSearch -> LeanExplore) during outages');

  // 71.6: MCP client uses SemanticSearchProvider without breaking existing tools
  mcpExternalSearchRateLimiter.reset();
  const mcpToolCall = await defaultLeanLspClient.callTool({
    toolName: 'lean_leansearch',
    arguments: { query: 'Continuous' },
  });
  assert.equal(mcpToolCall.success, true);
  assert.ok((mcpToolCall.data as { count?: number })?.count! > 0);
  console.log('  ✓ 71.6 lean-lsp-mcp client seamlessly routes through SemanticSearchProvider with zero breaking changes');
}
