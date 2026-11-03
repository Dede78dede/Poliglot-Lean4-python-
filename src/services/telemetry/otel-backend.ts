/**
 * Backend OpenTelemetry Tracer & Correlation Engine (Phase 11.2, Sprint 11.2.3)
 *
 * Correlates OpenTelemetry trace_id and span_id with StructuredLogger entries.
 * Gated by ENABLE_OTEL_NODE.
 */

import {
  type OtelSpanRecord,
  type CorrelatedTraceResponse,
  OTEL_PINNED_VERSION,
  OTEL_DEFAULT_ENDPOINT,
} from './otel-types';
import { StructuredLogger, type LogEntry } from '../logging/logger';
import { featureFlagRegistry } from '../flags/feature-flag-registry';
import { BridgeError } from '../errors/bridge-error';

export class BackendOtelEngine {
  private readonly spansByTrace = new Map<string, OtelSpanRecord[]>();
  private readonly logsByTrace = new Map<string, LogEntry[]>();
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.ENABLE_OTEL_NODE === 'true';
  }

  public isEnabled(): boolean {
    return featureFlagRegistry.isEnabled('ENABLE_OTEL_NODE') || this.enabled || process.env.ENABLE_OTEL_NODE === 'true';
  }

  public checkEnabled(): void {
    if (!this.isEnabled()) {
      throw new BridgeError('FEATURE_DISABLED', `otel-node-${Date.now()}`, {
        feature: 'ENABLE_OTEL_NODE',
        message: 'Backend OpenTelemetry is disabled by feature flag ENABLE_OTEL_NODE',
      });
    }
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
  }

  public getVersion(): string {
    return OTEL_PINNED_VERSION;
  }

  public getEndpoint(): string {
    return process.env.OTEL_EXPORTER_OTLP_ENDPOINT || OTEL_DEFAULT_ENDPOINT;
  }

  public recordSpan(span: OtelSpanRecord): void {
    if (!this.spansByTrace.has(span.traceId)) {
      this.spansByTrace.set(span.traceId, []);
    }
    this.spansByTrace.get(span.traceId)!.push(span);
  }

  public recordLog(log: LogEntry): void {
    const traceId = log.correlationId;
    if (!this.logsByTrace.has(traceId)) {
      this.logsByTrace.set(traceId, []);
    }
    this.logsByTrace.get(traceId)!.push(log);
  }

  public getTrace(traceId: string): CorrelatedTraceResponse | null {
    const spans = this.spansByTrace.get(traceId) || [];
    const logs = this.logsByTrace.get(traceId) || [];

    if (spans.length === 0 && logs.length === 0) {
      return null;
    }

    const rootSpan = spans.find(s => !s.parentSpanId) || spans[0];
    const startTime = spans.reduce((min, s) => Math.min(min, s.startTime), Date.now());
    const endTime = spans.reduce((max, s) => Math.max(max, s.endTime), 0);

    return {
      traceId,
      rootSpan,
      spans,
      totalSpans: spans.length,
      durationMs: endTime > startTime ? endTime - startTime : 0,
      correlatedLogs: logs.map(l => ({
        timestamp: l.timestamp,
        level: l.level,
        service: l.service,
        message: l.message,
        correlationId: l.correlationId,
      })),
    };
  }

  public clear(): void {
    this.spansByTrace.clear();
    this.logsByTrace.clear();
  }
}

export const backendOtelEngine = new BackendOtelEngine();
