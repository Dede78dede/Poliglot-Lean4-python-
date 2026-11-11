/**
 * Security Event Observability Emitter (Phase 13.9, Tasks 03 & 10)
 *
 * Epistemic & Security Guardrails:
 * 1. Independent of OpenTelemetry feature flags (always active).
 * 2. Strict no-log policy for secrets: raw tokens and keys are NEVER logged.
 * 3. Structured JSON event output for audit log aggregators.
 */

export interface SecurityEvent {
  readonly timestamp: string;
  readonly event: 'auth_denied' | 'rate_limited' | 'bypass_attempt' | 'token_rotated' | 'token_revoked';
  readonly tokenId?: string;
  readonly ip?: string;
  readonly path?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

class SecurityEventLogger {
  private readonly events: SecurityEvent[] = [];
  private readonly maxBufferedEvents = 500;

  public sanitizeId(tokenOrId?: string): string | undefined {
    if (!tokenOrId) return undefined;
    if (tokenOrId.startsWith('opaque_ref_')) return tokenOrId;
    const prefix = tokenOrId.slice(0, Math.min(4, tokenOrId.length));
    return `opaque_ref_${prefix}...`;
  }

  private record(event: SecurityEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxBufferedEvents) {
      this.events.shift();
    }
    // Standard structured audit log
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[SECURITY_AUDIT] ${JSON.stringify(event)}`);
    }
  }

  public emitAuthDenied(tokenId?: string, ip?: string, path?: string): void {
    this.record({
      timestamp: new Date().toISOString(),
      event: 'auth_denied',
      tokenId: this.sanitizeId(tokenId),
      ip: ip ?? '127.0.0.1',
      path: path ?? '/',
    });
  }

  public emitRateLimited(tokenId?: string, ip?: string, path?: string): void {
    this.record({
      timestamp: new Date().toISOString(),
      event: 'rate_limited',
      tokenId: this.sanitizeId(tokenId),
      ip: ip ?? '127.0.0.1',
      path: path ?? '/',
    });
  }

  public emitBypassAttempt(ip?: string, path?: string): void {
    this.record({
      timestamp: new Date().toISOString(),
      event: 'bypass_attempt',
      ip: ip ?? '127.0.0.1',
      path: path ?? '/',
      details: {
        violation: 'Attempted to supply test bypass secret in non-test or unauthorized environment.',
      },
    });
  }

  public emitTokenLifecycle(event: 'token_rotated' | 'token_revoked', tokenId: string): void {
    this.record({
      timestamp: new Date().toISOString(),
      event,
      tokenId: this.sanitizeId(tokenId),
    });
  }

  public getEvents(): readonly SecurityEvent[] {
    return [...this.events];
  }

  public clear(): void {
    this.events.length = 0;
  }
}

export const securityEvents = new SecurityEventLogger();
