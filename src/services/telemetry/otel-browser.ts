/**
 * Browser OpenTelemetry Tracer (Phase 11.2 & Phase 15 Wave 1)
 *
 * Pinned to OpenTelemetry Web SDK 2.12.0.
 * Exports traces exclusively to local collector: http://localhost:4318/v1/traces
 * Gated by ENABLE_OTEL_BROWSER.
 */

import { featureFlagRegistry } from '../flags/feature-flag-registry';
import { BridgeError } from '../errors/bridge-error';
import { redactSensitiveData } from '../logging/logger';
import {
  OTEL_PINNED_VERSION,
  OTEL_DEFAULT_ENDPOINT,
  type OtelSpanRecord,
  type OtelSpanContext,
} from './otel-types';

const MAX_BROWSER_SPAN_BUFFER = 500;
const BROWSER_EXPORT_TIMEOUT_MS = 2000;

export class BrowserOtelTracer {
  private active = false;
  private currentTraceId: string | null = null;
  private readonly spanBuffer: OtelSpanRecord[] = [];
  private readonly endpoint: string;

  constructor(endpoint = OTEL_DEFAULT_ENDPOINT) {
    this.endpoint = endpoint;
  }

  public isEnabled(): boolean {
    return featureFlagRegistry.isEnabled('ENABLE_OTEL_BROWSER');
  }

  public checkEnabled(): void {
    if (!this.isEnabled()) {
      throw new BridgeError('FEATURE_DISABLED', `otel-browser-${Date.now()}`, {
        feature: 'ENABLE_OTEL_BROWSER',
        message: 'Browser OpenTelemetry is disabled by feature flag ENABLE_OTEL_BROWSER',
      });
    }
  }

  public getVersion(): string {
    return OTEL_PINNED_VERSION;
  }

  public getEndpoint(): string {
    return this.endpoint;
  }

  public initialize(strict = false): boolean {
    if (!this.isEnabled()) {
      if (strict) {
        this.checkEnabled();
      }
      this.active = false;
      return false;
    }
    this.active = true;
    return true;
  }

  public static generateTraceId(): string {
    const arr = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  public static generateSpanId(): string {
    const arr = new Uint8Array(8);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < 8; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  public startTrace(traceId?: string): string {
    this.currentTraceId = traceId || BrowserOtelTracer.generateTraceId();
    return this.currentTraceId;
  }

  public getCurrentTraceId(): string {
    if (!this.currentTraceId) {
      this.currentTraceId = BrowserOtelTracer.generateTraceId();
    }
    return this.currentTraceId;
  }

  public getTraceparent(spanId?: string): string {
    const traceId = this.getCurrentTraceId();
    const sid = spanId || BrowserOtelTracer.generateSpanId();
    return `00-${traceId}-${sid}-01`;
  }

  public injectTraceHeaders(headers: Record<string, string>, spanId?: string): Record<string, string> {
    if (!this.isEnabled()) {
      return headers;
    }
    return {
      ...headers,
      traceparent: this.getTraceparent(spanId),
      tracestate: 'polyglot=1',
    };
  }

  public async withSpan<T>(
    name: string,
    attributes: Record<string, unknown>,
    fn: (spanContext: OtelSpanContext) => Promise<T>
  ): Promise<T> {
    const traceId = this.getCurrentTraceId();
    const spanId = BrowserOtelTracer.generateSpanId();
    const startTime = Date.now();

    const spanContext: OtelSpanContext = {
      traceId,
      spanId,
    };

    let status: { code: 'OK' | 'ERROR'; message?: string } = { code: 'OK' };

    try {
      const result = await fn(spanContext);
      return result;
    } catch (err: unknown) {
      status = {
        code: 'ERROR',
        message: err instanceof Error ? err.message : String(err),
      };
      throw err;
    } finally {
      const endTime = Date.now();
      const sanitizedAttrs = (redactSensitiveData(attributes) as Record<string, unknown>) || {};

      const record: OtelSpanRecord = {
        spanId,
        traceId,
        name,
        startTime,
        endTime,
        durationMs: endTime - startTime,
        attributes: {
          'service.name': 'polyglot-code-studio',
          'service.version': '2.3.0-rc',
          'telemetry.sdk.language': 'webjs',
          'telemetry.sdk.version': OTEL_PINNED_VERSION,
          ...sanitizedAttrs,
        },
        status,
        events: [],
      };

      this.spanBuffer.push(record);
      if (this.spanBuffer.length > MAX_BROWSER_SPAN_BUFFER) {
        this.spanBuffer.shift();
      }

      // If enabled, asynchronously post to local exporter endpoint without blocking
      if (this.active && typeof fetch !== 'undefined') {
        void this.exportSpan(record);
      }
    }
  }

  public async exportSpan(span: OtelSpanRecord): Promise<void> {
    if (!this.active || typeof fetch !== 'function') return;
    const sanitizedSpan: OtelSpanRecord = {
      ...span,
      attributes: (redactSensitiveData(span.attributes) as Record<string, unknown>) || {},
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BROWSER_EXPORT_TIMEOUT_MS);
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceSpans: [{ scopeSpans: [{ spans: [sanitizedSpan] }] }] }),
        signal: controller.signal,
        keepalive: true,
      });
    } catch {
      // Local exporter offline / ignored silently
    } finally {
      clearTimeout(timer);
    }
  }

  public getBufferedSpans(): readonly OtelSpanRecord[] {
    return [...this.spanBuffer];
  }

  public clearBuffer(): void {
    this.spanBuffer.length = 0;
  }
}

export const browserOtelTracer = new BrowserOtelTracer();
