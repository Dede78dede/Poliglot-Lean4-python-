/**
 * Monaco Snippets Registry (Sprint 11.0.1, Advanced Editing)
 *
 * Rich templates and completions for Python and Lean 4.
 */

export interface SnippetDefinition {
  readonly label: string;
  readonly insertText: string;
  readonly documentation: string;
  readonly detail: string;
}

export const PYTHON_SNIPPETS: readonly SnippetDefinition[] = Object.freeze([
  {
    label: 'def',
    insertText: 'def ${1:function_name}(${2:params}) -> ${3:None}:\n    """${4:Docstring.}"""\n    ${0:pass}',
    documentation: 'Define a Python function with type hints and docstring',
    detail: 'Python Function Template',
  },
  {
    label: 'class',
    insertText: 'class ${1:ClassName}:\n    """${2:Class description.}"""\n    def __init__(self, ${3:args}) -> None:\n        ${0:pass}',
    documentation: 'Define a Python class with constructor',
    detail: 'Python Class Template',
  },
  {
    label: 'async_def',
    insertText: 'async def ${1:coroutine_name}(${2:params}) -> ${3:None}:\n    ${0:pass}',
    documentation: 'Define an asynchronous coroutine function',
    detail: 'Async Function Template',
  },
  {
    label: 'numpy_array',
    insertText: 'import numpy as np\n\n${1:arr} = np.array([[${2:1, 2}], [${3:3, 4}]])\n${0}',
    documentation: 'NumPy 2D matrix array instantiation',
    detail: 'NumPy Array Template',
  },
  {
    label: 'sympy_symbols',
    insertText: 'import sympy as sp\n\n${1:x, y} = sp.symbols(\'${1:x y}\')\n${0}',
    documentation: 'SymPy symbolic variables definition',
    detail: 'SymPy Symbols Template',
  },
  {
    label: 'main',
    insertText: 'if __name__ == "__main__":\n    ${0:main()}',
    documentation: 'Standard boilerplate __main__ guard',
    detail: 'Main Guard',
  },
  {
    label: 'try_except',
    insertText: 'try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:raise}\nfinally:\n    ${0:pass}',
    documentation: 'Exception handling block with try/except/finally',
    detail: 'Try-Except Block',
  },
]);

export const LEAN4_SNIPPETS: readonly SnippetDefinition[] = Object.freeze([
  {
    label: 'theorem',
    insertText: 'theorem ${1:name} (${2:h} : ${3:Type}) : ${4:Prop} := by\n  ${0:sorry}',
    documentation: 'Lean 4 theorem declaration with tactic block',
    detail: 'Theorem Template',
  },
  {
    label: 'lemma',
    insertText: 'lemma ${1:name} : ${2:Prop} := by\n  ${0:sorry}',
    documentation: 'Lean 4 helper lemma declaration',
    detail: 'Lemma Template',
  },
  {
    label: 'def',
    insertText: 'def ${1:name} (${2:x} : ${3:Type}) : ${4:Type} :=\n  ${0}',
    documentation: 'Lean 4 term definition',
    detail: 'Definition Template',
  },
  {
    label: 'simp',
    insertText: 'simp [${1:lemmas}]',
    documentation: 'Simplifier tactic with custom lemma list',
    detail: 'Simp Tactic',
  },
  {
    label: 'rw',
    insertText: 'rw [${1:lemma}]',
    documentation: 'Rewrite tactic with lemma substitution',
    detail: 'Rewrite Tactic',
  },
  {
    label: 'induction',
    insertText: 'induction ${1:n} with\n| zero => ${2:rfl}\n| succ ${3:n} ${4:ih} =>\n  ${0:sorry}',
    documentation: 'Inductive proof on natural numbers or data type',
    detail: 'Induction Tactic',
  },
  {
    label: 'calc',
    insertText: 'calc\n  ${1:a} = ${2:b} := by ${3:rfl}\n  _ = ${4:c} := by ${0:sorry}',
    documentation: 'Calculational proof block',
    detail: 'Calc Block',
  },
  {
    label: 'have',
    insertText: 'have ${1:h} : ${2:Prop} := by\n  ${3:sorry}\n${0}',
    documentation: 'Sub-goal assertion inside tactic block',
    detail: 'Have Hypothesis',
  },
  {
    label: 'structure',
    insertText: 'structure ${1:Name} where\n  ${2:field} : ${3:Type}\n${0}',
    documentation: 'Lean 4 structure definition',
    detail: 'Structure Template',
  },
  {
    label: 'inductive',
    insertText: 'inductive ${1:Name} where\n  | ${2:ctor} : ${1:Name}\n${0}',
    documentation: 'Lean 4 inductive type definition',
    detail: 'Inductive Type',
  },
]);
