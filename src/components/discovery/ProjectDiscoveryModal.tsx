import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  Compass,
  Sparkles,
  Star,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  Info,
  Layers,
} from 'lucide-react';
import type {
  DiscoveryEcosystem,
  PackageMetadata,
  ToolchainCompatibilityReport,
} from '../../types/discovery';
import {
  CURATED_PACKAGES,
  discoveryEngine,
} from '../../services/discovery/DiscoveryEngine';
import type { Project, ProjectFile } from '../../types/projects';

export interface ProjectDiscoveryModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onImportProject: (project: Project, report: ToolchainCompatibilityReport) => void;
}

export function ProjectDiscoveryModal({
  isOpen,
  onClose,
  onImportProject,
}: ProjectDiscoveryModalProps): React.JSX.Element | null {
  const [searchQuery, setSearchQuery] = useState('');
  const [ecosystem, setEcosystem] = useState<DiscoveryEcosystem>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [packages, setPackages] = useState<readonly PackageMetadata[]>(CURATED_PACKAGES);
  const [loading, setLoading] = useState(false);
  const [expandedPackageId, setExpandedPackageId] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Query packages with debounce
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const timer = setTimeout(() => {
      void discoveryEngine.search(searchQuery, ecosystem).then((res) => {
        setPackages(res.packages);
        setLoading(false);
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, ecosystem, isOpen]);

  // Categories list derived from curated packages
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of CURATED_PACKAGES) {
      set.add(p.category);
    }
    return ['all', ...Array.from(set)];
  }, []);

  // Filter packages by selected category
  const filteredPackages = useMemo(() => {
    if (selectedCategory === 'all') return packages;
    return packages.filter((p) => p.category === selectedCategory);
  }, [packages, selectedCategory]);

  if (!isOpen) return null;

  const handleImport = (pkg: PackageMetadata) => {
    const report = discoveryEngine.evaluatePackageCompatibility(pkg);
    const now = new Date().toISOString();

    const projectFiles: ProjectFile[] = pkg.files.map((f) => ({
      path: f.path,
      content: f.content,
      language: f.language,
      isDirty: false,
    }));

    const project: Project = {
      id: crypto.randomUUID(),
      name: pkg.name,
      type: pkg.ecosystem === 'lean4' ? 'lean4' : 'python',
      files: projectFiles,
      createdAt: now,
      updatedAt: now,
      isPinned: false,
    };

    onImportProject(project, report);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="discovery-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#0d121c] border border-neutral-800 rounded-xl shadow-2xl text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#090d15]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-800/60 text-blue-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 id="discovery-modal-title" className="text-base font-bold text-white tracking-tight">
                Esplora Progetti Open Source & Dipendenze
              </h2>
              <p className="text-xs text-neutral-400">
                Lean Reservoir, Mathlib 4 e pacchetti scientifici WebAssembly con analisi automatica della toolchain
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="p-4 border-b border-neutral-800 bg-[#0b1018] space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca per nome, tag, teoria (es. topology, logic, sympy, z3)..."
                className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#070a10] border border-neutral-700 hover:border-neutral-600 focus:border-blue-500 text-xs text-white placeholder-neutral-500 outline-none transition-colors font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Ecosystem Selector */}
            <div className="flex rounded-lg bg-[#070a10] border border-neutral-700 p-0.5 text-xs font-medium shrink-0">
              <button
                type="button"
                onClick={() => setEcosystem('all')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  ecosystem === 'all'
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'text-neutral-400 hover:text-slate-200'
                }`}
              >
                Tutti ({CURATED_PACKAGES.length})
              </button>
              <button
                type="button"
                onClick={() => setEcosystem('lean4')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  ecosystem === 'lean4'
                    ? 'bg-blue-900/60 text-blue-300 font-semibold'
                    : 'text-neutral-400 hover:text-slate-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                <span>Lean 4</span>
              </button>
              <button
                type="button"
                onClick={() => setEcosystem('python')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  ecosystem === 'python'
                    ? 'bg-emerald-950/70 text-emerald-300 font-semibold'
                    : 'text-neutral-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Python WASM</span>
              </button>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-1">
            <span className="text-neutral-500 mr-1 flex items-center gap-1 shrink-0">
              <Layers className="w-3 h-3" /> Categorie:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-0.5 rounded-md capitalize transition-colors shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-neutral-700 text-white font-semibold'
                    : 'bg-neutral-900/80 border border-neutral-800 text-neutral-400 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? 'Tutte' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#090d15]/50">
          {loading && (
            <div className="py-12 text-center text-xs text-neutral-500">
              Caricamento pacchetti in corso...
            </div>
          )}

          {!loading && filteredPackages.length === 0 && (
            <div className="py-16 text-center space-y-2">
              <Info className="w-8 h-8 text-neutral-600 mx-auto" />
              <p className="text-xs text-neutral-400">Nessun progetto trovato per i criteri specificati.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setEcosystem('all');
                  setSelectedCategory('all');
                }}
                className="text-xs text-blue-400 hover:underline"
              >
                Reimposta filtri di ricerca
              </button>
            </div>
          )}

          {!loading &&
            filteredPackages.map((pkg) => {
              const report = discoveryEngine.evaluatePackageCompatibility(pkg);
              const isExpanded = expandedPackageId === pkg.id;

              return (
                <div
                  key={pkg.id}
                  className="rounded-xl bg-[#0e1420] border border-neutral-800 hover:border-neutral-700 transition-all p-4 space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-white">{pkg.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400 font-mono">
                          v{pkg.version}
                        </span>

                        {pkg.ecosystem === 'lean4' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/70 border border-blue-800/80 text-[10px] text-blue-300 font-medium">
                            <Compass className="w-2.5 h-2.5" /> Lean 4
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/80 text-[10px] text-emerald-300 font-medium">
                            <Sparkles className="w-2.5 h-2.5" /> Python 3.14
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          {pkg.stars.toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-300 leading-relaxed">{pkg.description}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-start">
                      <a
                        href={pkg.repositoryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white transition-colors"
                        title="Vedi repository sorgente"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleImport(pkg)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Importa Progetto</span>
                      </button>
                    </div>
                  </div>

                  {/* Compatibility Badge Preview */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-800/60 text-xs">
                    {report.status === 'compatible' ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/50 border border-emerald-800/80 text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-medium">
                          {pkg.ecosystem === 'lean4'
                            ? `Compatibile (Lean ${report.currentVersion})`
                            : 'WASM Ready (Pyodide in-browser)'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/60 border border-amber-800/80 text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-medium">
                          {pkg.ecosystem === 'lean4'
                            ? `Toolchain non allineata (Richiede ${report.requiredVersion}, ambiente attuale ${report.currentVersion})`
                            : 'Pacchetti C/CUDA non supportati in WASM'}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-[11px] text-neutral-500">
                      <span>Autore:</span>
                      <span className="text-neutral-300 font-mono">{pkg.author}</span>
                      <span className="mx-1">•</span>
                      <span>Licenza:</span>
                      <span className="text-neutral-300 font-mono">{pkg.license}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedPackageId(isExpanded ? null : pkg.id)}
                      className="ml-auto flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <span>{isExpanded ? 'Nascondi dettagli' : 'Ispeziona dipendenze'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Expanded Dependency Inspection */}
                  {isExpanded && (
                    <div className="mt-2 p-3 rounded-lg bg-[#070a10] border border-neutral-800 text-xs space-y-2">
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                        <span>Analisi Dipendenze e Requisiti Toolchain</span>
                      </div>

                      {report.warning && (
                        <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[11px] font-mono leading-relaxed">
                          {report.warning}
                        </div>
                      )}

                      <div className="space-y-1 text-[11px] text-neutral-300 font-mono">
                        {report.notes.map((note, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="text-neutral-500">•</span>
                            <span>{note}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
                        <span>File inclusi nel template:</span>
                        <div className="flex gap-2">
                          {pkg.files.map((f) => (
                            <span key={f.path} className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono">
                              {f.path}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-[#090d15] flex items-center justify-between text-xs text-neutral-500">
          <div>
            Regola di verifica: <span className="font-mono text-neutral-300">verified: false</span> tassativo in caso di mismatch toolchain.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-slate-200 transition-colors font-medium"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
