import React, { useState, useMemo } from 'react';
import { Search, X, Compass, Sparkles, ArrowRight, Tag } from 'lucide-react';
import { FULL_GALLERY_EXAMPLES, type CodeExample } from '../../examples/example-registry';
import type { SupportedLanguage } from '../../types/language';

export interface GalleryModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSelectExample: (example: CodeExample) => void;
}

export default function GalleryModal({
  isOpen,
  onClose,
  onSelectExample,
}: GalleryModalProps): React.JSX.Element | null {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLang, setSelectedLang] = useState<'all' | SupportedLanguage>('all');
  const [selectedDiff, setSelectedDiff] = useState<'all' | string>('all');

  const filteredExamples = useMemo(() => {
    return FULL_GALLERY_EXAMPLES.filter((item) => {
      if (selectedLang !== 'all' && item.language !== selectedLang) return false;
      if (selectedDiff !== 'all' && item.difficulty !== selectedDiff) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [searchTerm, selectedLang, selectedDiff]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gallery-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[85vh] bg-[#0d131f] border border-neutral-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#090d15]">
          <div>
            <h2 id="gallery-modal-title" className="text-lg font-semibold text-white">
              Example & Proof Gallery
            </h2>
            <p className="text-xs text-slate-400">
              Browse interactive theorem proofs, algorithms, and scientific templates
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close gallery"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-neutral-800 bg-[#0f172a]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by topic, tactic, tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-neutral-900 border border-neutral-700 text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Language filter */}
          <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => setSelectedLang('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                selectedLang === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedLang('lean4')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                selectedLang === 'lean4' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3 h-3" />
              <span>Lean 4</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedLang('python')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                selectedLang === 'python' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Python</span>
            </button>
          </div>

          {/* Difficulty filter */}
          <div className="flex items-center gap-1 text-xs">
            {['all', 'beginner', 'intermediate', 'advanced'].map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setSelectedDiff(diff)}
                className={`px-2 py-1 rounded text-[11px] capitalize transition-colors ${
                  selectedDiff === diff
                    ? 'bg-neutral-800 text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Items Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredExamples.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500">
              No examples match your search criteria.
            </div>
          ) : (
            filteredExamples.map((item) => (
              <div
                key={item.id}
                className="flex flex-col p-4 rounded-xl bg-[#111827] border border-neutral-800 hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    {item.language === 'lean4' ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-blue-400">
                        <Compass className="w-3.5 h-3.5" />
                        <span>Lean 4</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Python</span>
                      </span>
                    )}
                    <span className="text-slate-600 text-xs">·</span>
                    <span className="text-[11px] capitalize text-slate-400">{item.difficulty}</span>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono">{item.category}</span>
                </div>

                <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3 flex-1">
                  {item.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-neutral-900 text-slate-400 border border-neutral-800"
                    >
                      <Tag className="w-2.5 h-2.5 text-slate-500" />
                      <span>{t}</span>
                    </span>
                  ))}
                </div>

                {/* Load Button */}
                <button
                  type="button"
                  onClick={() => onSelectExample(item)}
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-blue-600 text-slate-200 hover:text-white text-xs font-medium transition-colors"
                >
                  <span>Load into Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
