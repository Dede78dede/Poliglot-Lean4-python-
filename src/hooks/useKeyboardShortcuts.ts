import { useEffect } from 'react';

export interface ShortcutHandlers {
  readonly onRunCode?: () => void;
  readonly onOpenGallery?: () => void;
  readonly onEscape?: () => void;
  readonly onToggleExplorer?: () => void;
  readonly onCloseTab?: () => void;
  readonly onTogglePipeline?: () => void;
  readonly onToggleZenMode?: () => void;
  readonly onSplitEditor?: () => void;
  readonly onReopenTab?: () => void;
  readonly onOpenSettings?: () => void;
  readonly onNewProject?: () => void;
}

export function useKeyboardShortcuts({
  onRunCode,
  onOpenGallery,
  onEscape,
  onToggleExplorer,
  onCloseTab,
  onTogglePipeline,
  onToggleZenMode,
  onSplitEditor,
  onReopenTab,
  onOpenSettings,
  onNewProject,
}: ShortcutHandlers): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMetaOrCtrl = e.metaKey || e.ctrlKey;

      // Settings shortcut: Cmd+, or Ctrl+,
      if (isMetaOrCtrl && (e.key === ',')) {
        e.preventDefault();
        onOpenSettings?.();
        return;
      }

      // New project wizard shortcut: Cmd+Shift+N or Ctrl+Shift+N
      if (isMetaOrCtrl && e.shiftKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        onNewProject?.();
        return;
      }

      // Run code shortcut: Cmd+Enter or Ctrl+Enter
      if (isMetaOrCtrl && e.key === 'Enter') {
        e.preventDefault();
        onRunCode?.();
        return;
      }

      // Open gallery shortcut: Cmd+K or Ctrl+K
      if (isMetaOrCtrl && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        onOpenGallery?.();
        return;
      }

      // Toggle explorer sidebar: Cmd+B or Ctrl+B
      if (isMetaOrCtrl && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        onToggleExplorer?.();
        return;
      }

      // Close tab: Cmd+W or Ctrl+W (prevent browser tab closing if focused on editor tab context)
      if (isMetaOrCtrl && (e.key === 'w' || e.key === 'W') && !e.shiftKey) {
        // If handled by caller
        if (onCloseTab) {
          e.preventDefault();
          onCloseTab();
          return;
        }
      }

      // Run / Toggle Pipeline: Cmd+Shift+P or Ctrl+Shift+P
      if (isMetaOrCtrl && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        onTogglePipeline?.();
        return;
      }

      // Split Editor: Cmd+\ or Ctrl+\
      if (isMetaOrCtrl && (e.key === '\\' || e.code === 'Backslash')) {
        e.preventDefault();
        onSplitEditor?.();
        return;
      }

      // Reopen Tab: Cmd+Shift+T or Ctrl+Shift+T
      if (isMetaOrCtrl && e.shiftKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        onReopenTab?.();
        return;
      }

      // Toggle Zen Mode: Cmd+K followed by Cmd+X or Ctrl+K Ctrl+X chord
      if (isMetaOrCtrl && (e.key === 'x' || e.key === 'X') && e.altKey) {
        e.preventDefault();
        onToggleZenMode?.();
        return;
      }

      // Escape key: close modals / unfocus
      if (e.key === 'Escape') {
        onEscape?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRunCode, onOpenGallery, onEscape, onToggleExplorer, onCloseTab, onTogglePipeline, onToggleZenMode, onSplitEditor, onReopenTab, onOpenSettings, onNewProject]);
}
