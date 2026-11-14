/**
 * Backend OpenTelemetry Tracer & Correlation Engine (Phase 11.2 & Phase 15 Wave 1)
 *
 * Correlates W3C OpenTelemetry trace_id and span_id with StructuredLogger entries
 * and dispatches spans asynchronously over a bounded non-blocking OTLP HTTP queue.
 * Gated by ENABLE_OTEL_NODE.
 */

import {
  type OtelSpanRecord,
  type OtelSpanContext,
  type CorrelatedTraceResponse,
  OTEL_PINNED_VERSION,
  OTEL_DEFAULT_ENDPOINT,
} from './otel-types';
import {
  StructuredLogger,
  redactSensitiveData,
  type LogEntry,
} from '../logging/logger';
import { featureFlagRegistry } from '../flags/feature-flag-registry';
import { BridgeError } from '../errors/bridge-error';

const MAX_TRACES_IN_MEMORY = 500;
const MAX_EXPORT_QUEUE = 256;
const EXPORT_TIMEOUT_MS = 2000;

export class BackendOtelEngine {
  private readonly spansByTrace = new Map<string, OtelSpanRecord[]>();
  private readonly logsByTrace = new Map<string, LogEntry[]>();
  private readonly exportQueue: OtelSpanRecord[] = [];
  private draining = false;
  private droppedSpansCount = 0;
  private exportedSpansCount = 0;
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

  public parseTraceparent(traceparent: string): OtelSpanContext | null {
    const parsed = StructuredLogger.parseTraceParent(traceparent);
    if (!parsed) return null;
    return {
      traceId: parsed.traceId,
      spanId: parsed.spanId,
      traceFlags: parsed.traceFlags,
    };
  }

  public parseTracestate(tracestate?: string): Record<string, string> {
    if (!tracestate) return {};
    const out: Record<string, string> = {};
    for (const part of tracestate.split(',')) {
      const idx = part.indexOf('=');
      if (idx > 0) {
        const key = part.slice(0, idx).trim();
        const val = part.slice(idx + 1).trim();
        if (key && val) out[key] = val;
      }
    }
    return out;
  }

  public createChildSpanContext(parent?: OtelSpanContext | null, traceState?: string): OtelSpanContext {
    const traceId = parent?.traceId || StructuredLogger.generateTraceId();
    let spanId = StructuredLogger.generateSpanId();
    while (parent?.spanId && spanId === parent.spanId) {
      spanId = StructuredLogger.generateSpanId();
    }
    return {
      traceId,
      spanId,
      ...(parent?.spanId ? { parentSpanId: parent.spanId } : {}),
      traceFlags: parent?.traceFlags ?? 1,
      ...(traceState || parent?.traceState ? { traceState: traceState || parent?.traceState } : {}),
    };
  }

  private evictOldestTraceIfNeeded(): void {
    if (this.spansByTrace.size < MAX_TRACES_IN_MEMORY) return;
    const oldestKey = this.spansByTrace.keys().next().value;
    if (oldestKey !== undefined) {
      this.spansByTrace.delete(oldestKey);
      this.logsByTrace.delete(oldestKey);
    }
  }

  public recordSpan(span: OtelSpanRecord): void {
    this.evictOldestTraceIfNeeded();
    const sanitizedSpan: OtelSpanRecord = {
      ...span,
      attributes: (redactSensitiveData(span.attributes ?? {}) as Record<string, unknown>) || {},
      events: (span.events ?? []).map((ev) => ({
        ...ev,
        ...(ev.attributes
          ? { attributes: redactSensitiveData(ev.attributes) as Record<string, unknown> }
          : {}),
      })),
    };

    if (!this.spansByTrace.has(sanitizedSpan.traceId)) {
      this.spansByTrace.set(sanitizedSpan.traceId, []);
    }
    this.spansByTrace.get(sanitizedSpan.traceId)!.push(sanitizedSpan);

    if (this.isEnabled() && process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
      this.enqueueForExport(sanitizedSpan);
    }
  }

  private enqueueForExport(span: OtelSpanRecord): void {
    if (this.exportQueue.length >= MAX_EXPORT_QUEUE) {
      this.droppedSpansCount += 1;
      return;
    }
    this.exportQueue.push(span);
    if (!this.draining) {
      queueMicrotask(() => {
        void this.drainExportQueue();
      });
    }
  }

  public async drainExportQueue(): Promise<void> {
    if (this.draining) return;
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    if (!endpoint || !this.isEnabled() || typeof fetch !== 'function') {
      this.exportQueue.length = 0;
      return;
    }

    this.draining = true;
    try {
      while (this.exportQueue.length > 0) {
        const batch = this.exportQueue.splice(0, 32);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), EXPORT_TIMEOUT_MS);
        (timer as unknown as { unref?: () => void }).unref?.();

        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resourceSpans: [
                {
                  resource: {
                    attributes: [{ key: 'service.name', value: { stringValue: 'polyglot-code-studio-backend' } }],
                  },
                  scopeSpans: [{ spans: batch }],
                },
              ],
            }),
            signal: controller.signal,
          });
          if (res.ok) {
            this.exportedSpansCount += batch.length;
          } else {
            this.droppedSpansCount += batch.length;
          }
        } catch {
          this.droppedSpansCount += batch.length;
        } finally {
          clearTimeout(timer);
        }
      }
    } finally {
      this.draining = false;
    }
  }

  public getExportMetrics(): { queued: number; exported: number; dropped: number } {
    return {
      queued: this.exportQueue.length,
      exported: this.exportedSpansCount,
      dropped: this.droppedSpansCount,
    };
  }

  public recordLog(log: LogEntry): void {
    const traceKey = log.traceId ?? log.correlationId;
    if (!traceKey) return;
    if (!this.logsByTrace.has(traceKey)) {
      this.logsByTrace.set(traceKey, []);
    }
    this.logsByTrace.get(traceKey)!.push(log);
  }

  public getTrace(traceId: string): CorrelatedTraceResponse | null {
    const spans = this.spansByTrace.get(traceId) || [];
    const logs = this.logsByTrace.get(traceId) || [];

    if (spans.length === 0 && logs.length === 0) {
      return null;
    }

    const rootSpan = spans.find((s) => !s.parentSpanId) || spans[0];
    const startTime = spans.length > 0 ? spans.reduce((min, s) => Math.min(min, s.startTime), Infinity) : 0;
    const endTime = spans.length > 0 ? spans.reduce((max, s) => Math.max(max, s.endTime), 0) : 0;

    return {
      traceId,
      rootSpan,
      spans,
      totalSpans: spans.length,
      durationMs: endTime > startTime ? endTime - startTime : 0,
      correlatedLogs: logs.map((l) => ({
        timestamp: l.timestamp,
        level: l.level,
        service: l.service,
        message: l.message,
        correlationId: l.correlationId,
        ...(l.traceId ? { traceId: l.traceId } : {}),
        ...(l.spanId ? { spanId: l.spanId } : {}),
      })),
    };
  }

  public clear(): void {
    this.spansByTrace.clear();
    this.logsByTrace.clear();
    this.exportQueue.length = 0;
    this.droppedSpansCount = 0;
    this.exportedSpansCount = 0;
  }
}

export const backendOtelEngine = new BackendOtelEngine();
