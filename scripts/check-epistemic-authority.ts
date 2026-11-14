/**
 * Epistemic Authority Static Checker (Phase 15 Pre-Flight + Consolidated Gate 1)
 *
 * Verifies the single certifying authority invariant codified in ADR-015 / ADR-018:
 * 1. Sole certifying authority: server/src/services/verification/hybrid-adjudicator.ts
 *    is the ONLY file in server/src/ authorized to contain both `verified: true` and `SEAL_KERNEL_VERIFIED_TIER5`.
 * 2. Full codebase sweep (src/ AND server/src/): No production file outside the sole certifier
 *    and authorized type/contract schemas may emit `verified: true` or mint `SEAL_KERNEL_VERIFIED_TIER5`.
 * 3. Client bindings (such as mcp-server.ts) may only pass the seal through if
 *    adjudicator verdict === 'confirmed_valid'.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface EpistemicCheckResult {
  readonly valid: boolean;
  readonly certifyingFiles: string[];
  readonly unauthorizedBridgeFiles: string[];
  readonly scannedFilesCount: number;
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

export function checkEpistemicAuthority(rootDir = process.cwd()): EpistemicCheckResult {
  const serverSrcDir = path.join(rootDir, 'server/src');
  const clientSrcDir = path.join(rootDir, 'src');
  const allowedCertifier = 'server/src/services/verification/hybrid-adjudicator.ts';

  const schemaAllowlist = new Set([
    'src/types/proof-outcome.ts',
    'src/contracts/index.ts',
    'src/types/blueprint.ts',
  ]);

  const strictSecondaryBridges = new Set([
    'server/src/services/autocorrect/axle-repair.ts',
    'server/src/services/leancert/leancert-bridge.ts',
    'server/src/services/provepy/provepy-bridge.ts',
    'server/src/services/pastalean/pastalean-bridge.ts',
    'server/src/services/mcp/lean-lsp-mcp-client.ts',
    'src/services/mcp/lean-lsp-client.ts',
  ]);

  function findSourceFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const results: string[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue;
        results.push(...findSourceFiles(full));
      } else if (
        entry.isFile() &&
        (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
        !entry.name.includes('.test.') &&
        !entry.name.endsWith('.spec.ts')
      ) {
        results.push(full);
      }
    }
    return results;
  }

  const serverFiles = findSourceFiles(serverSrcDir);
  const clientFiles = findSourceFiles(clientSrcDir);
  const allProductionFiles = [...serverFiles, ...clientFiles];

  // Check 1: In server/src, exactly 1 production file contains BOTH verified: true and SEAL_KERNEL_VERIFIED_TIER5
  const filesWithBoth = serverFiles.filter((f) => {
    const code = fs.readFileSync(f, 'utf-8');
    return /verified:\s*true/.test(code) && code.includes('SEAL_KERNEL_VERIFIED_TIER5');
  });

  const certifyingFiles = filesWithBoth.map((f) =>
    path.normalize(path.relative(rootDir, f)).replace(/\\/g, '/')
  );

  // Check 2: Full codebase sweep across BOTH server/src and src/
  const unauthorizedBridgeFiles: string[] = [];
  for (const fullPath of allProductionFiles) {
    const relPath = path.normalize(path.relative(rootDir, fullPath)).replace(/\\/g, '/');
    if (relPath === allowedCertifier || schemaAllowlist.has(relPath)) {
      continue;
    }

    const raw = fs.readFileSync(fullPath, 'utf-8');
    const code = stripComments(raw);

    const hasVerifiedTrue = /verified:\s*true/.test(code);
    const hasUnauthorizedDirectSeal = strictSecondaryBridges.has(relPath) && code.includes('SEAL_KERNEL_VERIFIED_TIER5');
    const mintsKernelSeal =
      /(?:seal|badge|tier|kernelSeal|proofCarried)\s*:\s*['"]SEAL_KERNEL_VERIFIED_TIER5['"]/.test(code) &&
      relPath !== 'src/services/mcp/mcp-server.ts';

    if (hasVerifiedTrue || hasUnauthorizedDirectSeal || mintsKernelSeal) {
      unauthorizedBridgeFiles.push(relPath);
    }
  }

  // Check 3: mcp-server.ts must gate SEAL_KERNEL_VERIFIED_TIER5 strictly behind adjudicator
  const mcpServerPath = path.join(rootDir, 'src/services/mcp/mcp-server.ts');
  if (fs.existsSync(mcpServerPath)) {
    const mcpCode = fs.readFileSync(mcpServerPath, 'utf-8');
    const properlyGated =
      mcpCode.includes('hybridAdjudicator.adjudicate') &&
      mcpCode.includes("kernelSeal: isCertified ? ('SEAL_KERNEL_VERIFIED_TIER5' as const) : null");
    if (!properlyGated && !unauthorizedBridgeFiles.includes('src/services/mcp/mcp-server.ts')) {
      unauthorizedBridgeFiles.push('src/services/mcp/mcp-server.ts');
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
    scannedFilesCount: allProductionFiles.length,
  };
}

if (process.argv[1]?.endsWith('check-epistemic-authority.ts')) {
  console.log('Verifying Epistemic Authority Invariant across full codebase...');
  const result = checkEpistemicAuthority();

  if (result.unauthorizedBridgeFiles.length > 0) {
    console.error(`❌ Epistemic authority violations in: ${result.unauthorizedBridgeFiles.join(', ')}`);
    process.exit(1);
  }

  if (result.certifyingFiles.length !== 1 || !result.certifyingFiles[0].endsWith('hybrid-adjudicator.ts')) {
    console.error(
      `❌ Sole certifying authority must be hybrid-adjudicator.ts. Found: ${result.certifyingFiles.join(', ')}`
    );
    process.exit(1);
  }

  console.log(
    `✅ Epistemic Authority Invariant verified across ${result.scannedFilesCount} production files: Sole certifying authority is hybrid-adjudicator.ts`
  );
  process.exit(0);
}
