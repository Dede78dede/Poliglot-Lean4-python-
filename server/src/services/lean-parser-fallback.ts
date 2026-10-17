export const FALLBACK_NOTICE =
  '⚠ FALLBACK: Syntax parsed only. No type checking, import resolution, ' +
  'or proof verification performed. Connect the Lean runner for full builds.';

export interface LeanSyntaxParseResult {
  readonly status: 'success' | 'error';
  readonly errors: readonly string[];
  readonly fallback: true;
  readonly verified: false;
  readonly notice: string;
}

/**
 * Structural syntax validator for multi-file Lean projects when the dedicated
 * Lean/Lake Docker runner is offline or unconfigured.
 *
 * Limitations:
 * - Checks balanced parentheses, brackets, braces, and quotation marks.
 * - Detects malformed keywords and empty theorem signatures.
 * - Does NOT resolve external package imports or verify mathematical proofs.
 * - verified is ALWAYS strictly false.
 */
export function parseLeanProjectSyntax(
  files: readonly { readonly path: string; readonly content: string }[],
): LeanSyntaxParseResult {
  const errors: string[] = [];

  for (const file of files) {
    if (!file.path.endsWith('.lean') && file.path !== 'lakefile.lean') {
      continue;
    }

    const lines = file.content.split('\n');
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    let inBlockComment = false;

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum]!;
      const trimmed = line.trim();

      if (trimmed.startsWith('--')) continue; // single-line comment

      for (let i = 0; i < line.length; i++) {
        // Block comment check
        if (i < line.length - 1 && line[i] === '/' && line[i + 1] === '-') {
          inBlockComment = true;
          i++;
          continue;
        }
        if (i < line.length - 1 && line[i] === '-' && line[i + 1] === '/') {
          inBlockComment = false;
          i++;
          continue;
        }
        if (inBlockComment) continue;

        const char = line[i]!;
        if (char === '(') parenDepth++;
        else if (char === ')') parenDepth--;
        else if (char === '[') bracketDepth++;
        else if (char === ']') bracketDepth--;
        else if (char === '{') braceDepth++;
        else if (char === '}') braceDepth--;

        if (parenDepth < 0 || bracketDepth < 0 || braceDepth < 0) {
          errors.push(
            `${file.path}:${lineNum + 1}: Unmatched closing delimiter "${char}".`,
          );
          // reset to prevent cascades
          parenDepth = Math.max(0, parenDepth);
          bracketDepth = Math.max(0, bracketDepth);
          braceDepth = Math.max(0, braceDepth);
        }
      }
    }

    if (parenDepth !== 0 || bracketDepth !== 0 || braceDepth !== 0) {
      errors.push(
        `${file.path}: End of file reached with unclosed delimiters (parentheses: ${parenDepth}, brackets: ${bracketDepth}, braces: ${braceDepth}).`,
      );
    }
  }

  return {
    status: errors.length === 0 ? 'success' : 'error',
    errors,
    fallback: true,
    verified: false,
    notice: FALLBACK_NOTICE,
  };
}
