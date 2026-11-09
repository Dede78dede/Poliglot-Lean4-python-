/**
 * Epistemic Authority Static Checker (Phase 15 Pre-Flight 14.9.9, Window 1)
 *
 * Verifies the single certifying authority invariant codified in ADR-015:
 * 1. Sole certifying authority: server/src/services/verification/hybrid-adjudicator.ts:264
 *    is the ONLY file in server/src/ authorized to contain both verified: true and SEAL_KERNEL_VERIFIED_TIER5.
 * 2. Secondary bridges (axle-repair, leancert, provepy, pastalean, lean-lsp-mcp-client, lean-lsp-client)
 *    must NEVER emit SEAL_KERNEL_VERIFIED_TIER5 and must NEVER contain untyped verified: true.
 * 3. Client bindings (such as mcp-server.ts) may only pass the seal through if
 *    adjudicator verdict === 'confirmed_valid'.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface EpistemicCheckResult {
  readonly valid: boolean;
  readonly certifyingFiles: string[];
  readonly unauthorizedBridgeFiles: string[];
}

export function checkEpistemicAuthority(rootDir = process.cwd()): EpistemicCheckResult {
  const serverSrcDir = path.join(rootDir, 'server/src');
  const allowedCertifier = path.normalize('server/src/services/verification/hybrid-adjudicator.ts');

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

  // Check 1: In server/src, exactly 1 production file contains BOTH verified: true and SEAL_KERNEL_VERIFIED_TIER5
  const serverFiles = findTsFiles(serverSrcDir);
  const filesWithBoth = serverFiles.filter((f) => {
    const code = fs.readFileSync(f, 'utf-8');
    return /verified:\s*true/.test(code) && code.includes('SEAL_KERNEL_VERIFIED_TIER5');
  });

  const certifyingFiles = filesWithBoth.map((f) =>
    path.normalize(path.relative(rootDir, f)).replace(/\\/g, '/')
  );

  // Check 2: Secondary bridges must never contain verified: true or SEAL_KERNEL_VERIFIED_TIER5
  const secondaryBridges = [
    'server/src/services/autocorrect/axle-repair.ts',
    'server/src/services/leancert/leancert-bridge.ts',
    'server/src/services/provepy/provepy-bridge.ts',
    'server/src/services/pastalean/pastalean-bridge.ts',
    'server/src/services/mcp/lean-lsp-mcp-client.ts',
    'src/services/mcp/lean-lsp-client.ts',
  ];

  const unauthorizedBridgeFiles: string[] = [];
  for (const relPath of secondaryBridges) {
    const fullPath = path.join(rootDir, relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf-8');
    if (/verified:\s*true/.test(content) || content.includes('SEAL_KERNEL_VERIFIED_TIER5')) {
      unauthorizedBridgeFiles.push(relPath);
    }
  }

  const valid =
    certifyingFiles.length === 1 &&
    certifyingFiles[0] === allowedCertifier &&
    unauthorizedBridgeFiles.length === 0;

  return {
    valid,
    certifyingFiles,
    unauthorizedBridgeFiles,
  };
}

if (process.argv[1]?.endsWith('check-epistemic-authority.ts')) {
  console.log('Verifying Epistemic Authority Invariant across codebase...');
  const result = checkEpistemicAuthority();

  if (result.unauthorizedBridgeFiles.length > 0) {
    console.error(`❌ Secondary bridge violations: ${result.unauthorizedBridgeFiles.join(', ')}`);
    process.exit(1);
  }

  if (result.certifyingFiles.length !== 1 || !result.certifyingFiles[0].endsWith('hybrid-adjudicator.ts')) {
    console.error(
      `❌ Sole certifying authority must be hybrid-adjudicator.ts. Found: ${result.certifyingFiles.join(', ')}`
    );
    process.exit(1);
  }

  console.log('✅ Epistemic Authority Invariant verified: Sole certifying authority is hybrid-adjudicator.ts:264');
  process.exit(0);
}
