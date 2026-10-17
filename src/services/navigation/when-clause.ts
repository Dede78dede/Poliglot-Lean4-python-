/**
 * Legacy Navigation When-Clause entry point
 * Re-exports from modular src/services/when/ implementation for backward compatibility.
 */

export {
  parseWhenClause,
  WhenTokenizer,
  WhenParser,
  evaluateWhenClause,
  evaluateWhenAST,
  resolveValue,
  dispatchOperator,
  OPERATOR_HANDLERS,
  type OperatorToken,
  type OperatorHandler,
} from '../when/when-clause';
