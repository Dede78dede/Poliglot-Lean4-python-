/**
 * Negative type-checking regression test.
 * This file contains intentional TypeScript type errors.
 * tsc --noEmit on this file MUST fail with exit code 1.
 */

// 1. Prohibited `as any` type escape
export const invalidAnyCast: string = (12345 as any);

// 2. Prohibited implicit any
export function implicitAnyFunc(arg) {
  return arg.nonExistentProperty;
}

// 3. Prohibited strictNullChecks null dereference
export function nullDereference(val: string | null): number {
  return val.length;
}

// 4. Type mismatch
export const strictMismatch: number = "this is not a number";
