import { useCallback, useReducer } from 'react';
import type { ExecutionRequest, ExecutionResult, ExecutionState } from '../types/execution';
import { ExecutionError } from '../types/execution';
import { executeCode } from '../services/execution-orchestrator';
import { usePyodideContext } from '../context/PyodideContext';

type ExecutionAction =
  | { type: 'EXECUTE_START'; language: ExecutionRequest['language'] }
  | { type: 'EXECUTE_SUCCESS'; result: ExecutionResult; language: ExecutionRequest['language'] }
  | { type: 'EXECUTE_ERROR'; error: ExecutionError; language: ExecutionRequest['language'] }
  | { type: 'RESET' };

function executionReducer(state: ExecutionState, action: ExecutionAction): ExecutionState {
  switch (action.type) {
    case 'EXECUTE_START':
      return {
        kind: 'running',
        startedAt: Date.now(),
        language: action.language,
      };
    case 'EXECUTE_SUCCESS':
      return {
        kind: 'completed',
        result: action.result,
        language: action.language,
      };
    case 'EXECUTE_ERROR':
      return {
        kind: 'failed',
        error: action.error,
        language: action.language,
      };
    case 'RESET':
      return { kind: 'idle' };
    default:
      return state;
  }
}

export function useExecution() {
  const [state, dispatch] = useReducer(executionReducer, { kind: 'idle' });
  const pyodide = usePyodideContext();

  const runCode = useCallback(
    async (request: ExecutionRequest): Promise<ExecutionResult> => {
      dispatch({ type: 'EXECUTE_START', language: request.language });

      try {
        const result = await executeCode(request, pyodide);
        dispatch({ type: 'EXECUTE_SUCCESS', result, language: request.language });
        return result;
      } catch (err: unknown) {
        const error =
          err instanceof ExecutionError
            ? err
            : new ExecutionError(
                'INVALID_REQUEST',
                err instanceof Error ? err.message : String(err),
              );

        dispatch({ type: 'EXECUTE_ERROR', error, language: request.language });
        throw error;
      }
    },
    [pyodide],
  );

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    state,
    runCode,
    reset,
  } as const;
}
