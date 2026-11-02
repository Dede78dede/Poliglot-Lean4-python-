/**
 * withEnvelope Wrapper (Phase 13, Sprint 13.1, Task RE2)
 *
 * Wraps asynchronous operations in ResultEnvelope<T>.
 * Guarantees that any thrown BridgeError or exception is captured
 * and serialized into a typed error envelope with correlationId.
 */

import {
  type ResultEnvelope,
  createSuccessEnvelope,
  createErrorEnvelope,
} from './result-envelope';

/**
 * Wraps an async operation into a ResultEnvelope<T>.
 *
 * @param operation The async task returning a value of type T
 * @param correlationId Non-forgeable correlation identifier for distributed tracing
 */
export async function withEnvelope<T>(
  operation: () => Promise<T>,
  correlationId: string
): Promise<ResultEnvelope<T>> {
  try {
    const value = await operation();
    return createSuccessEnvelope(value, correlationId);
  } catch (err: unknown) {
    return createErrorEnvelope(err, correlationId);
  }
}
