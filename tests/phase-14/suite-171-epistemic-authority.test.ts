/**
 * Test Suite 171: Epistemic Authority & Single Certifier Verification (Phase 14.9.1 FIX-B)
 *
 * Validates:
 * 171.1: no `verified: true` inside server/src/services/mcp/lean-lsp-mcp-client.ts
 * 171.2: no `verified: true` inside src/services/mcp/lean-lsp-client.ts
 * 171.3: no `kernelSeal: 'SEAL_KERNEL_VERIFIED_TIER5'` in mcp-server.ts without preceding adjudicator call
 * 171.4: the only production file in server/src/ containing both `verified: true` and `SEAL_KERNEL_VERIFIED_TIER5` is hybrid-adjudicator.ts
 * 171.5: ProofOutcome has exactly one 'certified' variant with literal seal 'SEAL_KERNEL_VERIFIED_TIER5'
 * 171.6: synthetic call to lean-lsp-mcp-client with an unconfirmed adjudicator returns kind 'preflight' and no seal
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { LeanLspMcpClient } from '../../server/src/services/mcp/lean-lsp-mcp-client';
import { hybridAdjudicator } from '../../server/src/services/verification/hybrid-adjudicator';

export async function runSuite171(): Promise<void> {
  console.log('Running Suite 171: Epistemic Authority & Single Certifier (6 sub-tests)...');

  const rootDir = process.cwd();

  // 171.1: no `verified: true` inside lean-lsp-mcp-client.ts
  const mcpServerClientPath = path.join(rootDir, 'server/src/services/mcp/lean-lsp-mcp-client.ts');
  const mcpServerClientCode = fs.readFileSync(mcpServerClientPath, 'utf-8');
  assert.ok(
    !/verified:\s*true/.test(mcpServerClientCode),
    'server/src/services/mcp/lean-lsp-mcp-client.ts must not contain verified: true'
  );
  console.log('  ✓ 171.1 no verified: true inside lean-lsp-mcp-client.ts');

  // 171.2: no `verified: true` inside lean-lsp-client.ts
  const mcpBrowserClientPath = path.join(rootDir, 'src/services/mcp/lean-lsp-client.ts');
  const mcpBrowserClientCode = fs.readFileSync(mcpBrowserClientPath, 'utf-8');
  assert.ok(
    !/verified:\s*true/.test(mcpBrowserClientCode),
    'src/services/mcp/lean-lsp-client.ts must not contain verified: true'
  );
  console.log('  ✓ 171.2 no verified: true inside lean-lsp-client.ts');

  // 171.3: no `kernelSeal: 'SEAL_KERNEL_VERIFIED_TIER5'` in mcp-server.ts without preceding adjudicator call
  const mcpServerPath = path.join(rootDir, 'src/services/mcp/mcp-server.ts');
  const mcpServerCode = fs.readFileSync(mcpServerPath, 'utf-8');
  const proposeHandlerMatch = mcpServerCode.match(/polyglot_propose_proof[\s\S]*?activeProposals\.delete[\s\S]*?return\s*\{/);
  assert.ok(proposeHandlerMatch, 'Must find propose_proof commit handler in mcp-server.ts');
  assert.ok(
    proposeHandlerMatch[0].includes('hybridAdjudicator.adjudicate'),
    'Proposal commit handler must invoke hybridAdjudicator.adjudicate'
  );
  assert.ok(
    mcpServerCode.includes("kernelSeal: isCertified ? ('SEAL_KERNEL_VERIFIED_TIER5' as const) : null"),
    'mcp-server.ts must gate kernelSeal strictly behind isCertified check'
  );
  console.log('  ✓ 171.3 no kernelSeal: SEAL_KERNEL_VERIFIED_TIER5 in mcp-server.ts without adjudicator call');

  // 171.4: the only production file in server/src/ containing both `verified: true` and `SEAL_KERNEL_VERIFIED_TIER5` is hybrid-adjudicator.ts
  const serverSrcDir = path.join(rootDir, 'server/src');
  function findTsFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const results: string[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findTsFiles(full));
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.includes('.test.')) {
        results.push(full);
      }
    }
    return results;
  }
  const serverFiles = findTsFiles(serverSrcDir);
  const filesWithBoth = serverFiles.filter((f) => {
    const code = fs.readFileSync(f, 'utf-8');
    return /verified:\s*true/.test(code) && code.includes('SEAL_KERNEL_VERIFIED_TIER5');
  });
  assert.equal(
    filesWithBoth.length,
    1,
    `Only 1 server production file may contain both verified: true and SEAL_KERNEL_VERIFIED_TIER5. Found: ${filesWithBoth.join(', ')}`
  );
  assert.ok(
    filesWithBoth[0].endsWith('hybrid-adjudicator.ts'),
    `The single certifying server file must be hybrid-adjudicator.ts, found ${filesWithBoth[0]}`
  );
  console.log('  ✓ 171.4 the only production file in server/src/ containing both verified: true and SEAL_KERNEL_VERIFIED_TIER5 is hybrid-adjudicator.ts');

  // 171.5: ProofOutcome has exactly one 'certified' variant, literal seal value 'SEAL_KERNEL_VERIFIED_TIER5'
  const proofOutcomeTypePath = path.join(rootDir, 'src/types/proof-outcome.ts');
  const proofOutcomeTypeCode = fs.readFileSync(proofOutcomeTypePath, 'utf-8');
  assert.ok(proofOutcomeTypeCode.includes("readonly kind: 'certified'"), 'ProofOutcome must define kind: certified');
  const certifiedMatches = proofOutcomeTypeCode.match(/kind:\s*'certified'/g);
  assert.equal(certifiedMatches?.length, 1, 'ProofOutcome must have exactly one certified variant');
  assert.ok(
    proofOutcomeTypeCode.includes("readonly seal: 'SEAL_KERNEL_VERIFIED_TIER5'"),
    'ProofOutcome certified variant must hold literal seal SEAL_KERNEL_VERIFIED_TIER5'
  );
  console.log('  ✓ 171.5 ProofOutcome has exactly one certified variant with literal SEAL_KERNEL_VERIFIED_TIER5');

  // 171.6: synthetic call to lean-lsp-mcp-client with an unconfirmed adjudicator returns kind 'preflight' and no seal
  const client = new LeanLspMcpClient({
    serverUrl: 'http://localhost:3000',
    transport: 'stdio',
    timeoutMs: 500,
  });

  const originalAdjudicate = hybridAdjudicator.adjudicate.bind(hybridAdjudicator);
  try {
    // Mock unconfirmed adjudication
    hybridAdjudicator.adjudicate = () => ({
      verdict: 'unconfirmed',
      verified: false,
      seal: null,
      reason: 'Mock unconfirmed consensus',
      axioms: [],
    });

    const res = await client.callTool({
      toolName: 'lean_verify_kernel',
      arguments: { code: 'theorem test_thm : 1 = 1 := by rfl' },
    });

    assert.equal(res.success, true);
    assert.equal(res.toolName, 'lean_verify_kernel');
    const data = res.data as any;
    assert.equal(data.kind, 'preflight', 'Unconfirmed adjudication must map to ProofOutcome.kind = preflight');
    assert.equal(data.seal, undefined, 'Preflight outcome must NOT contain a seal');
    assert.equal(data.reason, 'Mock unconfirmed consensus');
    console.log('  ✓ 171.6 synthetic call to lean-lsp-mcp-client with unconfirmed adjudicator returns kind preflight and no seal');
  } finally {
    hybridAdjudicator.adjudicate = originalAdjudicate;
  }
}

// Vitest integration
if (process.env.VITEST) {
  describe('Suite 171: Epistemic Authority & Single Certifier', () => {
    it('171.1 no verified: true inside lean-lsp-mcp-client.ts', () => {
      const code = fs.readFileSync(path.join(process.cwd(), 'server/src/services/mcp/lean-lsp-mcp-client.ts'), 'utf-8');
      expect(code).not.toMatch(/verified:\s*true/);
    });

    it('171.2 no verified: true inside lean-lsp-client.ts', () => {
      const code = fs.readFileSync(path.join(process.cwd(), 'src/services/mcp/lean-lsp-client.ts'), 'utf-8');
      expect(code).not.toMatch(/verified:\s*true/);
    });

    it('171.3 no kernelSeal in mcp-server.ts without adjudicator call', () => {
      const code = fs.readFileSync(path.join(process.cwd(), 'src/services/mcp/mcp-server.ts'), 'utf-8');
      expect(code).toContain('hybridAdjudicator.adjudicate');
      expect(code).toContain("kernelSeal: isCertified ? ('SEAL_KERNEL_VERIFIED_TIER5' as const) : null");
    });

    it('171.4 only hybrid-adjudicator.ts has both verified: true and SEAL_KERNEL_VERIFIED_TIER5 in server/src', () => {
      const rootDir = process.cwd();
      function findTsFiles(dir: string): string[] {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const results: string[] = [];
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            results.push(...findTsFiles(full));
          } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.includes('.test.')) {
            results.push(full);
          }
        }
        return results;
      }
      const serverFiles = findTsFiles(path.join(rootDir, 'server/src'));
      const filesWithBoth = serverFiles.filter((f) => {
        const code = fs.readFileSync(f, 'utf-8');
        return /verified:\s*true/.test(code) && code.includes('SEAL_KERNEL_VERIFIED_TIER5');
      });
      expect(filesWithBoth.length).toBe(1);
      expect(filesWithBoth[0]).toMatch(/hybrid-adjudicator\.ts$/);
    });

    it('171.5 ProofOutcome has exactly one certified variant with literal seal', () => {
      const code = fs.readFileSync(path.join(process.cwd(), 'src/types/proof-outcome.ts'), 'utf-8');
      const certifiedMatches = code.match(/kind:\s*'certified'/g);
      expect(certifiedMatches?.length).toBe(1);
      expect(code).toContain("readonly seal: 'SEAL_KERNEL_VERIFIED_TIER5'");
    });

    it('171.6 synthetic call with unconfirmed adjudicator returns preflight and no seal', async () => {
      const client = new LeanLspMcpClient({
        serverUrl: 'http://localhost:3000',
        transport: 'stdio',
        timeoutMs: 500,
      });
      const original = hybridAdjudicator.adjudicate.bind(hybridAdjudicator);
      try {
        hybridAdjudicator.adjudicate = () => ({
          verdict: 'unconfirmed',
          verified: false,
          seal: null,
          reason: 'Mock unconfirmed consensus',
          axioms: [],
        });
        const res = await client.callTool({
          toolName: 'lean_verify_kernel',
          arguments: { code: 'theorem test_thm : 1 = 1 := by rfl' },
        });
        expect(res.success).toBe(true);
        const data = res.data as any;
        expect(data.kind).toBe('preflight');
        expect(data.seal).toBeUndefined();
      } finally {
        hybridAdjudicator.adjudicate = original;
      }
    });
  });
}

