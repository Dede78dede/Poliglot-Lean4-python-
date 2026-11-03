/**
 * Mock Pyodide Runtime (Phase 13.9, Task 05)
 *
 * Provides a mock Pyodide runtime for isolated worker/kernel testing
 * without requiring downloading the 20MB WASM binary during CI.
 */

export interface MockPyodideGlobals {
  get(name: string): unknown;
  set(name: string, value: unknown): void;
  delete(name: string): void;
  toJs(): Map<string, unknown>;
}

export interface MockPyodideInstance {
  runPython(code: string): unknown;
  runPythonAsync(code: string): Promise<unknown>;
  globals: MockPyodideGlobals;
  setInterruptBuffer(buffer: Int32Array): void;
  isMock: true;
}

export function createMockPyodide(): MockPyodideInstance {
  const variableStore = new Map<string, unknown>();

  const globals: MockPyodideGlobals = {
    get(name: string) {
      return variableStore.get(name);
    },
    set(name: string, value: unknown) {
      variableStore.set(name, value);
    },
    delete(name: string) {
      variableStore.delete(name);
    },
    toJs() {
      return new Map(variableStore);
    },
  };

  return {
    isMock: true,
    globals,
    setInterruptBuffer(_buffer: Int32Array) {},
    runPython(code: string) {
      // Basic evaluator simulation
      const lines = code.split('\n');
      let lastVal: unknown = null;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes('=')) {
          const [left, right] = trimmed.split('=').map(s => s.trim());
          const num = Number(right);
          const val = Number.isNaN(num) ? right.replace(/['"]/g, '') : num;
          variableStore.set(left, val);
          lastVal = val;
        } else if (trimmed.startsWith('print(')) {
          const expr = trimmed.slice(6, -1).trim();
          lastVal = variableStore.get(expr) ?? expr;
        }
      }
      return lastVal;
    },
    async runPythonAsync(code: string) {
      return this.runPython(code);
    },
  };
}
