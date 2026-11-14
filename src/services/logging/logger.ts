/**
 * Structured JSON Logger Facade (Phase 14.9.9.1 / M6 & Phase 15 Wave 1)
 *
 * Emits uniform JSON log entries containing correlationId, traceId, spanId,
 * service, timestamp, log level, durationMs, and recursively redacted metadata.
 * Uses AsyncLocalStorage in Node.js for concurrent per-request trace isolation
 * without breaking browser bundling.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface TraceContext {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly traceState?: string;
}

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly service: string;
  readonly correlationId: string;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly parentSpanId?: string;
  readonly message: string;
  readonly durationMs?: number;
  readonly details?: Readonly<Record<string, unknown>>;
}

interface AsyncLocalStorageLike<T> {
  getStore(): T | undefined;
  run<R>(store: T, callback: () => R): R;
}

function initTraceStorage(): AsyncLocalStorageLike<TraceContext> | null {
  if (typeof window !== 'undefined' || typeof process === 'undefined' || !process.versions?.node) {
    return null;
  }
  try {
    const getBuiltin = (
      process as unknown as {
        getBuiltinModule?: (id: string) => {
          AsyncLocalStorage?: new <T>() => AsyncLocalStorageLike<T>;
        } | undefined;
      }
    ).getBuiltinModule;
    const mod = getBuiltin?.('node:async_hooks');
    if (mod?.AsyncLocalStorage) {
      return new mod.AsyncLocalStorage<TraceContext>();
    }
  } catch {
    // Fallback to explicit context
  }
  return null;
}

const traceAsyncStorage = initTraceStorage();

const SENSITIVE_KEY_PATTERN =
  /(^|[._-])(authorization|cookie|set-cookie|token|rawtoken|secret|api[_-]?key|password|bearer|auth|authheader|privkey|secretkey|jwt)($|[._-])|secretkey|apikey|auth_token|password/i;

export function redactSensitiveData(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    if (/^bearer\s+[a-zA-Z0-9._~+/-]+=*$/i.test(value)) {
      return 'Bearer [REDACTED]';
    }
    if (/[?&](token|key|api_key|secret|password|auth)=[^&]+/i.test(value)) {
      return value.replace(/([?&](token|key|api_key|secret|password|auth)=)[^&]+/gi, '$1[REDACTED]');
    }
    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item, seen));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, entryVal] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = redactSensitiveData(entryVal, seen);
    }
  }
  return sanitized;
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function runWithTraceContext<T>(ctx: TraceContext, fn: () => T): T {
  if (traceAsyncStorage) {
    return traceAsyncStorage.run(ctx, fn);
  }
  const previous = StructuredLogger.getTraceContext();
  StructuredLogger.setTraceContext(ctx);
  try {
    return fn();
  } finally {
    StructuredLogger.setTraceContext(previous);
  }
}

export function getTraceContext(): TraceContext | undefined {
  return traceAsyncStorage?.getStore() ?? StructuredLogger.getTraceContext();
}

export class StructuredLogger {
  private readonly serviceName: string;
  private readonly buffer: LogEntry[] = [];
  private static globalCorrelationId = '00000000-0000-4000-8000-000000000000';
  private static activeTraceContext?: TraceContext;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  public static generateCorrelationId(): string {
    if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    return `corr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  public static generateTraceId(): string {
    let hex = randomHex(16);
    if (/^0+$/.test(hex)) hex = `${hex.slice(0, 31)}1`;
    return hex;
  }

  public static generateSpanId(): string {
    let hex = randomHex(8);
    if (/^0+$/.test(hex)) hex = `${hex.slice(0, 15)}1`;
    return hex;
  }

  public static setTraceContext(ctx: TraceContext | undefined): void {
    StructuredLogger.activeTraceContext = ctx;
  }

  public static getTraceContext(): TraceContext | undefined {
    return traceAsyncStorage?.getStore() ?? StructuredLogger.activeTraceContext;
  }

  public static parseTraceParent(traceparent: string): { traceId: string; spanId: string; traceFlags: number } | undefined {
    // W3C traceparent: version(2)-traceId(32)-spanId(16)-flags(2)
    const match = traceparent.trim().match(/^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i);
    if (!match) return undefined;
    const traceId = match[1]!.toLowerCase();
    const spanId = match[2]!.toLowerCase();
    if (/^0+$/.test(traceId) || /^0+$/.test(spanId)) {
      return undefined;
    }
    return {
      traceId,
      spanId,
      traceFlags: Number.parseInt(match[3]!, 16),
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
    const traceCtx = StructuredLogger.getTraceContext();
    const sanitizedDetails =
      details !== undefined
        ? (redactSensitiveData(details) as Record<string, unknown>)
        : undefined;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      correlationId: correlationId ?? traceCtx?.traceId ?? StructuredLogger.globalCorrelationId,
      ...(traceCtx?.traceId ? { traceId: traceCtx.traceId } : {}),
      ...(traceCtx?.spanId ? { spanId: traceCtx.spanId } : {}),
      ...(traceCtx?.parentSpanId ? { parentSpanId: traceCtx.parentSpanId } : {}),
      message,
      ...(durationMs !== undefined ? { durationMs } : {}),
      ...(sanitizedDetails !== undefined ? { details: Object.freeze({ ...sanitizedDetails }) } : {}),
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
