import type { ExecutionErrorCode } from '../types/execution';

export interface ErrorMetadata {
  readonly title: string;
  readonly recovery: string;
}

export const ERROR_REGISTRY: Readonly<Record<ExecutionErrorCode, ErrorMetadata>> = Object.freeze({
  PYODIDE_LOAD_FAILED: Object.freeze({
    title: 'Pyodide WebAssembly initialization failed',
    recovery: 'Check your network connection to the CDN, disable restrictive content blockers, or refresh the page.',
  }),
  PYODIDE_EXECUTION_FAILED: Object.freeze({
    title: 'Python runtime error',
    recovery: 'Inspect the stderr trace below for syntax errors, missing variables, or unhandled exceptions.',
  }),
  PYODIDE_TIMEOUT: Object.freeze({
    title: 'Python execution timed out',
    recovery: 'The worker process was automatically terminated to prevent UI lockup. Check for infinite loops or increase the execution timeout in settings.',
  }),
  LEAN_BACKEND_UNREACHABLE: Object.freeze({
    title: 'Kimina Lean Server connection error',
    recovery: 'Ensure the backend server is running. In dev mode, adaptive simulation will engage automatically if enabled.',
  }),
  LEAN_EXECUTION_FAILED: Object.freeze({
    title: 'Lean 4 elaboration or typecheck error',
    recovery: 'Inspect the Infoview or stderr output for unsatisfied goals, unsolved typeclass instances, or syntax errors.',
  }),
  LEAN_TIMEOUT: Object.freeze({
    title: 'Lean 4 verification timed out',
    recovery: 'Complex tactic automation (e.g. omega, aesop) may require more steps. Break down proof lemmas or raise timeoutMs.',
  }),
  INVALID_REQUEST: Object.freeze({
    title: 'Invalid execution request',
    recovery: 'The payload exceeded the 100,000 character limit or specified an invalid execution parameter.',
  }),
});
