/**
 * Notebook Data Model & Serialization (Phase 13, Sprint 13.3, Task NB2)
 *
 * Implements the domain model for interactive Python notebooks,
 * including .ipynb (Jupyter nbformat v4 subset) and native .polyglot-notebook formats.
 */

export interface NotebookCell {
  readonly id: string;
  readonly code: string;
  readonly output: string;
  readonly status: 'idle' | 'running' | 'success' | 'error' | 'timeout';
  readonly durationMs: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface Notebook {
  readonly id: string;
  readonly name: string;
  readonly cells: readonly NotebookCell[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface JupyterNotebookFormat {
  readonly nbformat: number;
  readonly nbformat_minor: number;
  readonly metadata: Record<string, unknown>;
  readonly cells: Array<{
    readonly cell_type: 'code';
    readonly execution_count: number | null;
    readonly metadata: Record<string, unknown>;
    readonly source: string[];
    readonly outputs: Array<{
      readonly output_type: 'stream';
      readonly name: 'stdout' | 'stderr';
      readonly text: string[];
    }>;
  }>;
}

/**
 * Serializes a Notebook into standard Jupyter .ipynb JSON string.
 */
export function exportToIpynb(notebook: Notebook): string {
  const jupyterData: JupyterNotebookFormat = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      language_info: {
        name: 'python',
        version: '3.14',
      },
      kernelspec: {
        name: 'python3',
        display_name: 'Python 3 (Polyglot Pyodide)',
      },
    },
    cells: notebook.cells.map((cell, idx) => {
      const codeStr = cell.code ?? (cell as unknown as { source?: string }).source ?? '';
      const outStr = cell.output ?? '';
      return {
        cell_type: 'code',
        execution_count: idx + 1,
        metadata: {},
        source: codeStr.split('\n').map((line, i, arr) => (i < arr.length - 1 ? `${line}\n` : line)),
        outputs: outStr
          ? [
              {
                output_type: 'stream',
                name: 'stdout',
                text: outStr.split('\n').map((line, i, arr) => (i < arr.length - 1 ? `${line}\n` : line)),
              },
            ]
          : [],
      };
    }),
  };

  return JSON.stringify(jupyterData, null, 2);
}

/**
 * Deserializes a Jupyter .ipynb string into Notebook format.
 */
export function importFromIpynb(content: string, name = 'Imported Notebook'): Notebook {
  const parsed = JSON.parse(content) as Partial<JupyterNotebookFormat>;
  const now = new Date().toISOString();

  const cells: NotebookCell[] = (parsed.cells ?? []).map((c, idx) => {
    const code = Array.isArray(c.source) ? c.source.join('') : String(c.source ?? '');
    const out = c.outputs
      ? c.outputs.map((o) => (Array.isArray(o.text) ? o.text.join('') : '')).join('')
      : '';

    return {
      id: `cell-${idx + 1}-${Date.now()}`,
      code,
      output: out,
      status: 'idle',
      durationMs: null,
      createdAt: now,
      updatedAt: now,
    };
  });

  return {
    id: `nb-${Date.now()}`,
    name,
    cells: Object.freeze(cells),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Native .polyglot-notebook JSON export
 */
export function exportToPolyglotNotebook(notebook: Notebook): string {
  return JSON.stringify({
    version: '1.0.0',
    type: 'polyglot-notebook',
    notebook,
  }, null, 2);
}

/**
 * Native .polyglot-notebook JSON import
 */
export function importFromPolyglotNotebook(content: string): Notebook {
  const parsed = JSON.parse(content) as { notebook: Notebook };
  if (!parsed.notebook || !Array.isArray(parsed.notebook.cells)) {
    throw new Error('INVALID_NOTEBOOK_FORMAT: Payload is not a valid .polyglot-notebook file.');
  }
  return parsed.notebook;
}
