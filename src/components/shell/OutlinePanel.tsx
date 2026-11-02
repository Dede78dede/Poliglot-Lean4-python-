import React, { useState, useMemo } from 'react';
import {
  Search,
  Tag,
  Code2,
  Box,
  Compass,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';
import type { SupportedLanguage } from '../../types/language';
import {
  extractSymbolsFromCode,
  type DocumentSymbol,
  type SymbolKind,
} from '../../services/editor/symbol-service';

export interface OutlinePanelProps {
  readonly code: string;
  readonly language: SupportedLanguage;
  readonly onSelectSymbol?: (line: number, col: number) => void;
}

export function OutlinePanel({
  code,
  language,
  onSelectSymbol,
}: OutlinePanelProps): React.JSX.Element {
  const [filterText, setFilterText] = useState('');

  const symbols = useMemo(() => {
    return extractSymbolsFromCode(code, language === 'lean4' ? 'lean4' : 'python');
  }, [code, language]);

  const filteredSymbols = useMemo(() => {
    if (!filterText.trim()) return symbols;
    const query = filterText.toLowerCase();
    return symbols.filter((s) => s.name.toLowerCase().includes(query));
  }, [symbols, filterText]);

  const renderKindIcon = (kind: SymbolKind) => {
    switch (kind) {
      case 'class':
      case 'structure':
        return <Box className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'function':
      case 'method':
        return <Code2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
      case 'theorem':
      case 'lemma':
        return <Compass className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      case 'definition':
      case 'inductive':
        return <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      default:
        return <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  };

  return (
    <div
      role="region"
      aria-label="Document Outline"
      className="flex flex-col h-full bg-[#090d15] text-slate-300 text-xs select-none overflow-hidden w-full font-sans"
    >
      {/* Search / Filter input */}
      <div className="p-2 border-b border-neutral-800 bg-[#06090e]">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter symbols by name..."
            aria-label="Filter symbols"
            className="w-full pl-7 pr-2 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Symbol List */}
      <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
        {filteredSymbols.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500 text-center px-4">
            <Filter className="w-6 h-6 mb-2 opacity-50" />
            <p className="text-xs">
              {filterText ? 'No matching symbols' : 'No symbols found in current document'}
            </p>
          </div>
        ) : (
          filteredSymbols.map((sym, index) => (
            <button
              key={`${sym.name}-${sym.line}-${index}`}
              type="button"
              onClick={() => onSelectSymbol?.(sym.line, sym.column)}
              className="group flex items-center justify-between w-full px-2 py-1.5 rounded hover:bg-neutral-800/70 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                {renderKindIcon(sym.kind)}
                <span className="font-mono text-slate-200 truncate font-medium">
                  {sym.name}
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                  {sym.kind}
                </span>
              </div>

              <span className="text-[11px] font-mono text-slate-500 shrink-0 ml-2 group-hover:text-slate-300">
                :{sym.line}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Footer summary */}
      <div className="px-3 py-1.5 border-t border-neutral-800 bg-[#06090e] text-[11px] text-slate-500 flex items-center justify-between font-mono">
        <span>{filteredSymbols.length} symbol{filteredSymbols.length === 1 ? '' : 's'}</span>
        <span className="capitalize">{language}</span>
      </div>
    </div>
  );
}
