import type { ExecutionRequest, ExecutionResult } from '../types/execution';
import { ExecutionError } from '../types/execution';
import type { UsePyodideReturn } from '../hooks/usePyodide';
import { executePython } from './python-executor';
import { executeLean } from './lean-executor';

export async function executeCode(
  request: ExecutionRequest,
  pyodideExecutor?: UsePyodideReturn,
): Promise<ExecutionResult> {
  switch (request.language) {
    case 'python':
      return executePython(request, pyodideExecutor);
    case 'lean4':
      return executeLean(request);
    default: {
      const exhaustiveCheck: never = request.language;
      throw new ExecutionError(
        'INVALID_REQUEST',
        `Unsupported programming language: ${String(exhaustiveCheck)}`,
      );
    }
  }
}
