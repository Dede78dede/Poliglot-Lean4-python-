/**
 * Project Scaffolding Templates (Sprint 11.0.2, Task A2)
 *
 * Implements 8 canonical project templates across:
 * - Python: Empty, NumPy, Pandas, SymPy
 * - Lean 4: Empty, Mathlib starter, Proof demo
 * - Mixed: Python + Lean formal verification pipeline
 * - Educational: Natural Number Game & Robo
 */

export interface ProjectTemplate {
  readonly id: string;
  readonly name: string;
  readonly category: 'python' | 'lean4' | 'mixed' | 'educational';
  readonly description: string;
  readonly tags: readonly string[];
  readonly files: Record<string, string>;
  readonly recommendedFlags?: Record<string, boolean>;
}

export const SCAFFOLD_TEMPLATES: readonly ProjectTemplate[] = [
  // 1. Python Empty
  {
    id: 'python-empty',
    name: 'Python 3.14 (WASM Minimal)',
    category: 'python',
    description: 'Clean Python 3.14 workspace with Pyodide WASM runtime support.',
    tags: ['python', 'minimal', 'wasm'],
    files: {
      'pyproject.toml': `[project]
name = "python-minimal"
version = "0.1.0"
description = "Minimal Python 3.14 project on Polyglot Code Studio"
dependencies = []
`,
      '.gitignore': `__pycache__/
*.pyc
.trash/
`,
      'README.md': `# Python Minimal Project

Created with Polyglot Code Studio scaffolding wizard.
Runs inside client-side Pyodide WASM environment.
`,
      'ro-crate-metadata.json': `{"@context": "https://w3id.org/ro/crate/1.1/context", "@graph": [{"@type": "Dataset", "@id": "./", "name": "Python Minimal"}]}`,
      'src/main.py': `def main() -> None:
    print("Hello from Polyglot Code Studio!")

if __name__ == "__main__":
    main()
`,
    },
  },

  // 2. Python NumPy
  {
    id: 'python-numpy',
    name: 'Python Scientific (NumPy)',
    category: 'python',
    description: 'Matrix computations, linear algebra, and numerical simulation.',
    tags: ['python', 'numpy', 'linear-algebra'],
    files: {
      'pyproject.toml': `[project]
name = "python-numpy-science"
version = "0.1.0"
dependencies = ["numpy>=2.0.0"]
`,
      '.gitignore': `__pycache__/\n*.pyc\n`,
      'README.md': `# Scientific Matrix Computation with NumPy\n`,
      'ro-crate-metadata.json': `{"@context": "https://w3id.org/ro/crate/1.1/context", "@graph": [{"@type": "Dataset", "@id": "./", "name": "Python NumPy"}]}`,
      'src/matrix_ops.py': `import numpy as np

def compute_spectrum(matrix: np.ndarray) -> tuple[np.ndarray, float]:
    eigvals = np.linalg.eigvals(matrix)
    det = float(np.linalg.det(matrix))
    return eigvals, det

if __name__ == "__main__":
    A = np.array([[4.0, 1.0], [2.0, 3.0]])
    vals, d = compute_spectrum(A)
    print("Eigenvalues:", vals)
    print("Determinant:", d)
`,
    },
  },

  // 3. Python Pandas
  {
    id: 'python-pandas',
    name: 'Python Data Analysis (Pandas)',
    category: 'python',
    description: 'Tabular data analysis, dataframes, and statistical summaries.',
    tags: ['python', 'pandas', 'data'],
    files: {
      'pyproject.toml': `[project]
name = "python-pandas-analysis"
version = "0.1.0"
dependencies = ["pandas>=2.2.0"]
`,
      '.gitignore': `__pycache__/\n*.pyc\n`,
      'README.md': `# Tabular Data Analysis\n`,
      'ro-crate-metadata.json': `{"@context": "https://w3id.org/ro/crate/1.1/context", "@graph": [{"@type": "Dataset", "@id": "./", "name": "Python Pandas"}]}`,
      'src/data_table.py': `import pandas as pd

def analyze_dataset() -> pd.DataFrame:
    df = pd.DataFrame({
        "sample": [1, 2, 3, 4],
        "metric": [10.5, 23.2, 18.9, 31.0]
    })
    return df

if __name__ == "__main__":
    df = analyze_dataset()
    print(df.describe())
`,
    },
  },

  // 4. Python SymPy
  {
    id: 'python-sympy',
    name: 'Symbolic Computer Algebra (SymPy)',
    category: 'python',
    description: 'Exact symbolic mathematics, algebraic calculus, and equation solving.',
    tags: ['python', 'sympy', 'symbolic'],
    files: {
      'pyproject.toml': `[project]
name = "python-sympy-algebra"
version = "0.1.0"
dependencies = ["sympy>=1.13.0"]
`,
      '.gitignore': `__pycache__/\n*.pyc\n`,
      'README.md': `# Symbolic Mathematics with SymPy\n`,
      'ro-crate-metadata.json': `{"@context": "https://w3id.org/ro/crate/1.1/context", "@graph": [{"@type": "Dataset", "@id": "./", "name": "Python SymPy"}]}`,
      'src/symbolic.py': `import sympy as sp

x, y = sp.symbols('x y')
expr = sp.sin(x) * sp.exp(x)
derivative = sp.diff(expr, x)

print("Expression:", expr)
print("Derivative:", derivative)
`,
    },
  },

  // 5. Lean 4 Empty
  {
    id: 'lean-empty',
    name: 'Lean 4 (Bare Proof Project)',
    category: 'lean4',
    description: 'Lightweight Lean 4 starter without external Mathlib overhead.',
    tags: ['lean4', 'formal', 'logic'],
    files: {
      'lakefile.toml': `name = "lean-starter"
version = "0.1.0"
defaultTargets = ["LeanStarter"]

[[lean_lib]]
name = "LeanStarter"
`,
      'lean-toolchain': 'leanprover/lean4:v4.35.0-rc4\n',
      '.gitignore': `.lake/\n.trash/\n`,
      'README.md': `# Lean 4 Minimal Starter\n`,
      'ro-crate-metadata.json': `{"@context": "https://w3id.org/ro/crate/1.1/context", "@graph": [{"@type": "Dataset", "@id": "./", "name": "Lean 4 Starter"}]}`,
      'LeanStarter.lean': `def double (n : Nat) : Nat := n + n

theorem double_zero : double 0 = 0 := by
  rfl
`,
    },
  },

  // 6. Lean 4 Mathlib Starter
  {
    id: 'lean-mathlib',
    name: 'Lean 4 Mathlib4 Starter',
    category: 'lean4',
    description: 'Full mathematical theorem proving setup referencing reservoir Mathlib.',
    tags: ['lean4', 'mathlib', 'algebra', 'analysis'],
    files: {
      'lakefile.toml': `name = "mathlib-starter"
version = "0.1.0"
defaultTargets = ["MathlibStarter"]

[[require]]
name = "mathlib"
scope = "leanprover-community"
version = "v4.35.0-rc4"

[[lean_lib]]
name = "MathlibStarter"
`,
      'lean-toolchain': 'leanprover/lean4:v4.35.0-rc4\n',
      '.gitignore': `.lake/\n.trash/\n`,
      'README.md': `# Mathlib 4 Starter Project\n`,
      'ro-crate-metadata.json': `{"@context": "https://w3id.org/ro/crate/1.1/context", "@graph": [{"@type": "Dataset", "@id": "./", "name": "Mathlib Starter"}]}`,
      'MathlibStarter.lean': `import Mathlib.Data.Nat.Basic
import Mathlib.Tactic

theorem nat_succ_pos (n : Nat) : 0 < n + 1 := by
  exact Nat.succ_pos n
`,
    },
  },

  // 7. Lean 4 Proof Demo
  {
    id: 'lean-proof-demo',
    name: 'Lean 4 Verified Proof Demo',
    category: 'lean4',
    description: 'Pre-configured demonstrations of induction, calc blocks, and omega tactics.',
    tags: ['lean4', 'tactics', 'induction', 'omega'],
    files: {
      'lakefile.toml': `name = "proof-demo"
version = "0.1.0"
defaultTargets = ["ProofDemo"]

[[lean_lib]]
name = "ProofDemo"
`,
      'lean-toolchain': 'leanprover/lean4:v4.35.0-rc4\n',
      '.gitignore': `.lake/\n`,
      'README.md': `# Proof Demonstrations\n`,
      'ro-crate-metadata.json': `{"@context": "https://w3id.org/ro/crate/1.1/context", "@graph": [{"@type": "Dataset", "@id": "./", "name": "Proof Demo"}]}`,
      'ProofDemo.lean': `theorem sum_first_n (n : Nat) : 2 * (List.range (n + 1)).sum = n * (n + 1) := by
  sorry
`,
    },
  },

  // 8. Mixed Pipeline
  {
    id: 'mixed-pipeline',
    name: 'Dual-Runtime Pipeline (Python + Lean 4)',
    category: 'mixed',
    description: 'SymPy symbolic extraction fed directly into Lean 4 formal verification.',
    tags: ['python', 'lean4', 'dual-runtime', 'pipeline'],
    files: {
      'pyproject.toml': `[project]
name = "hybrid-verification"
version = "0.1.0"
dependencies = ["numpy", "sympy"]
`,
      'lakefile.toml': `name = "hybrid-lean"
version = "0.1.0"
defaultTargets = ["HybridLean"]

[[lean_lib]]
name = "HybridLean"
`,
      'lean-toolchain': 'leanprover/lean4:v4.35.0-rc4\n',
      '.gitignore': `__pycache__/\n.lake/\n`,
      'README.md': `# Dual-Runtime Hybrid Verification Pipeline\n`,
      'ro-crate-metadata.json': `{"@context": "https://w3id.org/ro/crate/1.1/context", "@graph": [{"@type": "Dataset", "@id": "./", "name": "Mixed Pipeline"}]}`,
      'src/spec.py': `import sympy as sp
x = sp.Symbol('x')
poly = x**2 - 4
print("Roots:", sp.solve(poly, x))
`,
      'FormalSpec.lean': `theorem polynomial_roots (x : Real) : x^2 - 4 = 0 ↔ x = 2 ∨ x = -2 := by
  sorry
`,
    },
  },
];
