/**
 * TypeScript-Aware Architecture & Dependency Rule Checker
 *
 * Addresses dependency-cruiser <7.0 TypeScript parser incompatibility with TypeScript 7.x
 * by:
 * 1. Transpiling src/ and server/src/ .ts/.tsx files via esbuild into a temporary ESM tree
 *    so `depcruise` natively analyzes all emitted modules (> 0 modules, never silently 0).
 * 2. Directly analyzing raw TypeScript/TSX import specifiers (including `import type`)
 *    against all rules codified in `.dependency-cruiser.cjs`.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { transformSync } from 'esbuild';

export interface ArchViolation {
  readonly rule: string;
  readonly from: string;
  readonly to: string;
  readonly message: string;
}

const TS_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, acc);
    } else if (TS_EXTENSIONS.some((ext) => entry.name.endsWith(ext)) && !entry.name.endsWith('.d.ts')) {
      acc.push(full);
    }
  }
  return acc;
}

function extractImportSpecifiers(source: string): Array<{ specifier: string; isTypeOnly: boolean }> {
  const results: Array<{ specifier: string; isTypeOnly: boolean }> = [];
  const seen = new Set<string>();
  const importRe = /(?:import|export)\s+(type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  const dynRe = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const reqRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  let m: RegExpExecArray | null;
  while ((m = importRe.exec(source)) !== null) {
    const isTypeOnly = Boolean(m[1]);
    const spec = m[2];
    const key = `${isTypeOnly ? 'T' : 'R'}:${spec}`;
    if (spec && !seen.has(key)) {
      seen.add(key);
      results.push({ specifier: spec, isTypeOnly });
    }
  }
  for (const re of [dynRe, reqRe]) {
    while ((m = re.exec(source)) !== null) {
      const spec = m[1];
      const key = `R:${spec}`;
      if (spec && !seen.has(key)) {
        seen.add(key);
        results.push({ specifier: spec, isTypeOnly: false });
      }
    }
  }
  return results;
}

function resolveImportTarget(
  rootDir: string,
  fromAbsPath: string,
  specifier: string
): { resolvedRel: string; isExternal: boolean } {
  let candidateBase: string | null = null;
  if (specifier.startsWith('@/')) {
    candidateBase = path.join(rootDir, 'src', specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    candidateBase = path.resolve(path.dirname(fromAbsPath), specifier);
  } else {
    return { resolvedRel: specifier, isExternal: true };
  }

  const candidates = [
    candidateBase,
    ...TS_EXTENSIONS.map((ext) => `${candidateBase}${ext}`),
    ...TS_EXTENSIONS.map((ext) => path.join(candidateBase, `index${ext}`)),
  ];

  for (const cand of candidates) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
      return {
        resolvedRel: path.relative(rootDir, cand).replace(/\\/g, '/'),
        isExternal: false,
      };
    }
  }

  return {
    resolvedRel: path.relative(rootDir, candidateBase).replace(/\\/g, '/'),
    isExternal: false,
  };
}

function findCycles(graph: Map<string, string[]>): string[][] {
  const visited = new Set<string>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  const seenSignatures = new Set<string>();

  function dfs(node: string): void {
    visited.add(node);
    onStack.add(node);
    stack.push(node);

    for (const next of graph.get(node) ?? []) {
      if (!graph.has(next)) continue;
      if (!visited.has(next)) {
        dfs(next);
      } else if (onStack.has(next)) {
        const startIdx = stack.indexOf(next);
        const cycle = stack.slice(startIdx).concat(next);
        const sig = [...cycle.slice(0, -1)].sort().join('->');
        if (!seenSignatures.has(sig)) {
          seenSignatures.add(sig);
          cycles.push(cycle);
        }
      }
    }

    stack.pop();
    onStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }
  return cycles;
}

export function runArchitectureCheck(rootDir = process.cwd()): {
  modulesCount: number;
  dependenciesCount: number;
  depcruiseSummary: string;
  violations: ArchViolation[];
} {
  const srcFiles = [
    ...collectSourceFiles(path.join(rootDir, 'src')),
    ...collectSourceFiles(path.join(rootDir, 'server/src')),
  ];

  if (srcFiles.length === 0) {
    throw new Error('Zero source files found in src/ and server/src/.');
  }

  const graph = new Map<string, string[]>();
  const violations: ArchViolation[] = [];
  let dependenciesCount = 0;

  for (const absPath of srcFiles) {
    const fromRel = path.relative(rootDir, absPath).replace(/\\/g, '/');
    const code = fs.readFileSync(absPath, 'utf-8');
    const specifiers = extractImportSpecifiers(code);
    const localTargets: string[] = [];

    for (const { specifier, isTypeOnly } of specifiers) {
      const { resolvedRel, isExternal } = resolveImportTarget(rootDir, absPath, specifier);
      dependenciesCount++;
      if (!isExternal && !isTypeOnly) {
        localTargets.push(resolvedRel);
      }

      // Rule: domain-to-presentation
      if (
        /^(src\/types|src\/services\/verification|server\/src\/services\/verification)/.test(fromRel) &&
        /^(src\/components|src\/shared\/ui)/.test(resolvedRel)
      ) {
        violations.push({
          rule: 'domain-to-presentation',
          from: fromRel,
          to: resolvedRel,
          message: 'Core domain services and types must not import presentation components.',
        });
      }

      // Rule: domain-to-infrastructure
      if (
        /^(src\/types|src\/services\/verification\/verification-formula)/.test(fromRel) &&
        /(^|\/)(express|axios|pg|mongodb)($|\/)/.test(resolvedRel)
      ) {
        violations.push({
          rule: 'domain-to-infrastructure',
          from: fromRel,
          to: resolvedRel,
          message: 'Pure verification domain modules must not import heavy infrastructure libraries.',
        });
      }

      // Rule: epistemic-authority-isolation (runtime imports only; type-only imports erase at compile)
      if (
        !isTypeOnly &&
        !/^(server\/src\/services\/verification\/hybrid-adjudicator|server\/src\/types\/proof-outcome|src\/types\/proof-outcome|src\/contracts|tests\/)/.test(
          fromRel
        ) &&
        /server\/src\/types\/proof-outcome\.ts$/.test(resolvedRel)
      ) {
        violations.push({
          rule: 'epistemic-authority-isolation',
          from: fromRel,
          to: resolvedRel,
          message: 'Only hybrid-adjudicator and proof-outcome types may runtime-import server proof-outcome seals.',
        });
      }

      // Rule: no-tools-in-production
      if (/^(src|server\/src)\//.test(fromRel) && /^tools(\/|$)/.test(resolvedRel)) {
        violations.push({
          rule: 'no-tools-in-production',
          from: fromRel,
          to: resolvedRel,
          message: 'Production and runtime code must never import developer tooling from tools/.',
        });
      }
    }

    graph.set(fromRel, localTargets);
  }

  // Rule: no-circular
  const cycles = findCycles(graph);
  for (const cycle of cycles) {
    violations.push({
      rule: 'no-circular',
      from: cycle[0],
      to: cycle[cycle.length - 1],
      message: `Circular dependency detected: ${cycle.join(' -> ')}`,
    });
  }

  // Also execute dependency-cruiser on transpiled JS staging tree so depcruise itself cruises > 0 modules
  const tmpStage = fs.mkdtempSync(path.join(os.tmpdir(), 'polyglot-depcruise-'));
  let depcruiseSummary = '';
  try {
    for (const absPath of srcFiles) {
      const rel = path.relative(rootDir, absPath);
      const outRel = rel.replace(/\.(ts|tsx|mts|cts)$/, '.mjs');
      const outPath = path.join(tmpStage, outRel);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });

      const raw = fs.readFileSync(absPath, 'utf-8');
      const loader = absPath.endsWith('.tsx')
        ? 'tsx'
        : absPath.endsWith('.ts') || absPath.endsWith('.mts') || absPath.endsWith('.cts')
          ? 'ts'
          : absPath.endsWith('.jsx')
            ? 'jsx'
            : 'js';
      const transformed = transformSync(raw, {
        loader,
        format: 'esm',
        target: 'es2022',
      });
      fs.writeFileSync(outPath, transformed.code, 'utf-8');
    }

    const tmpConfigPath = path.join(tmpStage, '.dependency-cruiser.stage.cjs');
    fs.writeFileSync(
      tmpConfigPath,
      `module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    { name: 'domain-to-presentation', severity: 'error', from: { path: '^(src/types|src/services/verification|server/src/services/verification)' }, to: { path: '^(src/components|src/shared/ui)' } },
    { name: 'domain-to-infrastructure', severity: 'error', from: { path: '^(src/types|src/services/verification/verification-formula)' }, to: { path: '(express|axios|pg|mongodb)' } },
    { name: 'epistemic-authority-isolation', severity: 'error', from: { pathNot: '^(server/src/services/verification/hybrid-adjudicator|server/src/types/proof-outcome|src/types/proof-outcome|src/contracts|tests/)' }, to: { path: 'server/src/types/proof-outcome\\\\.(ts|mjs)$' } },
    { name: 'no-tools-in-production', severity: 'error', from: { path: '^(src|server/src)' }, to: { path: '^tools' } }
  ],
  options: { doNotFollow: { path: 'node_modules' } }
};`,
      'utf-8'
    );

    const depcruiseBin = path.join(rootDir, 'node_modules/.bin/depcruise');
    const out = execFileSync(
      depcruiseBin,
      ['src', 'server/src', '--config', tmpConfigPath],
      { cwd: tmpStage, encoding: 'utf-8', stdio: 'pipe' }
    );
    depcruiseSummary = out.trim();
    const match = /\((\d+)\s+modules,\s+(\d+)\s+dependencies cruised\)/.exec(depcruiseSummary);
    const cruisedModules = match ? Number(match[1]) : 0;
    if (cruisedModules === 0) {
      throw new Error(`depcruise cruised 0 modules (output: ${depcruiseSummary})`);
    }
  } finally {
    fs.rmSync(tmpStage, { recursive: true, force: true });
  }

  return {
    modulesCount: srcFiles.length,
    dependenciesCount,
    depcruiseSummary,
    violations,
  };
}

if (process.argv[1]?.endsWith('arch-check.ts')) {
  const result = runArchitectureCheck(process.cwd());
  if (result.violations.length > 0) {
    console.error(`❌ Architecture check found ${result.violations.length} violation(s):`);
    for (const v of result.violations) {
      console.error(`  [${v.rule}] ${v.from} -> ${v.to}: ${v.message}`);
    }
    process.exit(1);
  }
  console.log(
    `✔ no dependency violations found (${result.modulesCount} TS/TSX modules checked, ${result.dependenciesCount} imports inspected; depcruise: ${result.depcruiseSummary})`
  );
  process.exit(0);
}
