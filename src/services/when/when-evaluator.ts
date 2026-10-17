import type {
  WhenASTNode,
  ContextValue,
  ContextSnapshot,
} from '../../types/navigation';
import type { ContextKeyService } from '../navigation/context-key-service';
import { dispatchOperator } from './when-operators';
import { parseWhenClause } from './when-parser';

export function resolveValue(
  node: WhenASTNode,
  contextLookup: (key: string) => ContextValue
): ContextValue {
  if (node.type === 'literal') {
    return node.value;
  }
  if (node.type === 'identifier') {
    return contextLookup(node.name);
  }
  if (node.type === 'group') {
    return resolveValue(node.expression, contextLookup);
  }
  return evaluateWhenAST(node, contextLookup);
}

function evaluateBinaryNode(
  node: WhenASTNode & { type: 'binary' },
  contextLookup: (key: string) => ContextValue
): boolean {
  if (node.operator === '&&') {
    return evaluateWhenAST(node.left, contextLookup) && evaluateWhenAST(node.right, contextLookup);
  }
  if (node.operator === '||') {
    return evaluateWhenAST(node.left, contextLookup) || evaluateWhenAST(node.right, contextLookup);
  }

  const leftVal = resolveValue(node.left, contextLookup);
  const rightVal = resolveValue(node.right, contextLookup);
  return dispatchOperator(node.operator, leftVal, rightVal);
}

export function evaluateWhenAST(
  node: WhenASTNode,
  contextLookup: (key: string) => ContextValue
): boolean {
  if (node.type === 'literal') {
    return Boolean(node.value);
  }
  if (node.type === 'identifier') {
    return Boolean(contextLookup(node.name));
  }
  if (node.type === 'group') {
    return evaluateWhenAST(node.expression, contextLookup);
  }
  if (node.type === 'unary') {
    return node.operator === '!' ? !evaluateWhenAST(node.operand, contextLookup) : false;
  }
  if (node.type === 'binary') {
    return evaluateBinaryNode(node, contextLookup);
  }
  return false;
}

export function createLookup(
  context: ContextKeyService | ContextSnapshot | Record<string, unknown> | ((key: string) => ContextValue)
): (key: string) => ContextValue {
  if (typeof context === 'function') {
    return context as (k: string) => ContextValue;
  }
  if (context instanceof Map) {
    return (key: string) => context.get(key);
  }
  if ('getKey' in context && typeof (context as { getKey: unknown }).getKey === 'function') {
    return (key: string) => (context as ContextKeyService).getKey(key as never);
  }
  return (key: string) => (context as Record<string, ContextValue>)[key];
}

export function evaluateWhenClause(
  clause: string | WhenASTNode | undefined,
  context: ContextKeyService | ContextSnapshot | Record<string, unknown> | ((key: string) => ContextValue)
): boolean {
  if (!clause) return true;

  const lookup = createLookup(context);

  try {
    const ast = typeof clause === 'string' ? parseWhenClause(clause) : clause;
    return evaluateWhenAST(ast, lookup);
  } catch {
    return false;
  }
}
