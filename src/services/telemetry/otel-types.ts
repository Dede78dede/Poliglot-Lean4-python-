/**
 * OpenTelemetry Types & Metadata (Phase 11.2, Sprint 11.2.3)
 *
 * Pinned Strategy:
 * Polyglot Code Studio pins `@opentelemetry/sdk-trace-web` to 2.12.0 (2026-10-15 baseline)
 * to maintain stability and zero-breakage across modern browsers.
 * Phase 11.3 includes the planned migration path to 3.0.x once ecosystem typings stabilize.
 */

export const OTEL_PINNED_VERSION = '2.12.0';
export const OTEL_DEFAULT_ENDPOINT = 'http://localhost:4318/v1/traces';

export interface OtelSpanContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly traceFlags?: number;
  readonly traceState?: string;
}

export interface OtelSpanRecord {
  readonly spanId: string;
  readonly traceId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly durationMs: number;
  readonly attributes: Record<string, unknown>;
  readonly status: {
    readonly code: 'OK' | 'ERROR' | 'UNSET';
    readonly message?: string;
  };
  readonly events: readonly {
    readonly name: string;
    readonly time: number;
    readonly attributes?: Record<string, unknown>;
  }[];
}

export interface CorrelatedTraceResponse {
  readonly traceId: string;
  readonly rootSpan?: OtelSpanRecord;
  readonly spans: readonly OtelSpanRecord[];
  readonly totalSpans: number;
  readonly durationMs: number;
  readonly correlatedLogs: readonly {
    readonly timestamp: string;
    readonly level: string;
    readonly service: string;
    readonly message: string;
    readonly correlationId: string;
    readonly traceId?: string;
    readonly spanId?: string;
  }[];
}
