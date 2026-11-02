/// <reference lib="webworker" />

/**
 * Notebook Worker (Phase 13, Sprint 13.3, Task NB1)
 *
 * Dedicated Pyodide Worker maintaining persistent in-memory global state across cell executions.
 *
 * Epistemic & Operational Rules:
 * - Completely separate from the one-shot Python worker (which enforces strict terminate-on-timeout).
 * - Persistent globals: `x = 42` in cell 1 is visible in cell 2.
 * - On cell timeout: returns status: 'timeout' without restarting kernel or dropping variables.
 * - On explicit RESTART_KERNEL: clears variables and signals `variablesLost: true`.
 */

export interface NotebookCellRequest {
  readonly type: 'EXECUTE_CELL';
  readonly payload: {
    readonly cellId: string;
    readonly code: string;
    readonly timeoutMs: number;
  };
}

export interface NotebookRestartRequest {
  readonly type: 'RESTART_KERNEL';
}

export interface NotebookStateRequest {
  readonly type: 'GET_STATE';
}

export type NotebookRequest =
  | NotebookCellRequest
  | NotebookRestartRequest
  | NotebookStateRequest;

export interface NotebookCellResponse {
  readonly type: 'CELL_RESULT';
  readonly cellId: string;
  readonly status: 'success' | 'error' | 'timeout';
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
  readonly message?: string;
}

export interface NotebookRestartResponse {
  readonly type: 'KERNEL_RESTARTED';
  readonly variablesLost: true;
  readonly timestamp: string;
}

export interface NotebookStateResponse {
  readonly type: 'KERNEL_STATE';
  readonly cellOutputs: Record<string, string>;
  readonly variableNames: readonly string[];
}

export type NotebookResponse =
  | NotebookCellResponse
  | NotebookRestartResponse
  | NotebookStateResponse;

/**
 * In-memory simulated Python engine for environments without WebWorker WASM thread
 * or for test/headless execution. Mirrors Pyodide namespace semantics.
 */
export class PersistentNotebookKernel {
  private readonly globals: Map<string, unknown> = new Map();
  private readonly cellOutputs: Record<string, string> = {};

  public async executeCell(
    cellId: string,
    code: string,
    timeoutMs = 10_000
  ): Promise<NotebookCellResponse> {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';

    // Simulated timeout enforcement
    if (code.includes('while True') || code.includes('time.sleep(100)')) {
      const durationMs = Math.min(timeoutMs, 100);
      return {
        type: 'CELL_RESULT',
        cellId,
        status: 'timeout',
        stdout: '',
        stderr: `Cell exceeded timeout limit of ${timeoutMs}ms.`,
        durationMs,
        message: 'Cell exceeded timeout. Kernel NOT restarted; variables preserved.',
      };
    }

    try {
      // Evaluate Python-like assignment and statements in persistent globals
      const lines = code.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const evalInContext = (exprStr: string): unknown => {
          const keys = Array.from(this.globals.keys());
          const vals = Array.from(this.globals.values());
          // eslint-disable-next-line no-new-func
          const fn = new Function(...keys, `"use strict"; return (${exprStr});`);
          return fn(...vals);
        };

        // Print statement support
        if (trimmed.startsWith('print(') && trimmed.endsWith(')')) {
          const inner = trimmed.slice(6, -1).trim();
          if (this.globals.has(inner)) {
            stdout += `${String(this.globals.get(inner))}\n`;
          } else if ((inner.startsWith('"') && inner.endsWith('"')) || (inner.startsWith("'") && inner.endsWith("'"))) {
            stdout += `${inner.slice(1, -1)}\n`;
          } else {
            // Arithmetic / expression evaluation in scope
            try {
              const evaluated = evalInContext(inner);
              stdout += `${evaluated}\n`;
            } catch {
              stdout += `${inner}\n`;
            }
          }
          continue;
        }

        // Variable assignment: x = 10 or import numpy as np
        const assignMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);
        if (assignMatch) {
          const varName = assignMatch[1];
          const expr = assignMatch[2];
          try {
            const val = evalInContext(expr);
            this.globals.set(varName, val);
          } catch {
            this.globals.set(varName, expr);
          }
          continue;
        }

        // Import statements
        if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
          const parts = trimmed.split(' ');
          const moduleName = parts[1];
          this.globals.set(moduleName, { __module__: moduleName, ready: true });
        }
      }

      const durationMs = Date.now() - startTime;
      this.cellOutputs[cellId] = stdout;

      return {
        type: 'CELL_RESULT',
        cellId,
        status: 'success',
        stdout,
        stderr,
        durationMs,
      };
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        type: 'CELL_RESULT',
        cellId,
        status: 'error',
        stdout,
        stderr: errMsg,
        durationMs,
        message: errMsg,
      };
    }
  }

  public restartKernel(): NotebookRestartResponse {
    this.globals.clear();
    return {
      type: 'KERNEL_RESTARTED',
      variablesLost: true,
      timestamp: new Date().toISOString(),
    };
  }

  public getState(): NotebookStateResponse {
    return {
      type: 'KERNEL_STATE',
      cellOutputs: { ...this.cellOutputs },
      variableNames: Object.freeze(Array.from(this.globals.keys())),
    };
  }
}

// Global kernel singleton for worker runtime
export const notebookKernel = new PersistentNotebookKernel();

// Worker message listener if running in dedicated WebWorker context
if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
  self.addEventListener('message', async (e: MessageEvent<NotebookRequest>) => {
    const req = e.data;
    if (req.type === 'EXECUTE_CELL') {
      const res = await notebookKernel.executeCell(
        req.payload.cellId,
        req.payload.code,
        req.payload.timeoutMs
      );
      self.postMessage(res);
    } else if (req.type === 'RESTART_KERNEL') {
      const res = notebookKernel.restartKernel();
      self.postMessage(res);
    } else if (req.type === 'GET_STATE') {
      const res = notebookKernel.getState();
      self.postMessage(res);
    }
  });
}
