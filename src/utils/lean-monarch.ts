import type { languages } from 'monaco-editor';

/**
 * Monaco Monarch syntax highlighter for Lean 4.
 * Provides rich syntax highlighting for keywords, tactics, commands, and Unicode symbols
 * as a robust native fallback or primary tokenizer in browser environments.
 */
export const LEAN4_MONARCH_LANGUAGE: languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.lean',

  keywords: [
    'import', 'open', 'variable', 'variables', 'theorem', 'lemma', 'def', 'example',
    'axiom', 'inductive', 'structure', 'class', 'instance', 'namespace', 'section',
    'end', 'where', 'by', 'have', 'show', 'from', 'let', 'if', 'then', 'else',
    'match', 'with', 'sorry', 'mutual', 'constant', 'attribute', 'opaque', 'abbrev',
    'syntax', 'macro', 'notation', 'infix', 'infixl', 'infixr', 'prefix', 'postfix',
    'deriving', 'universe', 'universes', 'do', 'return', 'for', 'in', 'mut',
  ],

  tactics: [
    'rfl', 'simp', 'ring', 'omega', 'norm_num', 'cases', 'induction', 'apply',
    'exact', 'intro', 'intros', 'revert', 'rw', 'rewrite', 'contradiction',
    'trivial', 'assumption', 'aesop', 'linarith', 'positivity', 'qify', 'zify',
    'norm_cast', 'push_cast', 'decide', 'split', 'clear', 'subst', 'rename_i',
    'ext', 'congr', 'constructor', 'left', 'right', 'use', 'obtain', 'rcases',
  ],

  commands: [
    '#check', '#eval', '#reduce', '#print', '#synth', '#help', '#version',
  ],

  operators: [
    ':=', ':', '::', '->', '→', '<-', '←', '<->', '↔', '/\\', '∧', '\\/', '∨',
    '!', '¬', '∀', 'forall', '∃', 'exists', '<=', '≤', '>=', '≥', '!=', '≠',
    '∈', '∉', '⊆', '⊂', '∪', '∩', '×', 'λ', 'fun', '⟨', '⟩', '⊢', '=>', '⇒',
  ],

  symbols: /[=><!~?:&|+\-*\/\^%#@λ→←↔∧∨¬∀∃≤≥≠∈∉⊆⊂∪∩×⟨⟩⊢]+/,

  tokenizer: {
    root: [
      // Comments
      [/--.*$/, 'comment'],
      [/\/-/, 'comment', '@comment'],

      // Commands
      [/#\w+/, {
        cases: {
          '@commands': 'keyword.command',
          '@default': 'identifier',
        },
      }],

      // Identifiers & keywords
      [/[a-zA-Z_α-ωΑ-Ω][a-zA-Z0-9_α-ωΑ-Ω']*/, {
        cases: {
          '@keywords': 'keyword',
          '@tactics': 'keyword.tactic',
          '@default': 'identifier',
        },
      }],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string'],

      // Numbers
      [/\d+/, 'number'],

      // Symbols and operators
      [/@symbols/, {
        cases: {
          '@operators': 'operator',
          '@default': '',
        },
      }],

      // Delimiters
      [/[{}()\[\]]/, '@brackets'],
      [/[;,.]/, 'delimiter'],
    ],

    comment: [
      [/[^/-]+/, 'comment'],
      [/\/-/, 'comment', '@push'],
      [/-\//, 'comment', '@pop'],
      [/[-/]/, 'comment'],
    ],

    string: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop'],
    ],
  },
};
