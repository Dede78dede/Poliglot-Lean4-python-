import type { ContextValue } from '../../types/navigation';

export type OperatorToken =
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | '=~'
  | 'in'
  | 'not in'
  | 'eq'
  | 'neq'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'matches'
  | 'notIn';

export type OperatorHandler = (
  left: ContextValue,
  right: ContextValue
) => boolean;

function handleMatch(left: ContextValue, right: ContextValue): boolean {
  const str = String(left ?? '');
  const regexLiteral = String(right ?? '');
  const match = regexLiteral.match(/^\/(.*)\/([a-z]*)$/);
  if (match) {
    const reg = new RegExp(match[1], match[2] || '');
    return reg.test(str);
  }
  const reg = new RegExp(regexLiteral);
  return reg.test(str);
}

function handleIn(left: ContextValue, right: ContextValue): boolean {
  if (Array.isArray(right)) {
    return right.includes(String(left));
  }
  if (typeof right === 'string') {
    return right.includes(String(left));
  }
  return false;
}

function handleNotIn(left: ContextValue, right: ContextValue): boolean {
  if (Array.isArray(right)) {
    return !right.includes(String(left));
  }
  if (typeof right === 'string') {
    return !right.includes(String(left));
  }
  return true;
}

export const OPERATOR_HANDLERS: ReadonlyMap<OperatorToken, OperatorHandler> = new Map<OperatorToken, OperatorHandler>([
  ['==', (l, r) => l === r],
  ['!=', (l, r) => l !== r],
  ['<', (l, r) => Number(l) < Number(r)],
  ['<=', (l, r) => Number(l) <= Number(r)],
  ['>', (l, r) => Number(l) > Number(r)],
  ['>=', (l, r) => Number(l) >= Number(r)],
  ['=~', handleMatch],
  ['in', handleIn],
  ['not in', handleNotIn],

  // Alias token support
  ['eq', (l, r) => l === r],
  ['neq', (l, r) => l !== r],
  ['lt', (l, r) => Number(l) < Number(r)],
  ['lte', (l, r) => Number(l) <= Number(r)],
  ['gt', (l, r) => Number(l) > Number(r)],
  ['gte', (l, r) => Number(l) >= Number(r)],
  ['matches', handleMatch],
  ['notIn', handleNotIn],
]);

export function dispatchOperator(
  token: OperatorToken | string,
  left: ContextValue,
  right: ContextValue
): boolean {
  const handler = OPERATOR_HANDLERS.get(token as OperatorToken);
  if (!handler) {
    throw new Error(`No handler registered for operator: ${token}`);
  }
  return handler(left, right);
}
