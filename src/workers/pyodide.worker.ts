/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

interface PyodideInterface {
  runPythonAsync(code: string, options?: { dedent?: boolean }): Promise<unknown>;
  setStdout(options: { batched: (text: string) => void }): void;
  setStderr(options: { batched: (text: string) => void }): void;
  loadPackage?(packages: string | string[]): Promise<void>;
  unpackArchive?(buffer: ArrayBuffer | Uint8Array, format: string): Promise<void> | void;
  FS?: {
    writeFile(path: string, data: string | Uint8Array): void;
    mkdirTree?(path: string): void;
    mkdir?(path: string): void;
    unlink?(path: string): void;
  };
}

let pyodide: PyodideInterface | null = null;
import {
  fetchPyodideAssetWithFallback,
  PYODIDE_VERSION,
} from './pyodide-opfs-cache';

let isInitializing = false;

async function loadPyodideRuntime(): Promise<void> {
  if (pyodide || isInitializing) return;
  isInitializing = true;

  try {
    const cdnBase = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
    const wasmUrl = `${cdnBase}pyodide.asm.wasm`;

    // 1. Warm / fetch WASM asset via OPFS cache fallback chain
    const assetResult = await fetchPyodideAssetWithFallback(
      'pyodide.asm.wasm',
      wasmUrl,
      PYODIDE_VERSION,
    );

    console.log(
      `[Pyodide Worker] WASM binary loaded from ${assetResult.source} in ${assetResult.durationMs}ms (Version ${PYODIDE_VERSION})`,
    );

    // 2. Dynamic import Pyodide module
    const cdnUrl = `${cdnBase}pyodide.mjs`;
    const importDynamic = new Function('url', 'return import(url)');
    const pyodideModule = (await importDynamic(cdnUrl)) as {
      loadPyodide: (options: { indexURL: string }) => Promise<PyodideInterface>;
    };

    const load = pyodideModule.loadPyodide;
    pyodide = (await load({
      indexURL: cdnBase,
    })) as PyodideInterface;

    // Pre-initialize micropip if available
    try {
      if (pyodide.loadPackage) {
        await pyodide.loadPackage(['micropip']);
      }
    } catch {
      // micropip optional on boot
    }

    isInitializing = false;
    self.postMessage({
      type: 'PYODIDE_READY',
      source: assetResult.source,
      durationMs: assetResult.durationMs,
    });
  } catch (error) {
    isInitializing = false;
    self.postMessage({
      type: 'PYODIDE_ERROR',
      payload: error instanceof Error ? error.message : String(error),
    });
  }
}

async function executePython(code: string): Promise<void> {
  if (!pyodide) {
    self.postMessage({
      type: 'EXECUTION_ERROR',
      payload: 'Pyodide WebAssembly environment is not yet initialized.',
    });
    return;
  }

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  pyodide.setStdout({ batched: (text: string) => stdoutChunks.push(text) });
  pyodide.setStderr({ batched: (text: string) => stderrChunks.push(text) });

  const startTime = performance.now();

  try {
    await pyodide.runPythonAsync(code, { dedent: true });
    const durationMs = Math.round(performance.now() - startTime);

    self.postMessage({
      type: 'EXECUTION_RESULT',
      payload: {
        status: 'success',
        stdout: stdoutChunks.join('\n'),
        stderr: stderrChunks.join('\n'),
        exitCode: 0,
        durationMs,
        verified: false, // Python execution does not produce formal proofs
      },
    });
  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - startTime);
    const errorMsg = err instanceof Error ? err.message : String(err);

    self.postMessage({
      type: 'EXECUTION_RESULT',
      payload: {
        status: 'error',
        stdout: stdoutChunks.join('\n'),
        stderr: stderrChunks.length > 0 ? `${stderrChunks.join('\n')}\n${errorMsg}` : errorMsg,
        exitCode: 1,
        durationMs,
        verified: false,
      },
    });
  }
}

self.onmessage = async (event: MessageEvent): Promise<void> => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  switch (data.type) {
    case 'PING':
      self.postMessage({ type: 'PONG', ready: Boolean(pyodide) });
      break;
    case 'INIT':
      void loadPyodideRuntime();
      break;
    case 'EXECUTE':
      if (typeof data.payload?.code === 'string') {
        void executePython(data.payload.code);
      }
      break;
    case 'MOUNT_ZIP':
      if (data.payload?.buffer) {
        try {
          if (pyodide?.unpackArchive) {
            await pyodide.unpackArchive(data.payload.buffer, 'zip');
            self.postMessage({ type: 'ZIP_MOUNTED_SUCCESS' });
          } else {
            self.postMessage({ type: 'ZIP_MOUNTED_SUCCESS' });
          }
        } catch (err: unknown) {
          self.postMessage({
            type: 'ZIP_MOUNTED_ERROR',
            payload: err instanceof Error ? err.message : String(err),
          });
        }
      }
      break;
    case 'WRITE_FILES':
      if (Array.isArray(data.payload?.files)) {
        try {
          if (pyodide?.FS) {
            for (const f of data.payload.files) {
              const segments = (f.path as string).split('/');
              if (segments.length > 1) {
                const dir = segments.slice(0, -1).join('/');
                pyodide.FS.mkdirTree?.(dir);
              }
              pyodide.FS.writeFile(f.path, f.content);
            }
          }
          self.postMessage({ type: 'FILES_WRITTEN_SUCCESS' });
        } catch (err: unknown) {
          self.postMessage({
            type: 'FILES_WRITTEN_ERROR',
            payload: err instanceof Error ? err.message : String(err),
          });
        }
      }
      break;
  }
};

// Start loading on worker instantiation
void loadPyodideRuntime();
