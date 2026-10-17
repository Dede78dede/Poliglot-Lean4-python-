import type { LanguageInfo, SupportedLanguage } from '../types/language';

export const LANGUAGE_REGISTRY: Readonly<Record<SupportedLanguage, LanguageInfo>> = Object.freeze({
  python: Object.freeze({
    id: 'python',
    displayName: 'Python',
    versionLabel: '3.14 (Pyodide 314.0.1)',
    monacoId: 'python',
    fileExtension: '.py',
    defaultTabSize: 4,
    executionMode: 'client',
    description: 'Empirical scientific computation executed in sandboxed WebAssembly with NumPy, Pandas & micropip.',
  }),
  lean4: Object.freeze({
    id: 'lean4',
    displayName: 'Lean 4',
    versionLabel: 'v4.26.0 (Kimina Prover)',
    monacoId: 'lean4',
    fileExtension: '.lean',
    defaultTabSize: 2,
    executionMode: 'server',
    description: 'Interactive theorem proving & formal verification via Kimina Lean REPL server.',
  }),
});
