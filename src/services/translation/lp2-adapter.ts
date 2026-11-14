/**
 * LP2Adapter (Phase 12 & Phase 15 Wave 3)
 *
 * Encapsulates bidirectional Python <-> Lean 4 transpilation over a genuine typed pure subset
 * using tokenization and recursive-descent AST parsing/emission.
 *
 * Unsupported imperative or dynamic constructs (e.g. while loops, in-place list mutations,
 * comprehensions, generators, classes, dynamic imports, f-strings) are explicitly detected
 * and reported in structured `diagnostics` and `unsupportedConstructs` warnings instead of
 * being silently dropped.
 *
 * Epistemic Rules:
 * - Feature-flagged: ENABLE_LP2 defaults to false.
 * - Any LP2 translation carries source: 'lp2' and requiresFidelityCheck: true.
 * - Never emits a certifying verification flag or SEAL_KERNEL_VERIFIED_TIER5.
 */

import { featureFlagRegistry } from '../flags/feature-flag-registry';
import { BridgeError } from '../errors/bridge-error';

export interface LP2Diagnostic {
  readonly severity: 'warning' | 'unsupported';
  readonly code: string;
  readonly message: string;
  readonly line?: number;
}

export interface LP2TranslationResult {
  readonly translated: string;
  readonly warnings: readonly string[];
  readonly diagnostics: readonly LP2Diagnostic[];
  readonly unsupportedConstructs: readonly string[];
  readonly source: 'lp2';
  readonly requiresFidelityCheck: true;
}

export const LP2_STANDARD_WARNINGS: readonly string[] = Object.freeze([
  'LP² is a rapid prototyping transpiler; round-trip conversion is lossy.',
  'In-place list mutations are unsupported in Lean 4 immutable functional semantics.',
  'Recursive integer loops may lack Lean 4 termination proofs (decreases clause).',
  'Constructs like generators, comprehensions, bytearrays, and f-strings require @no_transpile.',
]);

// ============================================================================
// Pure Subset Expression AST & Tokenizer
// ============================================================================

type ExprNode =
  | { kind: 'num'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'str'; value: string }
  | { kind: 'ident'; name: string }
  | { kind: 'unary'; op: '-' | '!'; operand: ExprNode }
  | { kind: 'binary'; op: string; left: ExprNode; right: ExprNode }
  | { kind: 'call'; callee: string; args: ExprNode[] }
  | { kind: 'if_expr'; cond: ExprNode; thenBranch: ExprNode; elseBranch: ExprNode };

interface Token {
  type: 'ident' | 'number' | 'string' | 'op' | 'punct';
  value: string;
}

function tokenizeExpression(input: string, mode: 'python' | 'lean'): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Two-char operators
    const two = input.slice(i, i + 2);
    if (
      two === '==' ||
      two === '!=' ||
      two === '≠' ||
      two === '<=' ||
      two === '>=' ||
      two === '&&' ||
      two === '||' ||
      two === '//'
    ) {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }

    if ('+-*/%<>=!≤≥'.includes(ch)) {
      const normalized = ch === '≤' ? '<=' : ch === '≥' ? '>=' : ch === '≠' ? '!=' : ch;
      tokens.push({ type: 'op', value: normalized });
      i++;
      continue;
    }

    if ('(),:[]'.includes(ch)) {
      tokens.push({ type: 'punct', value: ch });
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      while (j < input.length && input[j] !== quote) {
        if (input[j] === '\\') j++;
        j++;
      }
      tokens.push({ type: 'string', value: input.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < input.length && /[0-9.]/.test(input[j])) j++;
      tokens.push({ type: 'number', value: input.slice(i, j) });
      i = j;
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let j = i;
      while (j < input.length && /[a-zA-Z0-9_']/.test(input[j])) j++;
      const word = input.slice(i, j);
      if (mode === 'python' && (word === 'and' || word === 'or' || word === 'not')) {
        tokens.push({ type: 'op', value: word });
      } else {
        tokens.push({ type: 'ident', value: word });
      }
      i = j;
      continue;
    }

    // Fallback single character
    tokens.push({ type: 'punct', value: ch });
    i++;
  }
  return tokens;
}

class ExpressionParser {
  private pos = 0;
  constructor(private readonly tokens: Token[], private readonly mode: 'python' | 'lean') {}

  private peek(offset = 0): Token | undefined {
    return this.tokens[this.pos + offset];
  }

  private consume(): Token | undefined {
    return this.tokens[this.pos++];
  }

  public parse(): ExprNode {
    if (this.tokens.length === 0) {
      return { kind: 'ident', name: this.mode === 'python' ? '()' : 'None' };
    }
    return this.parseConditional();
  }

  private parseConditional(): ExprNode {
    // Lean style: if <cond> then <then> else <else>
    if (this.mode === 'lean' && this.peek()?.type === 'ident' && this.peek()?.value === 'if') {
      this.consume(); // if
      const condTokens: Token[] = [];
      while (this.peek() && !(this.peek()?.type === 'ident' && this.peek()?.value === 'then')) {
        condTokens.push(this.consume()!);
      }
      if (this.peek()?.value === 'then') this.consume();
      const thenTokens: Token[] = [];
      let depth = 0;
      while (this.peek()) {
        const t = this.peek()!;
        if (t.type === 'ident' && t.value === 'if') depth++;
        if (t.type === 'ident' && t.value === 'else') {
          if (depth === 0) break;
          depth--;
        }
        thenTokens.push(this.consume()!);
      }
      if (this.peek()?.value === 'else') this.consume();
      const elseTokens: Token[] = [];
      while (this.peek()) elseTokens.push(this.consume()!);

      return {
        kind: 'if_expr',
        cond: new ExpressionParser(condTokens, this.mode).parse(),
        thenBranch: new ExpressionParser(thenTokens, this.mode).parse(),
        elseBranch: new ExpressionParser(elseTokens, this.mode).parse(),
      };
    }

    const expr = this.parseOr();
    // Python ternary: <then> if <cond> else <else>
    if (this.mode === 'python' && this.peek()?.type === 'ident' && this.peek()?.value === 'if') {
      this.consume(); // if
      const cond = this.parseOr();
      if (this.peek()?.type === 'ident' && this.peek()?.value === 'else') {
        this.consume();
        const elseBranch = this.parseConditional();
        return { kind: 'if_expr', cond, thenBranch: expr, elseBranch };
      }
    }
    return expr;
  }

  private parseOr(): ExprNode {
    let left = this.parseAnd();
    while (this.peek()?.type === 'op' && (this.peek()?.value === 'or' || this.peek()?.value === '||')) {
      this.consume();
      const right = this.parseAnd();
      left = { kind: 'binary', op: 'or', left, right };
    }
    return left;
  }

  private parseAnd(): ExprNode {
    let left = this.parseEq();
    while (this.peek()?.type === 'op' && (this.peek()?.value === 'and' || this.peek()?.value === '&&')) {
      this.consume();
      const right = this.parseEq();
      left = { kind: 'binary', op: 'and', left, right };
    }
    return left;
  }

  private parseEq(): ExprNode {
    let left = this.parseCmp();
    while (
      this.peek()?.type === 'op' &&
      (this.peek()?.value === '==' || this.peek()?.value === '!=' || this.peek()?.value === '=')
    ) {
      const opTok = this.consume()!;
      const op = opTok.value === '=' ? '==' : opTok.value;
      const right = this.parseCmp();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseCmp(): ExprNode {
    let left = this.parseAdd();
    while (
      this.peek()?.type === 'op' &&
      ['<', '<=', '>', '>='].includes(this.peek()!.value)
    ) {
      const op = this.consume()!.value;
      const right = this.parseAdd();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseAdd(): ExprNode {
    let left = this.parseMul();
    while (this.peek()?.type === 'op' && (this.peek()?.value === '+' || this.peek()?.value === '-')) {
      const op = this.consume()!.value;
      const right = this.parseMul();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseMul(): ExprNode {
    let left = this.parseUnary();
    while (
      this.peek()?.type === 'op' &&
      ['*', '/', '//', '%'].includes(this.peek()!.value)
    ) {
      const rawOp = this.consume()!.value;
      const op = rawOp === '//' ? '/' : rawOp;
      const right = this.parseUnary();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }

  private parseUnary(): ExprNode {
    const t = this.peek();
    if (t?.type === 'op' && (t.value === '-' || t.value === '!' || t.value === 'not')) {
      this.consume();
      const operand = this.parseUnary();
      return { kind: 'unary', op: t.value === '-' ? '-' : '!', operand };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ExprNode {
    const t = this.consume();
    if (!t) return { kind: 'ident', name: '_' };

    if (t.type === 'punct' && t.value === '(') {
      // Check Lean parenthesized prefix application `(f x y)` vs parenthesized expr
      const inner = this.parseConditional();
      if (this.mode === 'lean' && inner.kind === 'ident' && this.peek() && this.peek()!.value !== ')') {
        const args: ExprNode[] = [];
        while (this.peek() && !(this.peek()?.type === 'punct' && this.peek()?.value === ')')) {
          args.push(this.parsePrimary());
        }
        if (this.peek()?.value === ')') this.consume();
        return { kind: 'call', callee: inner.name, args };
      }
      if (this.peek()?.value === ')') this.consume();
      return inner;
    }

    if (t.type === 'number') {
      return { kind: 'num', value: t.value };
    }
    if (t.type === 'string') {
      return { kind: 'str', value: t.value };
    }
    if (t.type === 'ident') {
      if (t.value === 'True' || t.value === 'true') return { kind: 'bool', value: true };
      if (t.value === 'False' || t.value === 'false') return { kind: 'bool', value: false };
      if (this.mode === 'python' && this.peek()?.type === 'punct' && this.peek()?.value === '(') {
        this.consume(); // '('
        const args: ExprNode[] = [];
        while (this.peek() && !(this.peek()?.type === 'punct' && this.peek()?.value === ')')) {
          args.push(this.parseConditional());
          if (this.peek()?.type === 'punct' && this.peek()?.value === ',') this.consume();
        }
        if (this.peek()?.value === ')') this.consume();
        return { kind: 'call', callee: t.value, args };
      }
      return { kind: 'ident', name: t.value };
    }

    return { kind: 'ident', name: t.value };
  }
}

function emitExprToLean(node: ExprNode): string {
  switch (node.kind) {
    case 'num':
      return node.value;
    case 'bool':
      return node.value ? 'true' : 'false';
    case 'str':
      return node.value;
    case 'ident':
      return node.name;
    case 'unary': {
      const inner = emitExprToLean(node.operand);
      return node.op === '-' ? `-${inner}` : `!${inner}`;
    }
    case 'binary': {
      const op = node.op === 'and' ? '&&' : node.op === 'or' ? '||' : node.op;
      return `${emitExprToLean(node.left)} ${op} ${emitExprToLean(node.right)}`;
    }
    case 'call':
      return node.args.length === 0
        ? node.callee
        : `(${node.callee} ${node.args.map(emitExprToLean).join(' ')})`;
    case 'if_expr':
      return `if ${emitExprToLean(node.cond)} then ${emitExprToLean(node.thenBranch)} else ${emitExprToLean(node.elseBranch)}`;
  }
}

function emitExprToPython(node: ExprNode): string {
  switch (node.kind) {
    case 'num':
      return node.value;
    case 'bool':
      return node.value ? 'True' : 'False';
    case 'str':
      return node.value;
    case 'ident':
      return node.name;
    case 'unary': {
      const inner = emitExprToPython(node.operand);
      return node.op === '-' ? `-${inner}` : `not ${inner}`;
    }
    case 'binary': {
      const op = node.op === '&&' ? 'and' : node.op === '||' ? 'or' : node.op;
      return `${emitExprToPython(node.left)} ${op} ${emitExprToPython(node.right)}`;
    }
    case 'call':
      return `${node.callee}(${node.args.map(emitExprToPython).join(', ')})`;
    case 'if_expr':
      return `${emitExprToPython(node.thenBranch)} if ${emitExprToPython(node.cond)} else ${emitExprToPython(node.elseBranch)}`;
  }
}

// ============================================================================
// Type Mapping
// ============================================================================

const PY_TO_LEAN_TYPES: Record<string, string> = {
  int: 'Int',
  bool: 'Bool',
  str: 'String',
  float: 'Float',
  None: 'Unit',
};

const LEAN_TO_PY_TYPES: Record<string, string> = {
  Int: 'int',
  Nat: 'int',
  Bool: 'bool',
  String: 'str',
  Float: 'float',
  Unit: 'None',
};

function mapPyTypeToLean(pyType: string | undefined): string {
  if (!pyType) return 'Int';
  const trimmed = pyType.trim();
  if (PY_TO_LEAN_TYPES[trimmed]) return PY_TO_LEAN_TYPES[trimmed];
  const listMatch = /^list\[(.+)\]$/i.exec(trimmed);
  if (listMatch) return `List ${mapPyTypeToLean(listMatch[1])}`;
  return trimmed;
}

function mapLeanTypeToPy(leanType: string | undefined): string {
  if (!leanType) return 'int';
  const trimmed = leanType.trim();
  if (LEAN_TO_PY_TYPES[trimmed]) return LEAN_TO_PY_TYPES[trimmed];
  const listMatch = /^List\s+(.+)$/.exec(trimmed);
  if (listMatch) return `list[${mapLeanTypeToPy(listMatch[1])}]`;
  return trimmed;
}

// ============================================================================
// Python -> Lean Statement Parser
// ============================================================================

interface PyBlockLine {
  lineNum: number;
  indent: number;
  text: string;
}

function parsePyStatementsToLean(
  lines: PyBlockLine[],
  startIdx: number,
  baseIndent: number,
  targetIndent: number,
  diagnostics: LP2Diagnostic[],
  unsupported: string[],
  out: string[]
): number {
  let i = startIdx;
  const pad = ' '.repeat(targetIndent);

  while (i < lines.length) {
    const cur = lines[i];
    if (cur.indent < baseIndent) break;

    const stmt = cur.text;

    // Detect unsupported imperative/dynamic constructs
    if (/^while\b/.test(stmt)) {
      unsupported.push('while_loop');
      diagnostics.push({
        severity: 'unsupported',
        code: 'LP2_UNSUPPORTED_WHILE',
        message: 'while loops cannot be lowered automatically to structurally terminating Lean 4 recursion.',
        line: cur.lineNum,
      });
      out.push(`${pad}-- @lp2_unsupported line ${cur.lineNum}: ${stmt}`);
      i++;
      continue;
    }
    if (/^for\b/.test(stmt)) {
      unsupported.push('for_loop');
      diagnostics.push({
        severity: 'unsupported',
        code: 'LP2_UNSUPPORTED_FOR',
        message: 'Imperative for-loops require manual functional fold/List.map rewrite in Lean 4.',
        line: cur.lineNum,
      });
      out.push(`${pad}-- @lp2_unsupported line ${cur.lineNum}: ${stmt}`);
      i++;
      continue;
    }
    if (/^class\b/.test(stmt)) {
      unsupported.push('class_definition');
      diagnostics.push({
        severity: 'unsupported',
        code: 'LP2_UNSUPPORTED_CLASS',
        message: 'Python classes are outside the pure functional LP2 subset; use Lean structure instead.',
        line: cur.lineNum,
      });
      out.push(`${pad}-- @lp2_unsupported line ${cur.lineNum}: ${stmt}`);
      i++;
      continue;
    }
    if (/\byield\b/.test(stmt)) {
      unsupported.push('generator_yield');
      diagnostics.push({
        severity: 'unsupported',
        code: 'LP2_UNSUPPORTED_GENERATOR',
        message: 'Generators (yield) require @no_transpile and are unsupported in pure LP2.',
        line: cur.lineNum,
      });
      out.push(`${pad}-- @lp2_unsupported line ${cur.lineNum}: ${stmt}`);
      i++;
      continue;
    }
    if (/\.(append|extend|pop|insert|remove)\s*\(/.test(stmt) || /^[a-zA-Z_][a-zA-Z0-9_]*\[[^\]]+\]\s*=/.test(stmt)) {
      unsupported.push('in_place_mutation');
      diagnostics.push({
        severity: 'unsupported',
        code: 'LP2_UNSUPPORTED_LIST_MUTATION',
        message: 'In-place collection mutation violates Lean 4 immutable semantics.',
        line: cur.lineNum,
      });
      out.push(`${pad}-- @lp2_unsupported_mutation line ${cur.lineNum}: ${stmt}`);
      i++;
      continue;
    }
    if (/\[.+\bfor\b.+\bin\b.+\]/.test(stmt)) {
      unsupported.push('comprehension');
      diagnostics.push({
        severity: 'unsupported',
        code: 'LP2_UNSUPPORTED_COMPREHENSION',
        message: 'Comprehensions require @no_transpile in pure LP2 subset.',
        line: cur.lineNum,
      });
      out.push(`${pad}-- @lp2_unsupported line ${cur.lineNum}: ${stmt}`);
      i++;
      continue;
    }
    if (/\bf(['"])/.test(stmt)) {
      unsupported.push('f_string');
      diagnostics.push({
        severity: 'unsupported',
        code: 'LP2_UNSUPPORTED_FSTRING',
        message: 'f-strings require @no_transpile in pure LP2 subset.',
        line: cur.lineNum,
      });
    }

    // if <cond>:
    if (stmt.startsWith('if ') && stmt.endsWith(':')) {
      const condRaw = stmt.slice(3, -1).trim();
      const condExpr = new ExpressionParser(tokenizeExpression(condRaw, 'python'), 'python').parse();
      const thenOut: string[] = [];
      i = parsePyStatementsToLean(lines, i + 1, cur.indent + 1, targetIndent + 2, diagnostics, unsupported, thenOut);

      let elseOut: string[] = [];
      if (i < lines.length && lines[i].indent === cur.indent && lines[i].text.startsWith('elif ')) {
        const elifPseudo: PyBlockLine[] = [
          { ...lines[i], text: `if ${lines[i].text.slice(5)}` },
          ...lines.slice(i + 1),
        ];
        const consumed = parsePyStatementsToLean(elifPseudo, 0, cur.indent, targetIndent + 2, diagnostics, unsupported, elseOut);
        i = i + consumed;
      } else if (i < lines.length && lines[i].indent === cur.indent && lines[i].text === 'else:') {
        i = parsePyStatementsToLean(lines, i + 1, cur.indent + 1, targetIndent + 2, diagnostics, unsupported, elseOut);
      }

      if (thenOut.length === 1 && elseOut.length === 1) {
        out.push(`${pad}if ${emitExprToLean(condExpr)} then ${thenOut[0].trim()} else ${elseOut[0].trim()}`);
      } else {
        out.push(`${pad}if ${emitExprToLean(condExpr)} then`);
        out.push(...thenOut);
        if (elseOut.length > 0) {
          out.push(`${pad}else`);
          out.push(...elseOut);
        } else {
          out.push(`${pad}else ()`);
        }
      }
      continue;
    }

    // return <expr>
    if (stmt.startsWith('return ')) {
      const exprRaw = stmt.slice('return '.length).trim();
      const exprAst = new ExpressionParser(tokenizeExpression(exprRaw, 'python'), 'python').parse();
      out.push(`${pad}${emitExprToLean(exprAst)}`);
      i++;
      continue;
    }
    if (stmt === 'return') {
      out.push(`${pad}()`);
      i++;
      continue;
    }

    // Local let binding: `x = expr` or `x: T = expr`
    const assignMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*:\s*([^=]+))?\s*=\s*(.+)$/.exec(stmt);
    if (assignMatch) {
      const varName = assignMatch[1];
      const annType = assignMatch[2] ? ` : ${mapPyTypeToLean(assignMatch[2])}` : '';
      const valAst = new ExpressionParser(tokenizeExpression(assignMatch[3], 'python'), 'python').parse();
      out.push(`${pad}let ${varName}${annType} := ${emitExprToLean(valAst)}`);
      i++;
      continue;
    }

    // Bare expression or unhandled construct
    diagnostics.push({
      severity: 'warning',
      code: 'LP2_PASSTHROUGH_LINE',
      message: `Unrecognized statement lowered as comment/expression: ${stmt}`,
      line: cur.lineNum,
    });
    const fallbackAst = new ExpressionParser(tokenizeExpression(stmt, 'python'), 'python').parse();
    out.push(`${pad}${emitExprToLean(fallbackAst)}`);
    i++;
  }

  return i;
}

// ============================================================================
// Adapter Class
// ============================================================================

export class LP2Adapter {
  public isEnabled(): boolean {
    return featureFlagRegistry.isEnabled('ENABLE_LP2');
  }

  public async pyToLean(pythonCode: string): Promise<LP2TranslationResult> {
    if (!this.isEnabled()) {
      const err = new BridgeError('FEATURE_DISABLED', `lp2-${Date.now()}`, {
        feature: 'ENABLE_LP2',
        message: 'LP2_DISABLED: ENABLE_LP2 feature flag is disabled',
      });
      (err as any).message = 'LP2_DISABLED: ENABLE_LP2 feature flag is disabled';
      throw err;
    }

    const diagnostics: LP2Diagnostic[] = [];
    const unsupportedConstructs: string[] = [];
    const rawLines = pythonCode.split('\n');
    const blockLines: PyBlockLine[] = [];

    for (let idx = 0; idx < rawLines.length; idx++) {
      const raw = rawLines[idx];
      const trimmed = raw.trim();
      if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
        unsupportedConstructs.push('dynamic_import');
        diagnostics.push({
          severity: 'unsupported',
          code: 'LP2_UNSUPPORTED_IMPORT',
          message: 'Dynamic Python module imports are omitted in standalone Lean 4 definitions.',
          line: idx + 1,
        });
        continue;
      }
      const indent = raw.search(/\S|$/);
      blockLines.push({ lineNum: idx + 1, indent, text: trimmed });
    }

    const leanLines: string[] = [
      '-- Translated by LP² (Typed Pure Subset AST Transpiler)',
      '-- Warning: Definitional fidelity check required before proof verification',
    ];

    let i = 0;
    while (i < blockLines.length) {
      const cur = blockLines[i];
      const defMatch = /^def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?\s*:\s*(.*)$/.exec(cur.text);

      if (defMatch) {
        const fnName = defMatch[1];
        const paramsRaw = defMatch[2].trim();
        const retTypeRaw = defMatch[3]?.trim();
        const inlineBody = defMatch[4]?.trim();

        const paramParts: string[] = [];
        if (paramsRaw.length > 0) {
          for (const p of paramsRaw.split(',')) {
            const pTrim = p.trim();
            if (!pTrim) continue;
            const pMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*:\s*(.+))?$/.exec(pTrim);
            if (pMatch) {
              const pName = pMatch[1];
              if (!pMatch[2]) {
                diagnostics.push({
                  severity: 'warning',
                  code: 'LP2_INFERRED_PARAM_TYPE',
                  message: `Parameter '${pName}' had no Python type annotation; defaulted to Int.`,
                  line: cur.lineNum,
                });
              }
              const leanT = mapPyTypeToLean(pMatch[2]);
              paramParts.push(`(${pName} : ${leanT})`);
            }
          }
        }
        const returnLeanType = mapPyTypeToLean(retTypeRaw);
        const sig = `def ${fnName}${paramParts.length > 0 ? ' ' + paramParts.join(' ') : ''} : ${returnLeanType} :=`;
        leanLines.push(sig);

        if (inlineBody) {
          parsePyStatementsToLean(
            [{ lineNum: cur.lineNum, indent: cur.indent + 4, text: inlineBody }],
            0,
            cur.indent + 1,
            2,
            diagnostics,
            unsupportedConstructs,
            leanLines
          );
          i++;
        } else {
          i = parsePyStatementsToLean(
            blockLines,
            i + 1,
            cur.indent + 1,
            2,
            diagnostics,
            unsupportedConstructs,
            leanLines
          );
        }
        continue;
      }

      // Top-level statement outside def
      i = parsePyStatementsToLean(blockLines, i, cur.indent, 0, diagnostics, unsupportedConstructs, leanLines);
    }

    const dedupUnsupported = Array.from(new Set(unsupportedConstructs));
    const warnings = [
      ...LP2_STANDARD_WARNINGS,
      ...diagnostics.map((d) => `[${d.code}] ${d.message}`),
    ];

    return {
      translated: leanLines.join('\n'),
      warnings,
      diagnostics,
      unsupportedConstructs: dedupUnsupported,
      source: 'lp2',
      requiresFidelityCheck: true,
    };
  }

  public async leanToPy(leanCode: string): Promise<LP2TranslationResult> {
    if (!this.isEnabled()) {
      const err = new BridgeError('FEATURE_DISABLED', `lp2-${Date.now()}`, {
        feature: 'ENABLE_LP2',
        message: 'LP2_DISABLED: ENABLE_LP2 feature flag is disabled',
      });
      (err as any).message = 'LP2_DISABLED: ENABLE_LP2 feature flag is disabled';
      throw err;
    }

    const diagnostics: LP2Diagnostic[] = [];
    const unsupportedConstructs: string[] = [];
    const rawLines = leanCode.split('\n');
    const pyLines: string[] = [
      '# Translated by LP² (Typed Pure Subset AST Transpiler)',
      '# Warning: Definitional fidelity check required before proof verification',
    ];

    let inFunction = false;
    let bodyBuffer: string[] = [];

    const flushBody = () => {
      if (!inFunction || bodyBuffer.length === 0) return;
      for (let bIdx = 0; bIdx < bodyBuffer.length; bIdx++) {
        const line = bodyBuffer[bIdx].trim();
        if (!line) continue;
        if (line.startsWith('let ')) {
          const letMatch = /^let\s+([a-zA-Z_][a-zA-Z0-9_]*)(?:\s*:\s*([^:=]+))?\s*:=\s*(.+)$/.exec(line);
          if (letMatch) {
            const varName = letMatch[1];
            const pyType = letMatch[2] ? `: ${mapLeanTypeToPy(letMatch[2])}` : '';
            const expr = new ExpressionParser(tokenizeExpression(letMatch[3], 'lean'), 'lean').parse();
            pyLines.push(`    ${varName}${pyType} = ${emitExprToPython(expr)}`);
            continue;
          }
        }
        const expr = new ExpressionParser(tokenizeExpression(line, 'lean'), 'lean').parse();
        const isLast = bIdx === bodyBuffer.length - 1;
        pyLines.push(`    ${isLast ? 'return ' : ''}${emitExprToPython(expr)}`);
      }
      bodyBuffer = [];
      inFunction = false;
    };

    for (let idx = 0; idx < rawLines.length; idx++) {
      const trimmed = rawLines[idx].trim();
      if (!trimmed || trimmed.startsWith('--')) continue;

      if (/^(theorem|lemma|inductive|mutual|axiom)\b/.test(trimmed) || /\b(sorry|by|do)\b/.test(trimmed)) {
        unsupportedConstructs.push('lean_proof_or_monadic_construct');
        diagnostics.push({
          severity: 'unsupported',
          code: 'LP2_UNSUPPORTED_LEAN_CONSTRUCT',
          message: 'Tactic proofs, axioms, inductive declarations, and do-notation cannot execute directly in Python.',
          line: idx + 1,
        });
        pyLines.push(`# @lp2_unsupported line ${idx + 1}: ${trimmed}`);
        continue;
      }

      const defMatch = /^def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*((?:\([^)]+\)\s*)*):\s*([^:=]+)\s*:=(.*)$/.exec(trimmed);
      if (defMatch) {
        flushBody();
        const fnName = defMatch[1];
        const paramsChunk = defMatch[2].trim();
        const retType = mapLeanTypeToPy(defMatch[3]);
        const inlineBody = defMatch[4].trim();

        const pyParams: string[] = [];
        const paramRegex = /\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^)]+)\)/g;
        let pm: RegExpExecArray | null;
        while ((pm = paramRegex.exec(paramsChunk)) !== null) {
          pyParams.push(`${pm[1]}: ${mapLeanTypeToPy(pm[2])}`);
        }

        pyLines.push(`def ${fnName}(${pyParams.join(', ')}) -> ${retType}:`);
        inFunction = true;
        if (inlineBody.length > 0) {
          bodyBuffer.push(inlineBody);
        }
        continue;
      }

      if (inFunction) {
        bodyBuffer.push(trimmed);
      } else {
        const expr = new ExpressionParser(tokenizeExpression(trimmed, 'lean'), 'lean').parse();
        pyLines.push(emitExprToPython(expr));
      }
    }

    flushBody();

    const dedupUnsupported = Array.from(new Set(unsupportedConstructs));
    const warnings = [
      ...LP2_STANDARD_WARNINGS,
      ...diagnostics.map((d) => `[${d.code}] ${d.message}`),
    ];

    return {
      translated: pyLines.join('\n'),
      warnings,
      diagnostics,
      unsupportedConstructs: dedupUnsupported,
      source: 'lp2',
      requiresFidelityCheck: true,
    };
  }
}

export const lp2Adapter = new LP2Adapter();
