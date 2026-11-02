/**
 * ResultEnvelope<T> (Phase 13, Sprint 13.1, Task RE1)
 *
 * Idiomatic TypeScript Result pattern with discriminated union on `ok: boolean`.
 * Replaces fragmented return contracts across all bridge services.
 *
 * Epistemic Rules:
 * - Discriminated union on `ok`. TypeScript narrows `value` only after checking `ok === true`.
 * - Errors are serialized as RFC 9457 ProblemDetails with mandatory correlationId.
 * - Value is never undefined (void uses explicit null).
 */

import { BridgeError } from '../../services/errors/bridge-error';
import { ERROR_REGISTRY, type ErrorCode } from '../../services/errors/error-registry';
export { withEnvelope } from './with-envelope';

/**
 * Serialized form of BridgeError (RFC 9457-compatible).
 * Fields mirror `ProblemDetails` from Phase 10.9.
 */
export interface SerializedBridgeError {
  readonly code: ErrorCode;
  readonly problemType: string;         // RFC 9457 URI
  readonly httpStatus: number;
  readonly message: string;
  readonly details: Readonly<Record<string, unknown>>;
}

/**
 * Discriminated union on `ok`. TypeScript narrows `value` only
 * after `ok === true` is checked. This is the idiomatic TypeScript
 * Result pattern (Sprint 13.1).
 */
export type ResultEnvelope<T> =
  | {
      readonly ok: true;
      readonly value: T;
      readonly correlationId: string;
      readonly timestamp: string;       // ISO 8601
    }
  | {
      readonly ok: false;
      readonly error: SerializedBridgeError;
      readonly correlationId: string;
      readonly timestamp: string;
    };

/**
 * Void variant for operations that return nothing.
 * `value` is explicitly `null` (not `undefined`) to satisfy
 * `exactOptionalPropertyTypes: true`.
 */
export type VoidEnvelope =
  | { readonly ok: true; readonly value: null; readonly correlationId: string; readonly timestamp: string }
  | { readonly ok: false; readonly error: SerializedBridgeError; readonly correlationId: string; readonly timestamp: string };

/**
 * Serializes any error (BridgeError or unknown Exception) into a RFC 9457 SerializedBridgeError.
 */
export function serializeBridgeError(
  error: unknown,
  fallbackCorrelationId: string
): SerializedBridgeError {
  if (error instanceof BridgeError) {
    return {
      code: error.code,
      problemType: error.problemType,
      httpStatus: error.httpStatus,
      message: error.message,
      details: error.details,
    };
  }

  if (typeof error === 'string' && error in ERROR_REGISTRY) {
    const code = error as ErrorCode;
    const def = ERROR_REGISTRY[code];
    return {
      code,
      problemType: def.problemType,
      httpStatus: def.httpStatus,
      message: def.userMessage,
      details: Object.freeze({}),
    };
  }

  const def = ERROR_REGISTRY.INTERNAL_SERVER_ERROR ?? {
    code: 'INTERNAL_SERVER_ERROR',
    httpStatus: 500,
    problemType: 'https://polyglot.dev/errors/internal-server-error',
    userMessage: 'An internal unexpected error occurred.',
  };

  const rawMessage = error instanceof Error ? error.message : String(error);

  return {
    code: 'INTERNAL_SERVER_ERROR',
    problemType: def.problemType,
    httpStatus: 500,
    message: rawMessage || def.userMessage,
    details: Object.freeze({ rawError: rawMessage }),
  };
}

/**
 * Creates a success envelope for a given value.
 */
export function createSuccessEnvelope<T>(
  value: T,
  correlationId?: string,
  timestamp?: string
): ResultEnvelope<T> {
  return {
    ok: true,
    value,
    correlationId: correlationId ?? crypto.randomUUID(),
    timestamp: timestamp ?? new Date().toISOString(),
  };
}

/**
 * Creates an error envelope from an error and correlation ID.
 */
export function createErrorEnvelope(
  error: unknown,
  correlationId?: string,
  timestamp?: string
): ResultEnvelope<never> {
  const corr = correlationId ?? crypto.randomUUID();
  return {
    ok: false,
    error: serializeBridgeError(error, corr),
    correlationId: corr,
    timestamp: timestamp ?? new Date().toISOString(),
  };
}

/**
 * Unwraps an envelope: returns value on ok: true, throws BridgeError on ok: false.
 * Provides backward compatibility during migration.
 */
export function unwrapEnvelope<T>(envelope: ResultEnvelope<T>): T {
  if (envelope.ok) {
    return envelope.value;
  }

  throw new BridgeError(
    envelope.error.code,
    envelope.correlationId,
    envelope.error.details
  );
}
