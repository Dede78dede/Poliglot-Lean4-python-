/**
 * Test Suite 120: Documentation & Architecture (Phase 11.1, Task D4)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export async function runSuite120(): Promise<void> {
  console.log('\n--- Test Suite 120: Documentation & Architecture ---');

  const root = process.cwd();

  // 120.1: docs/how-to/use-lean-beam.md exists and covers core sections
  const howToPath = path.resolve(root, 'docs/how-to/use-lean-beam.md');
  assert.ok(fs.existsSync(howToPath), 'docs/how-to/use-lean-beam.md must exist');
  const howToContent = fs.readFileSync(howToPath, 'utf-8');
  assert.ok(howToContent.includes('lean_run_at'));
  assert.ok(howToContent.includes('ctx_'));
  assert.ok(howToContent.includes('Pantograph'));
  assert.ok(howToContent.includes('Duper'));
  assert.ok(howToContent.includes('let rec'));
  assert.ok(howToContent.includes('Last verified: 2026-10-29'));
  console.log('  ✓ 120.1 docs/how-to/use-lean-beam.md covers workflows, 79 tools, differences and limitations');

  // 120.2: docs/architecture/lean-beam-integration.md exists
  const archPath = path.resolve(root, 'docs/architecture/lean-beam-integration.md');
  assert.ok(fs.existsSync(archPath), 'docs/architecture/lean-beam-integration.md must exist');
  const archContent = fs.readFileSync(archPath, 'utf-8');
  assert.ok(archContent.includes('MCP 2026-07-28'));
  assert.ok(archContent.includes('SEAL_KERNEL_VERIFIED_TIER5'));
  assert.ok(archContent.includes('ENABLE_LEAN_BEAM'));
  assert.ok(archContent.includes('Last verified: 2026-10-29'));
  console.log('  ✓ 120.2 docs/architecture/lean-beam-integration.md covers architecture diagram and protocol compliance');

  // 120.3: docs/limitations.md updated with beta status, workspace cap, and bundle warning
  const limitPath = path.resolve(root, 'docs/limitations.md');
  assert.ok(fs.existsSync(limitPath), 'docs/limitations.md must exist');
  const limitContent = fs.readFileSync(limitPath, 'utf-8');
  assert.ok(limitContent.includes('leanprover/lean-beam'));
  assert.ok(limitContent.includes('388.09 KB'));
  assert.ok(limitContent.includes('3 active workspaces'));
  assert.ok(limitContent.includes('v4.34.0-rc1'));
  assert.ok(limitContent.includes('Last verified: 2026-10-29'));
  console.log('  ✓ 120.3 docs/limitations.md covers bundle warning, toolchain conflict, and workspace cap');
}
