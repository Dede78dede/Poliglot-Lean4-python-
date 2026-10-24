/**
 * Structured JSON Logger Facade (Phase 10.9, Task N3)
 *
 * Emits uniform JSON log entries containing correlationId, service,
 * timestamp, log level, durationMs, and structured metadata.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly service: string;
  readonly correlationId: string;
  readonly message: string;
  readonly durationMs?: number;
  readonly details?: Readonly<Record<string, unknown>>;
}

export class StructuredLogger {
  private readonly serviceName: string;
  private readonly buffer: LogEntry[] = [];
  private static globalCorrelationId = '00000000-0000-4000-8000-000000000000';

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  public static generateCorrelationId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `corr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      correlationId: correlationId ?? StructuredLogger.globalCorrelationId,
      message,
      ...(durationMs !== undefined ? { durationMs } : {}),
      ...(details !== undefined ? { details: Object.freeze({ ...details }) } : {}),
    };

    this.buffer.push(entry);
    if (this.buffer.length > 500) {
      this.buffer.shift();
    }

    return entry;
  }

  public info(message: string, correlationId?: string, details?: Readonly<Record<string, unknown>>, durationMs?: number): LogEntry {
    return this.log('info', message, correlationId, details, durationMs);
  }

  public warn(message: string, correlationId?: string, details?: Readonly<Record<string, unknown>>, durationMs?: number): LogEntry {
    return this.log('warn', message, correlationId, details, durationMs);
  }

  public error(message: string, correlationId?: string, details?: Readonly<Record<string, unknown>>, durationMs?: number): LogEntry {
    return this.log('error', message, correlationId, details, durationMs);
  }

  public debug(message: string, correlationId?: string, details?: Readonly<Record<string, unknown>>, durationMs?: number): LogEntry {
    return this.log('debug', message, correlationId, details, durationMs);
  }

  public getRecentLogs(): readonly LogEntry[] {
    return Object.freeze([...this.buffer]);
  }
}

export function createLogger(serviceName: string): StructuredLogger {
  return new StructuredLogger(serviceName);
}

export const appLogger = createLogger('polyglot-studio');
