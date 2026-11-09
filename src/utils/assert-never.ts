/**
 * Exhaustiveness checking utility for discriminated unions (Phase 14.9.3 M1)
 *
 * Ensures at compile time that all variants of a discriminated union have been handled.
 */
export function assertNever(value: never, customMessage?: string): never {
  throw new Error(
    customMessage ?? `Unhandled discriminated union variant: ${JSON.stringify(value)}`
  );
}
