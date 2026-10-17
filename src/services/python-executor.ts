import type { ExecutionRequest, ExecutionResult } from '../types/execution';
import { ExecutionError } from '../types/execution';
import type { UsePyodideReturn } from '../hooks/usePyodide';

export async function executePython(
  request: ExecutionRequest,
  executor?: UsePyodideReturn,
): Promise<ExecutionResult> {
  if (!executor) {
    throw new ExecutionError(
      'PYODIDE_LOAD_FAILED',
      'Pyodide executor context not provided. Ensure PyodideProvider wraps the component tree.',
    );
  }

  if (executor.status === 'loading') {
    throw new ExecutionError(
      'PYODIDE_LOAD_FAILED',
      'Pyodide WebAssembly runtime is still initializing. Please wait a moment.',
    );
  }

  if (executor.status === 'error') {
    throw new ExecutionError(
      'PYODIDE_LOAD_FAILED',
      `Pyodide failed to initialize: ${executor.error ?? 'Unknown error'}`,
    );
  }

  return executor.execute(request.code, request.timeoutMs);
}
