import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExecutionResult } from '../types/execution';
import { ExecutionError } from '../types/execution';

export type PyodideReadyStatus = 'loading' | 'ready' | 'error';

export interface UsePyodideReturn {
  readonly status: PyodideReadyStatus;
  readonly error: string | null;
  readonly execute: (code: string, timeoutMs: number) => Promise<ExecutionResult>;
  readonly mountZip: (buffer: ArrayBuffer) => Promise<void>;
  readonly syncFiles: (files: readonly { path: string; content: string }[]) => Promise<void>;
  readonly resetWorker: () => void;
}

interface PendingExecution {
  resolve: (result: ExecutionResult) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

export function usePyodide(): UsePyodideReturn {
  const [status, setStatus] = useState<PyodideReadyStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<PendingExecution | null>(null);

  const initWorker = useCallback(() => {
    // Terminate existing worker if any
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    setStatus('loading');
    setError(null);

    const worker = new Worker(
      new URL('../workers/pyodide.worker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      switch (data.type) {
        case 'PYODIDE_READY':
          setStatus('ready');
          setError(null);
          break;
        case 'PYODIDE_ERROR':
          setStatus('error');
          setError(String(data.payload));
          if (pendingRef.current) {
            clearTimeout(pendingRef.current.timeoutId);
            pendingRef.current.reject(
              new ExecutionError('PYODIDE_LOAD_FAILED', String(data.payload)),
            );
            pendingRef.current = null;
          }
          break;
        case 'EXECUTION_RESULT':
          if (pendingRef.current) {
            clearTimeout(pendingRef.current.timeoutId);
            pendingRef.current.resolve(data.payload as ExecutionResult);
            pendingRef.current = null;
          }
          break;
        case 'EXECUTION_ERROR':
          if (pendingRef.current) {
            clearTimeout(pendingRef.current.timeoutId);
            pendingRef.current.reject(
              new ExecutionError('PYODIDE_EXECUTION_FAILED', String(data.payload)),
            );
            pendingRef.current = null;
          }
          break;
      }
    };

    worker.onerror = (evt) => {
      setStatus('error');
      setError(evt.message || 'Worker thread execution error');
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timeoutId);
        pendingRef.current.reject(
          new ExecutionError('PYODIDE_EXECUTION_FAILED', evt.message || 'Worker encountered fatal error'),
        );
        pendingRef.current = null;
      }
    };

    workerRef.current = worker;
    return worker;
  }, []);

  useEffect(() => {
    initWorker();

    return () => {
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timeoutId);
        pendingRef.current = null;
      }
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [initWorker]);

  const execute = useCallback(
    (code: string, timeoutMs: number): Promise<ExecutionResult> => {
      return new Promise<ExecutionResult>((resolve, reject) => {
        const worker = workerRef.current;
        if (!worker) {
          reject(new ExecutionError('PYODIDE_LOAD_FAILED', 'Pyodide worker is not initialized.'));
          return;
        }

        // Enforce hard timeout by terminating and recreating the worker
        const timeoutId = setTimeout(() => {
          console.warn(
            `[usePyodide] Execution timeout (${timeoutMs}ms) reached. Terminating Web Worker. ` +
              `Architectural Decision: Worker termination is utilized over setInterruptBuffer ` +
              `to guarantee unblocking in browser iframes without COOP/COEP isolation headers.`,
          );

          worker.terminate();

          if (pendingRef.current) {
            pendingRef.current.reject(
              new ExecutionError(
                'PYODIDE_TIMEOUT',
                `Python execution timed out after ${timeoutMs}ms. Worker was terminated to protect browser thread.`,
              ),
            );
            pendingRef.current = null;
          }

          // Spawn a fresh replacement worker
          initWorker();
        }, timeoutMs);

        pendingRef.current = { resolve, reject, timeoutId };

        worker.postMessage({
          type: 'EXECUTE',
          payload: { code, timeoutMs },
        });
      });
    },
    [initWorker],
  );

  const mountZip = useCallback((buffer: ArrayBuffer): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const worker = workerRef.current;
      if (!worker) {
        reject(new Error('Pyodide worker is not initialized.'));
        return;
      }

      const handler = (event: MessageEvent) => {
        if (event.data?.type === 'ZIP_MOUNTED_SUCCESS') {
          worker.removeEventListener('message', handler);
          resolve();
        } else if (event.data?.type === 'ZIP_MOUNTED_ERROR') {
          worker.removeEventListener('message', handler);
          reject(new Error(String(event.data.payload)));
        }
      };

      worker.addEventListener('message', handler);
      worker.postMessage({ type: 'MOUNT_ZIP', payload: { buffer } }, [buffer]);
    });
  }, []);

  const syncFiles = useCallback(
    (files: readonly { path: string; content: string }[]): Promise<void> => {
      return new Promise<void>((resolve, reject) => {
        const worker = workerRef.current;
        if (!worker) {
          reject(new Error('Pyodide worker is not initialized.'));
          return;
        }

        const handler = (event: MessageEvent) => {
          if (event.data?.type === 'FILES_WRITTEN_SUCCESS') {
            worker.removeEventListener('message', handler);
            resolve();
          } else if (event.data?.type === 'FILES_WRITTEN_ERROR') {
            worker.removeEventListener('message', handler);
            reject(new Error(String(event.data.payload)));
          }
        };

        worker.addEventListener('message', handler);
        worker.postMessage({ type: 'WRITE_FILES', payload: { files } });
      });
    },
    [],
  );

  const resetWorker = useCallback(() => {
    initWorker();
  }, [initWorker]);

  return { status, error, execute, mountZip, syncFiles, resetWorker };
}
