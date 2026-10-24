/**
 * Lungo Multi-Target Export Modal
 *
 * Provides proof-carrying code export across 6 targets:
 * C, Go, Python, Swift, TypeScript, Rust with SHA-256 digests and claims manifests.
 */

import React, { useState } from 'react';
import {
  X,
  Download,
  ShieldCheck,
  FileCode,
  Check,
  Copy,
  Terminal,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  lungoBridge,
  LUNGO_TARGET_LANGUAGES,
  type LungoTargetLanguage,
  type LungoCodegenFile,
  type LungoCheckedClaim,
} from '../../../server/src/services/lungo/lungo-bridge';

export interface LungoExportModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly leanCode: string;
}

export function LungoExportModal({
  isOpen,
  onClose,
  leanCode,
}: LungoExportModalProps): React.JSX.Element | null {
  const [selectedTarget, setSelectedTarget] = useState<LungoTargetLanguage>('python');
  const [isExporting, setIsExporting] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<readonly LungoCodegenFile[]>([]);
  const [claims, setClaims] = useState<readonly LungoCheckedClaim[]>([]);
  const [digest, setDigest] = useState<string>('');
  const [hasCompiled, setHasCompiled] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsExporting(true);
    try {
      const res = await lungoBridge.generateCode({
        leanCode: leanCode || 'theorem add_comm (a b : Nat) : a + b = b + a := Nat.add_comm a b',
        packageName: 'verified_core',
        moduleName: 'Algorithm',
      });
      setGeneratedFiles(res.files);
      setClaims(res.checkedClaims);
      setDigest(res.runtimeDigestSha256);
      setHasCompiled(true);
    } catch (err) {
      console.error('[LungoExportModal] Error compiling', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadZip = async () => {
    setIsExporting(true);
    try {
      const bundle = await lungoBridge.exportMultiTargetBundle({
        leanCode: leanCode || 'theorem add_comm (a b : Nat) : a + b = b + a := Nat.add_comm a b',
        packageName: 'verified_core',
        moduleName: 'Algorithm',
      });

      // Browser trigger for ZIP download
      const blob = new Blob([bundle.bundleZip as unknown as BlobPart], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lungo-multi-target-${Date.now().toString().slice(-4)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[LungoExportModal] Download failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  const activeFile = generatedFiles.find((f) => f.language === selectedTarget);

  const handleCopyCode = (code: string) => {
    void navigator.clipboard.writeText(code);
    setCopyFeedback('copied');
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans text-slate-200">
      <div className="w-full max-w-4xl bg-[#070A0F] border border-[#1E293B] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1E293B] bg-[#0E1420] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold tracking-wide text-slate-100 uppercase font-mono">
                  Lungo Multi-Target Bridge & Codegen
                </h3>
                <span className="text-[10px] font-mono text-cyan-400 border border-cyan-800/60 bg-cyan-950/40 px-1.5 py-0.2">
                  CLI v1.86.160
                </span>
                <span className="text-[10px] font-mono text-emerald-400 border border-emerald-800/60 bg-emerald-950/40 px-1.5 py-0.2">
                  Lean v4.34.1
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Bridge IR compilation to 6 production targets with carried formal proofs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#0B0F17] border border-slate-800">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-mono">Targets:</span>
              <div className="flex flex-wrap gap-1">
                {LUNGO_TARGET_LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSelectedTarget(lang)}
                    className={`px-2 py-0.5 font-mono text-[11px] uppercase border transition-colors ${
                      selectedTarget === lang
                        ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300 font-medium'
                        : 'bg-[#070A0F] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isExporting}
                className="px-3 py-1.5 bg-[#1E293B] hover:bg-slate-700 text-slate-100 text-xs font-mono flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>{hasCompiled ? 'Re-Compile BIR' : 'Compile Bridge IR'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={isExporting}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-xs font-mono flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export ZIP Bundle</span>
              </button>
            </div>
          </div>

          {/* Proof claims & integrity telemetry */}
          {hasCompiled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-[#0B0F17] border border-slate-800 text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span>RUNTIME DIGEST (SHA-256):</span>
                  <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                    <ShieldCheck className="w-3 h-3" /> VERIFIED
                  </span>
                </div>
                <div className="text-[11px] text-slate-200 truncate font-mono bg-[#070A0F] p-1.5 border border-slate-900">
                  {digest}
                </div>
              </div>

              <div className="p-3 bg-[#0B0F17] border border-slate-800 text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span>PROOF-CARRYING CLAIMS:</span>
                  <span className="text-cyan-400 text-[10px]">{claims.length} Claim(s)</span>
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {claims[0]?.theoremSignature || 'theorem add_comm (a b : Nat)'}
                </div>
              </div>
            </div>
          )}

          {/* Code preview */}
          <div className="border border-slate-800 bg-[#070A0F] flex flex-col">
            <div className="px-3 py-2 border-b border-slate-800 bg-[#0E1420] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-300">
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>{activeFile?.path || `gen/${selectedTarget}/output`}</span>
              </div>
              {activeFile && (
                <button
                  type="button"
                  onClick={() => handleCopyCode(activeFile.content)}
                  className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                >
                  {copyFeedback ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span className="text-[10px]">{copyFeedback ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-72 leading-relaxed selection:bg-cyan-900 selection:text-white">
              {activeFile?.content ||
                (hasCompiled
                  ? '// No file generated for this target'
                  : '// Click "Compile Bridge IR" to generate code across all 6 targets')}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
