import React, { useCallback, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { SupportedLanguage } from '../types/language';
import { LEAN4_MONARCH_LANGUAGE } from '../utils/lean-monarch';
import { PYTHON_SNIPPETS, LEAN4_SNIPPETS } from '../services/editor/snippet-registry';
import { contextEngineService } from '../services/editor/context-engine-service';

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
  const providersRegisteredRef = useRef(false);

  const handleEditorMount: OnMount = useCallback(
    async (editor, monaco) => {
      if (typeof globalThis !== 'undefined' && !(globalThis as { monaco?: unknown }).monaco) {
        (globalThis as { monaco?: unknown }).monaco = monaco;
      }
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

      // Register completion providers for snippets if not already done
      if (!providersRegisteredRef.current) {
        // Python snippets completion item provider
        monaco.languages.registerCompletionItemProvider('python', {
          provideCompletionItems: (model: any, position: any) => {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };

            const suggestions = PYTHON_SNIPPETS.map((snip) => ({
              label: snip.label,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: snip.insertText,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: snip.documentation,
              detail: snip.detail,
              range,
            }));

            return { suggestions };
          },
        });

        // Lean 4 snippets completion item provider
        monaco.languages.registerCompletionItemProvider('lean4', {
          provideCompletionItems: (model: any, position: any) => {
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };

            const suggestions = LEAN4_SNIPPETS.map((snip) => ({
              label: snip.label,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: snip.insertText,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: snip.documentation,
              detail: snip.detail,
              range,
            }));

            return { suggestions };
          },
        });

        // Lean 4 CodeLens Provider (exact?, simp?, omega?)
        monaco.languages.registerCodeLensProvider('lean4', {
          provideCodeLenses: (model: any) => {
            const text = model.getValue();
            const lenses = contextEngineService.generateLeanCodeLenses(text);
            return {
              lenses: lenses.map((l) => ({
                range: l.range,
                command: {
                  id: l.command.id,
                  title: l.command.title,
                  arguments: l.command.arguments,
                },
              })),
              dispose: () => {},
            };
          },
        });

        // Inlay Hints Provider for Python & Lean 4
        monaco.languages.registerInlayHintsProvider('python', {
          provideInlayHints: (model: any) => {
            const hints = contextEngineService.generateInlayHints(model.getValue(), 'python');
            return {
              hints: hints.map((h) => ({
                position: h.position,
                label: h.label,
                kind: h.kind === 1 ? monaco.languages.InlayHintKind.Type : monaco.languages.InlayHintKind.Parameter,
                tooltip: h.tooltip,
              })),
              dispose: () => {},
            };
          },
        });

        monaco.languages.registerInlayHintsProvider('lean4', {
          provideInlayHints: (model: any) => {
            const hints = contextEngineService.generateInlayHints(model.getValue(), 'lean4');
            return {
              hints: hints.map((h) => ({
                position: h.position,
                label: h.label,
                kind: h.kind === 1 ? monaco.languages.InlayHintKind.Type : monaco.languages.InlayHintKind.Parameter,
                tooltip: h.tooltip,
              })),
              dispose: () => {},
            };
          },
        });

        providersRegisteredRef.current = true;
      }

      // Try dynamic import of lean4monaco for rich LSP
      if (language === 'lean4') {
        try {
          const modulePath = 'lean4monaco';
          const leanModule = await import(/* @vite-ignore */ modulePath).catch(() => null);
          if (leanModule && 'LeanMonaco' in leanModule) {
            onMonacoInitState?.(false);
          } else {
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

      // Only auto-focus on desktop viewports
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
          bracketPairColorization: {
            enabled: true,
            independentColorPoolPerBracketType: true,
          },
          stickyScroll: {
            enabled: true,
            maxLineCount: 5,
          },
          rulers: [100],
          multiCursorModifier: 'alt',
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
