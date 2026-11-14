/**
 * withEnvelope Wrapper (Phase 13, Sprint 13.1, Task RE2)
 *
 * Wraps asynchronous operations in ResultEnvelope<T>.
 * Guarantees that any thrown BridgeError or exception is captured
 * and serialized into a typed error envelope with correlationId.
 */

export { withEnvelope } from './result-envelope';
