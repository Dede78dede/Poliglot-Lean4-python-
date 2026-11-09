/**
 * Server-Side Security Event Observability Emitter (Phase 14.9.3, Milestone M6)
 *
 * Epistemic & Security Guardrails:
 * 1. Independent of OpenTelemetry feature flags (always active).
 * 2. Strict no-log policy for secrets: raw tokens and keys are NEVER logged.
 * 3. Incorporates correlationId, traceId, and spanId from StructuredLogger or request context.
 * 4. Structured JSON output for security event aggregators.
 */

import { StructuredLogger, type TraceContext } from '../../../../src/services/logging/logger';

export interface SecurityEventRecord {
  readonly timestamp: string;
  readonly event: 'auth_denied' | 'rate_limited' | 'bypass_attempt' | 'token_rotated' | 'token_revoked' | 'bola_violation';
  readonly correlationId: string;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly tokenId?: string;
  readonly ip?: string;
  readonly path?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export class SecurityEventService {
  private readonly events: SecurityEventRecord[] = [];
  private readonly maxBufferedEvents = 500;

  private sanitizeId(tokenOrId?: string): string | undefined {
    if (!tokenOrId) return undefined;
    if (tokenOrId.length >= 24) {
      return `opaque_ref_${tokenOrId.slice(0, 4)}...`;
    }
    return tokenOrId;
  }

  private record(
    event: SecurityEventRecord['event'],
    data: {
      tokenId?: string;
      ip?: string;
      path?: string;
      details?: Readonly<Record<string, unknown>>;
      correlationId?: string;
      traceContext?: TraceContext;
    }
  ): SecurityEventRecord {
    const traceCtx = data.traceContext ?? StructuredLogger.getTraceContext();
    const correlationId = data.correlationId ?? StructuredLogger.getGlobalCorrelationId();

    const record: SecurityEventRecord = {
      timestamp: new Date().toISOString(),
      event,
      correlationId,
      ...(traceCtx?.traceId ? { traceId: traceCtx.traceId } : {}),
      ...(traceCtx?.spanId ? { spanId: traceCtx.spanId } : {}),
      tokenId: this.sanitizeId(data.tokenId),
      ip: data.ip ?? '127.0.0.1',
      path: data.path ?? '/',
      ...(data.details ? { details: Object.freeze({ ...data.details }) } : {}),
    };

    this.events.push(record);
    if (this.events.length > this.maxBufferedEvents) {
      this.events.shift();
    }

    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[SECURITY_EVENT] ${JSON.stringify(record)}`);
    }

    return record;
  }

  public emitAuthDenied(
    tokenId?: string,
    ip?: string,
    path?: string,
    correlationId?: string,
    traceContext?: TraceContext
  ): SecurityEventRecord {
    return this.record('auth_denied', { tokenId, ip, path, correlationId, traceContext });
  }

  public emitRateLimited(
    tokenId?: string,
    ip?: string,
    path?: string,
    correlationId?: string,
    traceContext?: TraceContext
  ): SecurityEventRecord {
    return this.record('rate_limited', { tokenId, ip, path, correlationId, traceContext });
  }

  public emitBypassAttempt(
    ip?: string,
    path?: string,
    correlationId?: string,
    traceContext?: TraceContext
  ): SecurityEventRecord {
    return this.record('bypass_attempt', {
      ip,
      path,
      correlationId,
      traceContext,
      details: {
        violation: 'Attempted to supply test bypass secret in non-test or unauthorized environment.',
      },
    });
  }

  public emitBolaViolation(
    actorId: string,
    resourceId: string,
    ip?: string,
    path?: string,
    correlationId?: string,
    traceContext?: TraceContext
  ): SecurityEventRecord {
    return this.record('bola_violation', {
      tokenId: actorId,
      ip,
      path,
      correlationId,
      traceContext,
      details: { resourceId, violation: 'Actor does not have ownership of target resource' },
    });
  }

  public emitTokenLifecycle(
    event: 'token_rotated' | 'token_revoked',
    tokenId: string,
    correlationId?: string,
    traceContext?: TraceContext
  ): SecurityEventRecord {
    return this.record(event, { tokenId, correlationId, traceContext });
  }

  public getEvents(): readonly SecurityEventRecord[] {
    return Object.freeze([...this.events]);
  }

  public clear(): void {
    this.events.length = 0;
  }
}

export const serverSecurityEvents = new SecurityEventService();
