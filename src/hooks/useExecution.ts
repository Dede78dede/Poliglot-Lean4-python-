import { useCallback } from 'react';
import type { ExecutionRequest, ExecutionResult } from '../types/execution';
import { ExecutionError } from '../types/execution';
import { executeCode } from '../services/execution-orchestrator';
import { usePyodideContext } from '../context/PyodideContext';
import { executionStore } from '../services/execution/execution-store';
import { useStoreSelector } from '../services/stores/use-store-selector';

export function useExecution() {
  const state = useStoreSelector(executionStore, (s) => s);
  const pyodide = usePyodideContext();

  const runCode = useCallback(
    async (request: ExecutionRequest): Promise<ExecutionResult> => {
      executionStore.startExecution(request.language);

      try {
        const result = await executeCode(request, pyodide);
        executionStore.completeExecution(result, request.language);
        return result;
      } catch (err: unknown) {
        const error =
          err instanceof ExecutionError
            ? err
            : new ExecutionError(
                'INVALID_REQUEST',
                err instanceof Error ? err.message : String(err),
              );

        executionStore.failExecution(error, request.language);
        throw error;
      }
    },
    [pyodide],
  );

  const reset = useCallback(() => {
    executionStore.reset();
  }, []);

  return {
    state,
    runCode,
    reset,
  } as const;
}
