import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, Folder, FileCode, Tag } from 'lucide-react';
import type { SupportedLanguage } from '../../types/language';
import {
  extractSymbolsFromCode,
  findEnclosingSymbol,
  type DocumentSymbol,
} from '../../services/editor/symbol-service';

export interface BreadcrumbsProps {
  readonly filePath: string | null;
  readonly code: string;
  readonly language: SupportedLanguage;
  readonly currentLine?: number;
  readonly onNavigateSymbol?: (line: number) => void;
  readonly onNavigatePath?: (path: string) => void;
}

export function Breadcrumbs({
  filePath,
  code,
  language,
  currentLine = 1,
  onNavigateSymbol,
  onNavigatePath,
}: BreadcrumbsProps): React.JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const [symbols, setSymbols] = useState<readonly DocumentSymbol[]>([]);

  useEffect(() => {
    if (!filePath || !code) {
      setSymbols([]);
      return;
    }
    const extracted = extractSymbolsFromCode(code, language === 'lean4' ? 'lean4' : 'python');
    setSymbols(extracted);
  }, [code, filePath, language]);

  // Keyboard shortcut Ctrl+Shift+. to focus breadcrumbs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '.' || e.key === '>')) {
        e.preventDefault();
        containerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!filePath) {
    return null;
  }

  const segments = filePath.split('/').filter(Boolean);
  const enclosing = findEnclosingSymbol(symbols, currentLine);

  return (
    <nav
      ref={containerRef}
      tabIndex={0}
      aria-label="File Breadcrumbs"
      className="flex items-center gap-1 px-3 py-1 bg-[#0b0f17] border-b border-neutral-800 text-[11px] font-mono text-slate-400 select-none overflow-x-auto no-scrollbar shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
      {segments.map((seg, idx) => {
        const isLast = idx === segments.length - 1;
        const currentPath = segments.slice(0, idx + 1).join('/');

        return (
          <React.Fragment key={currentPath}>
            {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />}

            <button
              type="button"
              onClick={() => onNavigatePath?.(currentPath)}
              className={`flex items-center gap-1 px-1 py-0.5 rounded transition-colors hover:bg-neutral-800 hover:text-slate-200 cursor-pointer ${
                isLast ? 'text-slate-200 font-medium' : 'text-slate-400'
              }`}
            >
              {isLast ? (
                <FileCode
                  className={`w-3 h-3 shrink-0 ${
                    seg.endsWith('.py')
                      ? 'text-emerald-400'
                      : seg.endsWith('.lean')
                        ? 'text-blue-400'
                        : 'text-slate-400'
                  }`}
                />
              ) : (
                <Folder className="w-3 h-3 text-slate-500 shrink-0" />
              )}
              <span className="truncate max-w-[120px]">{seg}</span>
            </button>
          </React.Fragment>
        );
      })}

      {/* Active enclosing symbol */}
      {enclosing && (
        <React.Fragment>
          <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
          <button
            type="button"
            onClick={() => onNavigateSymbol?.(enclosing.line)}
            title={`Jump to line ${enclosing.line}: ${enclosing.name}`}
            className="flex items-center gap-1 px-1 py-0.5 rounded text-blue-400 hover:bg-neutral-800 hover:text-blue-300 transition-colors cursor-pointer"
          >
            <Tag className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[140px] font-semibold">{enclosing.name}</span>
          </button>
        </React.Fragment>
      )}
    </nav>
  );
}
