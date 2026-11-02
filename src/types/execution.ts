import type { SupportedLanguage } from './language';
export type { SupportedLanguage };

export const EXECUTION_STATUSES = [
  'idle',
  'loading',
  'running',
  'success',
  'error',
  'timeout',
] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export interface ExecutionResult {
  readonly status: ExecutionStatus;
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
  readonly durationMs: number;
  readonly simulated?: boolean;
  readonly verified: boolean;
}

export interface ExecutionRequest {
  readonly language: SupportedLanguage;
  readonly code: string;
  readonly timeoutMs: number;
}

export const EXECUTION_ERROR_CODES = [
  'PYODIDE_LOAD_FAILED',
  'PYODIDE_EXECUTION_FAILED',
  'PYODIDE_TIMEOUT',
  'LEAN_BACKEND_UNREACHABLE',
  'LEAN_EXECUTION_FAILED',
  'LEAN_TIMEOUT',
  'INVALID_REQUEST',
] as const;

export type ExecutionErrorCode = (typeof EXECUTION_ERROR_CODES)[number];

export class ExecutionError extends Error {
  public readonly code: ExecutionErrorCode;
  public readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: ExecutionErrorCode,
    message: string,
    details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = 'ExecutionError';
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}

export type ExecutionState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading'; readonly message: string }
  | { readonly kind: 'running'; readonly startedAt: number; readonly language: SupportedLanguage }
  | { readonly kind: 'completed'; readonly result: ExecutionResult; readonly language: SupportedLanguage }
  | { readonly kind: 'failed'; readonly error: ExecutionError; readonly language: SupportedLanguage };
