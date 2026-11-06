/**
 * Navigation Drawer Component (Phase 14.1)
 *
 * Provides top-left responsive view switcher and navigation sheet
 * optimized for mobile touch screens (Android / iOS) and desktop.
 * Enforces >=44px touch targets and full keyboard accessibility.
 */

import React, { useEffect, useRef } from 'react';
import {
  VIEWS,
  ActiveView,
  NAVIGATION_SECTIONS,
  KEYBOARD_SHORTCUTS,
  ROUTES,
} from '../../constants/navigation';
import {
  Code2,
  BookOpen,
  ShieldCheck,
  FileCheck2,
  LayoutGrid,
  Settings,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface NavigationDrawerProps {
  readonly isOpen: boolean;
  readonly activeView: ActiveView;
  readonly onSelectView: (view: ActiveView) => void;
  readonly onClose: () => void;
}

const ICON_MAP: Record<ActiveView, React.ComponentType<{ className?: string }>> = {
  [VIEWS.EDITOR]: Code2,
  [VIEWS.NOTEBOOK]: BookOpen,
  [VIEWS.FEMEV]: ShieldCheck,
  [VIEWS.LEDGER]: FileCheck2,
  [VIEWS.SHOWCASE]: LayoutGrid,
  [VIEWS.SETTINGS]: Settings,
};

export function NavigationDrawer({
  isOpen,
  activeView,
  onSelectView,
  onClose,
}: NavigationDrawerProps): React.JSX.Element | null {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === KEYBOARD_SHORTCUTS.ESCAPE) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus close button on open
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="navigation-drawer-heading"
        className="relative z-10 w-full max-w-xs sm:max-w-sm h-full bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="navigation-drawer-heading"
                className="text-sm font-bold tracking-tight text-white whitespace-nowrap"
              >
                POLYGLOT STUDIO
              </h2>
              <p className="text-[11px] text-slate-400">Navigazione Spazi di Lavoro</p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 active:scale-95 transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500 touch-manipulation"
            aria-label="Chiudi menu navigazione"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Item List */}
        <nav
          aria-label="Sezioni del programma"
          className="flex-1 overflow-y-auto p-3 space-y-1.5 touch-pan-y"
        >
          {NAVIGATION_SECTIONS.map((section) => {
            const Icon = ICON_MAP[section.id];
            const isSelected = activeView === section.id;

            return (
              <button
                key={section.id}
                onClick={() => {
                  onSelectView(section.id);
                  onClose();
                }}
                className={`w-full min-h-[52px] px-3.5 py-3 rounded-xl flex items-center gap-3.5 text-left transition-all active:scale-[0.99] touch-manipulation border ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500/50 text-white shadow-xs'
                    : 'bg-slate-900/40 border-transparent hover:bg-slate-800/60 hover:border-slate-700/60 text-slate-300'
                }`}
                role="menuitem"
                aria-current={isSelected ? 'page' : undefined}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                    isSelected
                      ? 'bg-blue-500 text-white border-blue-400'
                      : 'bg-slate-800 text-slate-400 border-slate-700/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm font-semibold truncate ${
                        isSelected ? 'text-blue-300' : 'text-slate-100'
                      }`}
                    >
                      {section.label}
                    </span>
                    {section.shortcut && (
                      <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
                        {section.shortcut}
                      </kbd>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5 leading-tight">
                    {section.description}
                  </p>
                </div>

                <ChevronRight
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isSelected ? 'text-blue-400 translate-x-0.5' : 'text-slate-600'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* Drawer Footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 shrink-0 text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Kernel Runtime</span>
            <span className="font-mono text-emerald-400">Lean 4 · Tier-5</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Touch Optimization</span>
            <span className="font-mono text-slate-300">Android / iOS ≥44px</span>
          </div>
        </div>
      </div>
    </div>
  );
}
