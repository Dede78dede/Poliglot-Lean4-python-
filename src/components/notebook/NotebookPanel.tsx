import React, { useState, useEffect } from 'react';
import {
  type Notebook,
  type NotebookCell,
  exportToIpynb,
  exportToPolyglotNotebook,
  importFromIpynb,
} from '../../types/notebook';
import { notebookKernel } from '../../workers/notebook.worker';
import { Play, RotateCcw, Plus, Download, Upload, Trash2, CheckCircle2, Clock } from 'lucide-react';

const INITIAL_NOTEBOOK: Notebook = {
  id: 'nb-initial',
  name: 'Interactive Formal Exploration',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  cells: [
    {
      id: 'cell-1',
      code: '# Cell 1: Persistent imports and variables\nimport numpy as np\nx = 42\nprint("Initialized x =", x)',
      output: 'Initialized x = 42\n',
      status: 'idle',
      durationMs: 14,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'cell-2',
      code: '# Cell 2: Accessing variables from previous cells\nprint("Accessed x from cell 1:")\nprint(x * 2)',
      output: 'Accessed x from cell 1:\n84\n',
      status: 'idle',
      durationMs: 18,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

export const NotebookPanel: React.FC = () => {
  const [notebook, setNotebook] = useState<Notebook>(INITIAL_NOTEBOOK);
  const [activeCellId, setActiveCellId] = useState<string>(INITIAL_NOTEBOOK.cells[0]?.id ?? '');
  const [kernelStatus, setKernelStatus] = useState<'ready' | 'running' | 'restarted'>('ready');
  const [runningCellId, setRunningCellId] = useState<string | null>(null);

  useEffect(() => {
    // Sync initial cell 1 variables into kernel on mount
    notebookKernel.executeCell(notebook.cells[0].id, notebook.cells[0].code).catch(() => {});
  }, []);

  const handleRunCell = async (cellId: string) => {
    const cell = notebook.cells.find((c) => c.id === cellId);
    if (!cell) return;

    setKernelStatus('running');
    setRunningCellId(cellId);

    setNotebook((prev) => ({
      ...prev,
      cells: prev.cells.map((c) => (c.id === cellId ? { ...c, status: 'running' } : c)),
    }));

    try {
      const res = await notebookKernel.executeCell(cell.id, cell.code);
      setNotebook((prev) => ({
        ...prev,
        cells: prev.cells.map((c) =>
          c.id === cellId
            ? {
                ...c,
                output: res.stdout + (res.stderr ? `\n[stderr]: ${res.stderr}` : ''),
                status: res.status,
                durationMs: res.durationMs,
                updatedAt: new Date().toISOString(),
              }
            : c
        ),
      }));
    } finally {
      setKernelStatus('ready');
      setRunningCellId(null);
    }
  };

  const handleRunAll = async () => {
    for (const cell of notebook.cells) {
      await handleRunCell(cell.id);
    }
  };

  const handleRestartKernel = () => {
    if (confirm('Restart kernel? All in-memory variables and state will be cleared.')) {
      notebookKernel.restartKernel();
      setKernelStatus('restarted');
      setTimeout(() => setKernelStatus('ready'), 3000);
    }
  };

  const handleAddCell = () => {
    const newCell: NotebookCell = {
      id: `cell-${Date.now()}`,
      code: '# New Python code cell\n',
      output: '',
      status: 'idle',
      durationMs: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotebook((prev) => ({
      ...prev,
      cells: [...prev.cells, newCell],
    }));
    setActiveCellId(newCell.id);
  };

  const handleDeleteCell = (cellId: string) => {
    if (notebook.cells.length <= 1) return;
    setNotebook((prev) => ({
      ...prev,
      cells: prev.cells.filter((c) => c.id !== cellId),
    }));
  };

  const handleExportIpynb = () => {
    const jsonStr = exportToIpynb(notebook);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${notebook.name.toLowerCase().replace(/\s+/g, '_')}.ipynb`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPolyglot = () => {
    const jsonStr = exportToPolyglotNotebook(notebook);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${notebook.name.toLowerCase().replace(/\s+/g, '_')}.polyglot-notebook`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans">
      {/* Top Bar Contract (3 zones) */}
      <header className="flex items-center justify-between gap-8 px-6 py-3 border-b border-slate-800 bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-tight text-white whitespace-nowrap">
            {notebook.name}
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {notebook.cells.length} cells · persistent Pyodide worker
          </span>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" />
            Run All
          </button>
          <button
            onClick={handleRestartKernel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restart Kernel
          </button>
          <button
            onClick={handleAddCell}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Cell
          </button>
          <button
            onClick={handleExportIpynb}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
            title="Export as standard Jupyter .ipynb"
          >
            <Download className="w-3.5 h-3.5" />
            .ipynb
          </button>
          <button
            onClick={handleExportPolyglot}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
            title="Export as .polyglot-notebook"
          >
            <Download className="w-3.5 h-3.5" />
            .polyglot
          </button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Kernel:</span>
          <span
            className={
              kernelStatus === 'running'
                ? 'text-amber-400'
                : kernelStatus === 'restarted'
                ? 'text-rose-400'
                : 'text-emerald-400'
            }
          >
            {kernelStatus === 'running'
              ? `Running cell ${runningCellId ?? ''}`
              : kernelStatus === 'restarted'
              ? 'Kernel Restarted'
              : 'Ready'}
          </span>
        </div>
      </header>

      {/* Main Cells Viewport */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {notebook.cells.map((cell, index) => {
          const isActive = cell.id === activeCellId;
          return (
            <div
              key={cell.id}
              onClick={() => setActiveCellId(cell.id)}
              className={`rounded-lg border transition-all ${
                isActive
                  ? 'border-indigo-500/50 bg-slate-900/90 shadow-sm'
                  : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
              }`}
            >
              {/* Cell Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-950/40 text-xs">
                <div className="flex items-center gap-2 font-mono text-slate-400">
                  <span className="text-indigo-400 font-semibold">[In {index + 1}]</span>
                  <span>cell_id: {cell.id}</span>
                  {cell.durationMs !== null && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span className="font-mono tabular-nums">{cell.durationMs}ms</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRunCell(cell.id);
                    }}
                    disabled={cell.status === 'running'}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    Run
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCell(cell.id);
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                    title="Delete cell"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Dual Editor & Output Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
                {/* Editor Column */}
                <div className="p-3">
                  <textarea
                    value={cell.code}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setNotebook((prev) => ({
                        ...prev,
                        cells: prev.cells.map((c) =>
                          c.id === cell.id ? { ...c, code: newCode } : c
                        ),
                      }));
                    }}
                    rows={Math.max(4, cell.code.split('\n').length + 1)}
                    className="w-full bg-slate-950/80 text-slate-100 font-mono text-xs p-3 rounded border border-slate-800/80 focus:outline-none focus:border-indigo-500 resize-y"
                    spellCheck={false}
                  />
                </div>

                {/* Output Column */}
                <div className="p-3 bg-slate-950/40">
                  <div className="text-xs text-slate-400 mb-1 flex items-center justify-between font-mono">
                    <span>Out [{index + 1}]:</span>
                    {cell.status === 'success' && (
                      <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3 h-3" />
                        Success
                      </span>
                    )}
                  </div>
                  <pre className="font-mono text-xs text-slate-200 bg-slate-950/90 p-3 rounded border border-slate-800/60 min-h-[72px] overflow-x-auto whitespace-pre-wrap">
                    {cell.output || <span className="text-slate-600 italic">No output yet. Click 'Run' to execute.</span>}
                  </pre>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
