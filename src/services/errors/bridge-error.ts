/**
 * BridgeError Base Class (Phase 10.9, Task E2)
 *
 * All bridge services and verification modules throw BridgeError.
 * Ensures every error carries a typed ErrorCode, RFC 9457 ProblemDetails,
 * non-forgeable correlationId, and frozen technical details.
 */

import {
  ERROR_REGISTRY,
  type ErrorCode,
  type ProblemDetails,
  createProblemDetails,
} from './error-registry';

export class BridgeError extends Error {
  public readonly code: ErrorCode;
  public readonly correlationId: string;
  public readonly details: Readonly<Record<string, unknown>>;
  public readonly httpStatus: number;
  public readonly problemType: string;
  public readonly retryable: boolean;

  constructor(
    code: ErrorCode,
    correlationId: string,
    details?: Readonly<Record<string, unknown>>
  ) {
    const definition = ERROR_REGISTRY[code];
    super(definition?.userMessage ?? code);
    this.name = 'BridgeError';
    this.code = code;
    this.correlationId = correlationId;
    this.httpStatus = definition?.httpStatus ?? 500;
    this.problemType = definition?.problemType ?? 'https://polyglot.dev/errors/unknown';
    this.retryable = definition?.retryable ?? false;
    this.details = Object.freeze({ ...(details ?? {}) });

    // Ensure correct prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toProblemDetails(): ProblemDetails {
    const definition = ERROR_REGISTRY[this.code];
    return createProblemDetails(definition, this.correlationId, this.details);
  }
}
