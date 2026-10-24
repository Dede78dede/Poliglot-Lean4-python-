import React, { useCallback, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { SupportedLanguage } from '../types/language';
import { LEAN4_MONARCH_LANGUAGE } from '../utils/lean-monarch';

export interface EditorPaneProps {
  readonly language: SupportedLanguage;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onCursorChange?: (line: number, col: number) => void;
  readonly onRunRequested?: () => void;
  readonly isDegradedMonarch?: boolean;
  readonly onMonacoInitState?: (degraded: boolean) => void;
}

export function EditorPane({
  language,
  value,
  onChange,
  onCursorChange,
  onRunRequested,
  onMonacoInitState,
}: EditorPaneProps): React.JSX.Element {
  const isRegisteredRef = useRef(false);

  const handleEditorMount: OnMount = useCallback(
    async (editor, monaco) => {
      // Register custom Lean 4 syntax highlighting if not already done
      if (!isRegisteredRef.current) {
        if (!monaco.languages.getLanguages().some((l: { id: string }) => l.id === 'lean4')) {
          monaco.languages.register({ id: 'lean4' });
          monaco.languages.setMonarchTokensProvider('lean4', LEAN4_MONARCH_LANGUAGE);
          monaco.languages.setLanguageConfiguration('lean4', {
            comments: {
              lineComment: '--',
              blockComment: ['/-', '-/'],
            },
            brackets: [
              ['{', '}'],
              ['[', ']'],
              ['(', ')'],
              ['⟨', '⟩'],
            ],
            autoClosingPairs: [
              { open: '{', close: '}' },
              { open: '[', close: ']' },
              { open: '(', close: ')' },
              { open: '⟨', close: '⟩' },
              { open: '"', close: '"' },
            ],
          });
        }
        isRegisteredRef.current = true;
      }

      // Try dynamic import of lean4monaco for rich LSP
      if (language === 'lean4') {
        try {
          // Dynamic probe for optional lean4monaco package
          const modulePath = 'lean4monaco';
          const leanModule = await import(/* @vite-ignore */ modulePath).catch(() => null);
          if (leanModule && 'LeanMonaco' in leanModule) {
            onMonacoInitState?.(false);
          } else {
            // Degraded mode: Monarch tokenizer handles syntax
            onMonacoInitState?.(true);
          }
        } catch {
          onMonacoInitState?.(true);
        }
      }

      // Track cursor position
      editor.onDidChangeCursorPosition((e) => {
        onCursorChange?.(e.position.lineNumber, e.position.column);
      });

      // Keyboard shortcut: Ctrl+Enter / Cmd+Enter runs code
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        onRunRequested?.();
      });

      // Only auto-focus on desktop viewports to prevent unwanted virtual keyboard popping on mobile
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        editor.focus();
      }
    },
    [language, onCursorChange, onMonacoInitState, onRunRequested],
  );

  return (
    <div className="relative w-full h-full bg-[#0d1117] overflow-hidden">
      <Editor
        height="100%"
        width="100%"
        language={language === 'lean4' ? 'lean4' : 'python'}
        value={value}
        onChange={(val) => onChange(val ?? '')}
        onMount={handleEditorMount}
        theme="vs-dark"
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: language === 'python' ? 4 : 2,
          insertSpaces: true,
          wordWrap: 'on',
          minimap: { enabled: false },
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          bracketPairColorization: { enabled: true },
          padding: { top: 12, bottom: 12 },
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
        }}
      />
    </div>
  );
}
