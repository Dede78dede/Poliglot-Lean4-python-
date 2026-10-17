import assert from 'node:assert/strict';
import {
  dispatchOperator,
  OPERATOR_HANDLERS,
} from '../src/services/when/when-operators';
import {
  evaluateWhenClause,
  parseWhenClause,
} from '../src/services/when/when-clause';

console.log('--- Testing When Operators & Dispatch Dictionary (8 Tests) ---');

// 1. Comparison boundary values (<, <=, >, >= with equal and floating values)
assert.equal(dispatchOperator('<', 10, 10), false);
assert.equal(dispatchOperator('<=', 10, 10), true);
assert.equal(dispatchOperator('>', 10.5, 10.49), true);
assert.equal(dispatchOperator('>=', 10.5, 10.5), true);
console.log('  ✓ 1. Comparison boundary tests pass');

// 2. Comparison equality edge cases (type casting, numbers vs strings)
assert.equal(dispatchOperator('==', 'lean4', 'lean4'), true);
assert.equal(dispatchOperator('!=', 'lean4', 'python'), true);
assert.equal(dispatchOperator('eq', 42, 42), true);
assert.equal(dispatchOperator('neq', 42, 43), true);
console.log('  ✓ 2. Equality/inequality operator aliases pass');

// 3. Logical operator boundaries via evaluateWhenClause
const ctx = {
  active: true,
  idle: false,
  emptyStr: '',
  zero: 0,
};
assert.equal(evaluateWhenClause('active && !idle', ctx), true);
assert.equal(evaluateWhenClause('idle || !active', ctx), false);
assert.equal(evaluateWhenClause('emptyStr || active', ctx), true);
console.log('  ✓ 3. Logical operator boundary tests pass');

// 4. Complex short-circuit logical expressions
assert.equal(evaluateWhenClause('(active && idle) || (active && !idle)', ctx), true);
assert.equal(evaluateWhenClause('!idle && (emptyStr || !zero)', ctx), true);
console.log('  ✓ 4. Logical nested group evaluation passes');

// 5. Regex operator boundary tests (valid regex literal, flags, pattern match)
assert.equal(dispatchOperator('=~', 'Lean 4.35.0-rc4', '/^Lean 4/'), true);
assert.equal(dispatchOperator('=~', 'python3', '/PYTHON/i'), true);
assert.equal(dispatchOperator('=~', 'no-match', '/^[0-9]+$/'), false);
console.log('  ✓ 5. Regex pattern and flags tests pass');

// 6. Collection in / not in boundary tests (array containment and substring containment)
assert.equal(dispatchOperator('in', 'lean4', ['lean4', 'python']), true);
assert.equal(dispatchOperator('in', 'rust', ['lean4', 'python']), false);
assert.equal(dispatchOperator('not in', 'rust', ['lean4', 'python']), true);
assert.equal(dispatchOperator('in', 'sub', 'substring'), true);
assert.equal(dispatchOperator('not in', 'xyz', 'substring'), true);
console.log('  ✓ 6. Collection containment tests pass');

// 7. Unknown token throws explicit error
let unknownThrew = false;
try {
  dispatchOperator('invalidOperatorToken' as any, 1, 2);
} catch (err: any) {
  unknownThrew = true;
  assert.ok(err.message.includes('No handler registered for operator: invalidOperatorToken'));
}
assert.equal(unknownThrew, true, 'Unknown operator must throw error');
console.log('  ✓ 7. Dispatch throws on unregistered operator');

// 8. Map.has() guarantees strict isolation against prototype pollution
assert.equal(OPERATOR_HANDLERS.has('constructor' as any), false);
assert.equal(OPERATOR_HANDLERS.has('__proto__' as any), false);
assert.equal(OPERATOR_HANDLERS.has('toString' as any), false);
assert.equal(OPERATOR_HANDLERS.has('valueOf' as any), false);
assert.equal(OPERATOR_HANDLERS.has('==' as any), true);
assert.equal(OPERATOR_HANDLERS.has('!=' as any), true);
console.log('  ✓ 8. Map.has() returns false for prototype properties');

console.log('All 8 When-Operator tests passed successfully!\n');
