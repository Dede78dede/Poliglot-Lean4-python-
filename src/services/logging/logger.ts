/**
 * Structured JSON Logger Facade (Phase 14.9.9.1 / M6)
 *
 * Emits uniform JSON log entries containing correlationId, traceId, spanId,
 * service, timestamp, log level, durationMs, and structured metadata.
 */

import crypto from 'node:crypto';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly service: string;
  readonly correlationId: string;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly message: string;
  readonly durationMs?: number;
  readonly details?: Readonly<Record<string, unknown>>;
}

export class StructuredLogger {
  private readonly serviceName: string;
  private readonly buffer: LogEntry[] = [];
  private static globalCorrelationId = '00000000-0000-4000-8000-000000000000';
  private static activeTraceContext?: { traceId: string; spanId: string };

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  public static generateCorrelationId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `corr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  public static generateTraceId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  public static generateSpanId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  public static setTraceContext(ctx: { traceId: string; spanId: string } | undefined): void {
    StructuredLogger.activeTraceContext = ctx;
  }

  public static getTraceContext(): { traceId: string; spanId: string } | undefined {
    return StructuredLogger.activeTraceContext;
  }

  public static parseTraceParent(traceparent: string): { traceId: string; spanId: string } | undefined {
    // W3C traceparent: version(2)-traceId(32)-spanId(16)-flags(2)
    const match = traceparent.match(/^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/i);
    if (!match) return undefined;
    return {
      traceId: match[1]!,
      spanId: match[2]!,
    };
  }

  public static setGlobalCorrelationId(id: string): void {
    StructuredLogger.globalCorrelationId = id;
  }

  public static getGlobalCorrelationId(): string {
    return StructuredLogger.globalCorrelationId;
  }

  private log(
    level: LogLevel,
    message: string,
    correlationId?: string,
    details?: Readonly<Record<string, unknown>>,
    durationMs?: number
  ): LogEntry {
    const traceCtx = StructuredLogger.activeTraceContext;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      correlationId: correlationId ?? StructuredLogger.globalCorrelationId,
      ...(traceCtx?.traceId ? { traceId: traceCtx.traceId } : {}),
      ...(traceCtx?.spanId ? { spanId: traceCtx.spanId } : {}),
      message,
      ...(durationMs !== undefined ? { durationMs } : {}),
      ...(details !== undefined ? { details: Object.freeze({ ...details }) } : {}),
    };

    this.buffer.push(entry);
    if (this.buffer.length > 100) this.buffer.shift();
    return entry;
  }

  public debug(message: string, correlationId?: string, details?: Record<string, unknown>): LogEntry {
    return this.log('debug', message, correlationId, details);
  }

  public info(message: string, correlationId?: string, details?: Record<string, unknown>): LogEntry {
    return this.log('info', message, correlationId, details);
  }

  public warn(message: string, correlationId?: string, details?: Record<string, unknown>): LogEntry {
    return this.log('warn', message, correlationId, details);
  }

  public error(message: string, correlationId?: string, details?: Record<string, unknown>): LogEntry {
    return this.log('error', message, correlationId, details);
  }

  public getRecentLogs(): readonly LogEntry[] {
    return Object.freeze([...this.buffer]);
  }
}

export function createLogger(serviceName: string): StructuredLogger {
  return new StructuredLogger(serviceName);
}
