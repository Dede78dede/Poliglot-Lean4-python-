import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  dispatchOperator,
  OPERATOR_HANDLERS,
} from '../src/services/when/when-operators';
import { evaluateWhenClause } from '../src/services/when/when-clause';

describe('When Operators & Dispatch Dictionary', () => {
  it('evaluates comparison boundaries (<, <=, >, >=)', () => {
    assert.equal(dispatchOperator('<', 10, 10), false);
    assert.equal(dispatchOperator('<=', 10, 10), true);
    assert.equal(dispatchOperator('>', 10.5, 10.49), true);
    assert.equal(dispatchOperator('>=', 10.5, 10.5), true);
  });

  it('evaluates equality and inequality operator aliases', () => {
    assert.equal(dispatchOperator('==', 'lean4', 'lean4'), true);
    assert.equal(dispatchOperator('!=', 'lean4', 'python'), true);
    assert.equal(dispatchOperator('eq', 42, 42), true);
    assert.equal(dispatchOperator('neq', 42, 43), true);
  });

  it('evaluates logical operator boundaries and nested groups', () => {
    const ctx = {
      active: true,
      idle: false,
      emptyStr: '',
      zero: 0,
    };
    assert.equal(evaluateWhenClause('active && !idle', ctx), true);
    assert.equal(evaluateWhenClause('idle || !active', ctx), false);
    assert.equal(evaluateWhenClause('emptyStr || active', ctx), true);
    assert.equal(evaluateWhenClause('(active && idle) || (active && !idle)', ctx), true);
    assert.equal(evaluateWhenClause('!idle && (emptyStr || !zero)', ctx), true);
  });

  it('evaluates regex patterns with flags', () => {
    assert.equal(dispatchOperator('=~', 'Lean 4.35.0-rc4', '/^Lean 4/'), true);
    assert.equal(dispatchOperator('=~', 'python3', '/PYTHON/i'), true);
    assert.equal(dispatchOperator('=~', 'no-match', '/^[0-9]+$/'), false);
  });

  it('evaluates array and substring containment (in / not in)', () => {
    assert.equal(dispatchOperator('in', 'lean4', ['lean4', 'python']), true);
    assert.equal(dispatchOperator('in', 'rust', ['lean4', 'python']), false);
    assert.equal(dispatchOperator('not in', 'rust', ['lean4', 'python']), true);
    assert.equal(dispatchOperator('in', 'sub', 'substring'), true);
    assert.equal(dispatchOperator('not in', 'xyz', 'substring'), true);
  });

  it('throws an explicit error on unregistered operator tokens', () => {
    assert.throws(
      () => dispatchOperator('invalidOperatorToken' as never, 1, 2),
      /No handler registered for operator: invalidOperatorToken/
    );
  });

  it('isolates OPERATOR_HANDLERS Map against prototype pollution', () => {
    assert.equal(OPERATOR_HANDLERS.has('constructor' as never), false);
    assert.equal(OPERATOR_HANDLERS.has('__proto__' as never), false);
    assert.equal(OPERATOR_HANDLERS.has('toString' as never), false);
    assert.equal(OPERATOR_HANDLERS.has('valueOf' as never), false);
    assert.equal(OPERATOR_HANDLERS.has('==' as never), true);
    assert.equal(OPERATOR_HANDLERS.has('!=' as never), true);
  });
});
