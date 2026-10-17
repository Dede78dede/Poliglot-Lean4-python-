import type {
  WhenASTNode,
  WhenBinaryOperator,
} from '../../types/navigation';

export type TokenType =
  | 'IDENT'
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'REGEX'
  | 'NOT'
  | 'AND'
  | 'OR'
  | 'EQ'
  | 'NEQ'
  | 'LT'
  | 'LTE'
  | 'GT'
  | 'GTE'
  | 'MATCH'
  | 'IN'
  | 'NOT_IN'
  | 'LPAREN'
  | 'RPAREN'
  | 'EOF';

export interface Token {
  readonly type: TokenType;
  readonly value: string;
}

export class WhenTokenizer {
  private pos = 0;
  private readonly src: string;

  constructor(src: string) {
    this.src = src.trim();
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.pos < this.src.length) {
      const ch = this.src[this.pos];

      if (/\s/.test(ch)) {
        this.pos++;
        continue;
      }

      if (ch === '(') {
        tokens.push({ type: 'LPAREN', value: '(' });
        this.pos++;
        continue;
      }

      if (ch === ')') {
        tokens.push({ type: 'RPAREN', value: ')' });
        this.pos++;
        continue;
      }

      if (this.matchTwoChar('&', '&', 'AND', '&&', tokens)) continue;
      if (this.matchTwoChar('|', '|', 'OR', '||', tokens)) continue;
      if (this.matchTwoChar('=', '=', 'EQ', '==', tokens)) continue;
      if (this.matchTwoChar('!', '=', 'NEQ', '!=', tokens)) continue;
      if (this.matchTwoChar('=', '~', 'MATCH', '=~', tokens)) continue;
      if (this.matchTwoChar('<', '=', 'LTE', '<=', tokens)) continue;
      if (this.matchTwoChar('>', '=', 'GTE', '>=', tokens)) continue;

      if (ch === '<') {
        tokens.push({ type: 'LT', value: '<' });
        this.pos++;
        continue;
      }

      if (ch === '>') {
        tokens.push({ type: 'GT', value: '>' });
        this.pos++;
        continue;
      }

      if (ch === '!') {
        tokens.push({ type: 'NOT', value: '!' });
        this.pos++;
        continue;
      }

      if (ch === "'" || ch === '"') {
        tokens.push(this.tokenizeString(ch));
        continue;
      }

      if (ch === '/' && tokens.length > 0 && tokens[tokens.length - 1].type === 'MATCH') {
        tokens.push(this.tokenizeRegex());
        continue;
      }

      if (/[0-9]/.test(ch)) {
        tokens.push(this.tokenizeNumber());
        continue;
      }

      if (/[a-zA-Z_]/.test(ch)) {
        tokens.push(this.tokenizeIdentifierOrKeyword());
        continue;
      }

      this.pos++;
    }

    tokens.push({ type: 'EOF', value: '' });
    return tokens;
  }

  private matchTwoChar(c1: string, c2: string, type: TokenType, val: string, tokens: Token[]): boolean {
    if (this.src[this.pos] === c1 && this.src[this.pos + 1] === c2) {
      tokens.push({ type, value: val });
      this.pos += 2;
      return true;
    }
    return false;
  }

  private tokenizeString(quote: string): Token {
    this.pos++;
    let str = '';
    while (this.pos < this.src.length && this.src[this.pos] !== quote) {
      if (this.src[this.pos] === '\\') {
        this.pos++;
        str += this.src[this.pos] || '';
      } else {
        str += this.src[this.pos];
      }
      this.pos++;
    }
    this.pos++;
    return { type: 'STRING', value: str };
  }

  private tokenizeRegex(): Token {
    this.pos++;
    let pattern = '';
    while (this.pos < this.src.length && this.src[this.pos] !== '/') {
      if (this.src[this.pos] === '\\') {
        pattern += '\\' + (this.src[this.pos + 1] || '');
        this.pos += 2;
      } else {
        pattern += this.src[this.pos];
        this.pos++;
      }
    }
    this.pos++;
    let flags = '';
    while (this.pos < this.src.length && /[imsux]/.test(this.src[this.pos])) {
      flags += this.src[this.pos];
      this.pos++;
    }
    return { type: 'REGEX', value: `/${pattern}/${flags}` };
  }

  private tokenizeNumber(): Token {
    let numStr = '';
    while (this.pos < this.src.length && /[0-9.]/.test(this.src[this.pos])) {
      numStr += this.src[this.pos];
      this.pos++;
    }
    return { type: 'NUMBER', value: numStr };
  }

  private tokenizeIdentifierOrKeyword(): Token {
    let ident = '';
    while (this.pos < this.src.length && /[a-zA-Z0-9_.-]/.test(this.src[this.pos])) {
      ident += this.src[this.pos];
      this.pos++;
    }

    if (ident === 'true' || ident === 'false') {
      return { type: 'BOOLEAN', value: ident };
    }
    if (ident === 'in') {
      return { type: 'IN', value: 'in' };
    }
    if (ident === 'not') {
      const savedPos = this.pos;
      while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) this.pos++;
      if (this.src.slice(this.pos, this.pos + 2) === 'in' && !/[a-zA-Z0-9_]/.test(this.src[this.pos + 2] || '')) {
        this.pos += 2;
        return { type: 'NOT_IN', value: 'not in' };
      }
      this.pos = savedPos;
      return { type: 'NOT', value: 'not' };
    }
    return { type: 'IDENT', value: ident };
  }
}

const EQUALITY_TOKEN_TO_OP: ReadonlyMap<TokenType, WhenBinaryOperator> = new Map([
  ['EQ', '=='],
  ['NEQ', '!='],
  ['LT', '<'],
  ['LTE', '<='],
  ['GT', '>'],
  ['GTE', '>='],
  ['MATCH', '=~'],
  ['IN', 'in'],
  ['NOT_IN', 'not in'],
]);

export class WhenParser {
  private readonly tokens: readonly Token[];
  private current = 0;

  constructor(tokens: readonly Token[]) {
    this.tokens = tokens;
  }

  public parse(): WhenASTNode {
    const expr = this.parseOr();
    if (!this.isAtEnd()) {
      throw new Error(`Unexpected token at end of when-clause: ${this.peek().value}`);
    }
    return expr;
  }

  private parseOr(): WhenASTNode {
    let expr = this.parseAnd();

    while (this.match('OR')) {
      const right = this.parseAnd();
      expr = {
        type: 'binary',
        operator: '||',
        left: expr,
        right,
      };
    }
    return expr;
  }

  private parseAnd(): WhenASTNode {
    let expr = this.parseEquality();

    while (this.match('AND')) {
      const right = this.parseEquality();
      expr = {
        type: 'binary',
        operator: '&&',
        left: expr,
        right,
      };
    }
    return expr;
  }

  private parseEquality(): WhenASTNode {
    let expr = this.parseUnary();

    while (this.isEqualityToken(this.peek().type)) {
      const token = this.advance();
      const op = EQUALITY_TOKEN_TO_OP.get(token.type) ?? '==';
      const right = this.parseUnary();
      expr = {
        type: 'binary',
        operator: op,
        left: expr,
        right,
      };
    }
    return expr;
  }

  private isEqualityToken(t: TokenType): boolean {
    return EQUALITY_TOKEN_TO_OP.has(t);
  }

  private parseUnary(): WhenASTNode {
    if (this.match('NOT')) {
      const operand = this.parseUnary();
      return {
        type: 'unary',
        operator: '!',
        operand,
      };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): WhenASTNode {
    if (this.match('LPAREN')) {
      const expression = this.parseOr();
      this.consume('RPAREN', "Expected ')' after grouped expression.");
      return { type: 'group', expression };
    }

    if (this.match('BOOLEAN')) {
      return { type: 'literal', value: this.previous().value === 'true' };
    }

    if (this.match('NUMBER')) {
      return { type: 'literal', value: Number(this.previous().value) };
    }

    if (this.match('STRING') || this.match('REGEX')) {
      return { type: 'literal', value: this.previous().value };
    }

    if (this.match('IDENT')) {
      return { type: 'identifier', name: this.previous().value };
    }

    throw new Error(`Unexpected token in when-clause: ${this.peek().value || 'EOF'}`);
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '' };
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(message);
  }
}

const astCache = new Map<string, WhenASTNode>();

export function parseWhenClause(clause: string): WhenASTNode {
  const trimmed = clause.trim();
  if (!trimmed) {
    return { type: 'literal', value: true };
  }

  const cached = astCache.get(trimmed);
  if (cached) return cached;

  const tokenizer = new WhenTokenizer(trimmed);
  const tokens = tokenizer.tokenize();
  const parser = new WhenParser(tokens);
  const ast = parser.parse();

  astCache.set(trimmed, ast);
  return ast;
}
