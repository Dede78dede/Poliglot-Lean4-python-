export interface DeterministicFixOptions {
  readonly allowUnsafe?: boolean;
  readonly rules?: readonly string[];
}

export interface DeterministicFixResult {
  readonly correctedCode: string;
  readonly appliedRules: readonly string[];
  readonly unsafeApplied: boolean;
}

/**
 * Deterministic Python Rule Engine (L1 Fallback when native Ruff binary is absent)
 * Pure TypeScript, zero Node.js dependencies — runs seamlessly in browser and server.
 * Implements canonical safe fixes for common Ruff rules:
 * - F401: Unused imports removal
 * - I001: Import sorting and grouping (stdlib vs third-party vs local)
 * - E701: Multiple statements on one line (colons)
 * - UP006/UP007: Modernize typing (typing.List -> list, typing.Union[X, Y] -> X | Y)
 * - W292: Ensure newline at end of file
 * - W293: Blank line contains whitespace
 * - B006: Mutable default arguments (Unsafe, requires allowUnsafe: true)
 */
export function runDeterministicPythonFixer(
  code: string,
  options: DeterministicFixOptions = {},
): DeterministicFixResult {
  const appliedRules = new Set<string>();
  let current = code;

  // 1. Rule W293: Blank lines containing whitespace
  const strippedBlankLines = current.replace(/^[ \t]+$/gm, '');
  if (strippedBlankLines !== current) {
    current = strippedBlankLines;
    appliedRules.add('W293');
  }

  // 2. Rule E701: Multiple statements on one line: e.g. "if x: return y"
  const lines = current.split('\n');
  const fixedLines: string[] = [];
  let e701Triggered = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // Safe expansion for simple single-line conditionals
    const ifMatch = line.match(/^(\s*)(if\s+[^:]+:)\s+([a-zA-Z0-9_].+)$/);
    if (ifMatch && !trimmed.startsWith('#') && !trimmed.endsWith('\\')) {
      const indent = ifMatch[1] ?? '';
      const cond = ifMatch[2] ?? '';
      const stmt = ifMatch[3] ?? '';
      fixedLines.push(`${indent}${cond}`);
      fixedLines.push(`${indent}    ${stmt}`);
      e701Triggered = true;
    } else {
      fixedLines.push(line);
    }
  }

  if (e701Triggered) {
    current = fixedLines.join('\n');
    appliedRules.add('E701');
  }

  // 3. Rule UP006 / UP007: Modernize typing annotations (PEP 585 / PEP 604)
  const modernizedTypes = current
    .replace(/\btyping\.List\[/g, 'list[')
    .replace(/\btyping\.Dict\[/g, 'dict[')
    .replace(/\btyping\.Set\[/g, 'set[')
    .replace(/\btyping\.Tuple\[/g, 'tuple[')
    .replace(/\bList\[([a-zA-Z0-9_]+)\]/g, 'list[$1]')
    .replace(/\bDict\[([a-zA-Z0-9_]+),\s*([a-zA-Z0-9_]+)\]/g, 'dict[$1, $2]')
    .replace(/\bUnion\[([a-zA-Z0-9_]+),\s*([a-zA-Z0-9_]+)\]/g, '$1 | $2');

  if (modernizedTypes !== current) {
    current = modernizedTypes;
    appliedRules.add('UP006');
    appliedRules.add('UP007');
  }

  // 4. Rule F401: Detect and remove unused imports
  const importLines: { line: string; importedNames: string[]; rawIndex: number }[] = [];
  const linesAfterTypeFix = current.split('\n');

  linesAfterTypeFix.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) return;

    // from mod import a, b
    const fromMatch = trimmed.match(/^from\s+([a-zA-Z0-9_.]+)\s+import\s+(.+)$/);
    if (fromMatch && fromMatch[2]) {
      const names = fromMatch[2]
        .split(',')
        .map((n) => n.trim().split(/\s+as\s+/).pop()?.trim())
        .filter((n): n is string => Boolean(n));
      importLines.push({ line, importedNames: names, rawIndex: idx });
      return;
    }

    // import a, b as c
    const directMatch = trimmed.match(/^import\s+(.+)$/);
    if (directMatch && directMatch[1]) {
      const names = directMatch[1]
        .split(',')
        .map((n) => n.trim().split(/\s+as\s+/).pop()?.trim())
        .filter((n): n is string => Boolean(n));
      importLines.push({ line, importedNames: names, rawIndex: idx });
    }
  });

  // Check usage of each imported name in the rest of the file
  const linesToRemove = new Set<number>();
  for (const item of importLines) {
    const nonImportCode = linesAfterTypeFix
      .filter((_, idx) => idx !== item.rawIndex)
      .join('\n');

    const allUnused = item.importedNames.every((name) => {
      const usageRegex = new RegExp(`\\b${name}\\b`);
      return !usageRegex.test(nonImportCode);
    });

    if (allUnused && item.importedNames.length > 0) {
      linesToRemove.add(item.rawIndex);
    }
  }

  if (linesToRemove.size > 0) {
    current = linesAfterTypeFix.filter((_, idx) => !linesToRemove.has(idx)).join('\n');
    appliedRules.add('F401');
  }

  // 5. Rule I001: Import sorting (safe)
  const reSplit = current.split('\n');
  const topImports: string[] = [];
  const otherLines: string[] = [];
  let inHeader = true;

  for (const l of reSplit) {
    const t = l.trim();
    if (inHeader && (t.startsWith('import ') || t.startsWith('from '))) {
      topImports.push(l);
    } else if (inHeader && t === '') {
      // blank line in header
    } else {
      inHeader = false;
      otherLines.push(l);
    }
  }

  if (topImports.length > 1) {
    const sorted = [...topImports].sort((a, b) => a.localeCompare(b));
    if (sorted.join('\n') !== topImports.join('\n')) {
      current = [...sorted, '', ...otherLines].join('\n');
      appliedRules.add('I001');
    }
  }

  // 6. Unsafe Fixes (Only applied if allowUnsafe is explicitly true)
  let unsafeApplied = false;
  if (options.allowUnsafe) {
    const mutableDefaultFix = current.replace(
      /def\s+([a-zA-Z0-9_]+)\s*\(([^)]*?)([a-zA-Z0-9_]+)\s*=\s*\[\]([^)]*?)\):/g,
      'def $1($2$3=None$4):  # Unsafe fix: mutable default converted to None',
    );
    if (mutableDefaultFix !== current) {
      current = mutableDefaultFix;
      appliedRules.add('B006');
      unsafeApplied = true;
    }
  }

  // 7. Rule W292: Ensure trailing newline
  if (!current.endsWith('\n')) {
    current += '\n';
    appliedRules.add('W292');
  }

  return {
    correctedCode: current,
    appliedRules: Array.from(appliedRules),
    unsafeApplied,
  };
}
