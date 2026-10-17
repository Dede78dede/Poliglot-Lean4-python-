/**
 * When-Clause Parser & Evaluator Facade
 * Delegates to modularized when-parser, when-evaluator, and when-operators.
 */

export { parseWhenClause, WhenTokenizer, WhenParser } from './when-parser';
export { evaluateWhenClause, evaluateWhenAST, resolveValue } from './when-evaluator';
export { dispatchOperator, OPERATOR_HANDLERS, type OperatorToken, type OperatorHandler } from './when-operators';
