/**
 * Document Symbol Extraction Service (Sprint 11.0.1, Advanced Editing & Outline)
 *
 * Lightweight, zero-dependency symbol parser for Python and Lean 4.
 * Powers Editor Breadcrumbs and OutlinePanel.
 */

export type SymbolKind =
  | 'class'
  | 'function'
  | 'method'
  | 'theorem'
  | 'lemma'
  | 'definition'
  | 'inductive'
  | 'structure'
  | 'axiom'
  | 'instance'
  | 'import';

export interface DocumentSymbol {
  readonly name: string;
  readonly kind: SymbolKind;
  readonly line: number;
  readonly column: number;
  readonly signature?: string;
  readonly children?: readonly DocumentSymbol[];
}

export function extractSymbolsFromCode(
  code: string,
  language: 'python' | 'lean4',
): readonly DocumentSymbol[] {
  if (!code || typeof code !== 'string') return [];
  const lines = code.split('\n');
  const symbols: DocumentSymbol[] = [];

  if (language === 'python') {
    const classRegex = /^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*\((.*?)\))?:/;
    const funcRegex = /^\s*(?:async\s+)?def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*?)\)/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const classMatch = classRegex.exec(line);
      if (classMatch) {
        symbols.push({
          name: classMatch[1]!,
          kind: 'class',
          line: i + 1,
          column: line.indexOf('class') + 1,
          signature: classMatch[2] ? `(${classMatch[2]})` : undefined,
        });
        continue;
      }

      const funcMatch = funcRegex.exec(line);
      if (funcMatch) {
        const isIndented = /^\s{4,}|\t/.test(line);
        symbols.push({
          name: funcMatch[1]!,
          kind: isIndented ? 'method' : 'function',
          line: i + 1,
          column: (funcMatch.index || 0) + 1,
          signature: `(${funcMatch[2] ?? ''})`,
        });
      }
    }
  } else if (language === 'lean4') {
    // Lean 4 keywords
    const leanRegex =
      /^\s*(theorem|lemma|def|inductive|structure|axiom|instance)\s+([a-zA-Z0-9_'.]+)/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const match = leanRegex.exec(line);
      if (match) {
        const rawKind = match[1]!;
        const name = match[2]!;
        let kind: SymbolKind = 'definition';
        if (rawKind === 'theorem') kind = 'theorem';
        else if (rawKind === 'lemma') kind = 'lemma';
        else if (rawKind === 'inductive') kind = 'inductive';
        else if (rawKind === 'structure') kind = 'structure';
        else if (rawKind === 'axiom') kind = 'axiom';
        else if (rawKind === 'instance') kind = 'instance';

        symbols.push({
          name,
          kind,
          line: i + 1,
          column: (match.index || 0) + 1,
          signature: line.trim(),
        });
      }
    }
  }

  return Object.freeze(symbols);
}

export function findEnclosingSymbol(
  symbols: readonly DocumentSymbol[],
  lineNumber: number,
): DocumentSymbol | null {
  if (symbols.length === 0) return null;
  let candidate: DocumentSymbol | null = null;
  for (const sym of symbols) {
    if (sym.line <= lineNumber) {
      if (!candidate || sym.line > candidate.line) {
        candidate = sym;
      }
    }
  }
  return candidate;
}
