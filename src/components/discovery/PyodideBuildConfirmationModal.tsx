import React, { useState } from 'react';
import { Hammer, X, AlertTriangle, ShieldCheck, Terminal, CheckCircle2 } from 'lucide-react';
import { pyodideBuildService, type PyodideBuildResult } from '../../services/discovery/pyodide-build-service';

export interface PyodideBuildConfirmationModalProps {
  readonly isOpen: boolean;
  readonly packageName: string;
  readonly version?: string;
  readonly onClose: () => void;
  readonly onBuildComplete?: (result: PyodideBuildResult) => void;
}

export function PyodideBuildConfirmationModal({
  isOpen,
  packageName,
  version = 'latest',
  onClose,
  onBuildComplete,
}: PyodideBuildConfirmationModalProps): React.JSX.Element | null {
  const [isBuilding, setIsBuilding] = useState(false);
  const [toolchain, setToolchain] = useState<'pyodide-build-cli' | 'cibuildwheel'>('pyodide-build-cli');
  const [cibuildwheelVersion, setCibuildwheelVersion] = useState('4.0.0');
  const [buildResult, setBuildResult] = useState<PyodideBuildResult | null>(null);

  if (!isOpen) return null;

  const toolchainEvaluation = pyodideBuildService.evaluateToolchain(toolchain, cibuildwheelVersion);

  const handleStartBuild = async () => {
    setIsBuilding(true);
    setBuildResult(null);

    const result = await pyodideBuildService.buildPackage({
      packageName,
      version,
      toolchain,
      cibuildwheelVersion: toolchain === 'cibuildwheel' ? cibuildwheelVersion : undefined,
    });

    setIsBuilding(false);
    setBuildResult(result);
    if (onBuildComplete) {
      onBuildComplete(result);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 font-sans text-slate-200">
      <div className="w-full max-w-xl bg-[#0c1017] border border-slate-800 shadow-2xl rounded-none flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-[#0e1420] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-950/60 border border-amber-600/40 flex items-center justify-center text-amber-400">
              <Hammer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
                  Build WebAssembly Wheel from Source
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pyodide Emscripten 5.0.3 compilation fallback pipeline
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3.5 bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400 uppercase tracking-wider text-[11px]">Target Package</span>
              <span className="font-mono font-medium text-slate-100">{packageName} == {version}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400 uppercase tracking-wider text-[11px]">Platform ABI Target</span>
              <span className="font-mono text-cyan-400">pyemscripten_2026_0_wasm32</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-400 uppercase tracking-wider text-[11px]">Runtime Compiler</span>
              <span className="font-mono text-slate-300">CPython 3.14 · Emscripten 5.0.3</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">Build Toolchain Selection</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setToolchain('pyodide-build-cli')}
                className={`p-2.5 text-left border transition-colors ${
                  toolchain === 'pyodide-build-cli'
                    ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300'
                    : 'border-slate-800 bg-[#0a0d14] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-medium text-slate-200">pyodide-build CLI</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Recommended direct compiler</div>
              </button>
              <button
                type="button"
                onClick={() => setToolchain('cibuildwheel')}
                className={`p-2.5 text-left border transition-colors ${
                  toolchain === 'cibuildwheel'
                    ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300'
                    : 'border-slate-800 bg-[#0a0d14] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-medium text-slate-200">cibuildwheel</div>
                <div className="text-[11px] text-slate-500 mt-0.5">CI multi-platform runner</div>
              </button>
            </div>
          </div>

          {/* Correction C3 Toolchain Warning */}
          {toolchain === 'cibuildwheel' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-slate-400 text-[11px]">cibuildwheel version:</label>
                <input
                  type="text"
                  value={cibuildwheelVersion}
                  onChange={(e) => setCibuildwheelVersion(e.target.value)}
                  className="px-2 py-0.5 bg-slate-900 border border-slate-700 font-mono text-slate-200 text-xs w-24"
                />
              </div>
              {toolchainEvaluation.warning && (
                <div className="p-3 bg-amber-950/30 border border-amber-800/40 text-amber-300 text-[11px] flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-semibold">Toolchain Warning: </span>
                    {toolchainEvaluation.warning}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="p-3 bg-slate-900/40 border border-slate-800 text-slate-400 text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Compilation Isolation & Sandbox Notice</span>
            </div>
            <p>
              Source builds execute in a constrained containerized worker. Complex C/C++ packages with non-standard system dependencies may require custom Emscripten compile flags.
            </p>
          </div>

          {/* Build Output Logs if any */}
          {buildResult && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 uppercase tracking-wider text-[11px]">Build Status</span>
                <span className={`font-mono ${buildResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {buildResult.success ? 'COMPLETED (200 OK)' : 'FAILED'}
                </span>
              </div>
              <div className="p-3 bg-[#06080d] border border-slate-800 font-mono text-[11px] max-h-36 overflow-y-auto space-y-1">
                {buildResult.logs.map((log, i) => (
                  <div key={i} className={log.includes('[ERROR]') ? 'text-rose-400' : log.includes('[WARN]') ? 'text-amber-400' : 'text-slate-400'}>
                    {log}
                  </div>
                ))}
                {buildResult.error && (
                  <div className="text-rose-400 font-semibold">{buildResult.error}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-[#0e1420] flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono">
            PEP 783 · pyemscripten_2026_0_wasm32
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isBuilding}
              className="px-3.5 py-1.5 border border-slate-700 text-slate-300 hover:text-slate-100 hover:bg-slate-800 text-xs font-medium transition-colors"
            >
              Cancel / Keep Verified Only
            </button>
            <button
              type="button"
              onClick={handleStartBuild}
              disabled={isBuilding}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isBuilding ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Building WASM Wheel...
                </>
              ) : buildResult?.success ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Wheel Ready
                </>
              ) : (
                <>
                  <Hammer className="w-3.5 h-3.5" />
                  Build WASM Wheel
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
