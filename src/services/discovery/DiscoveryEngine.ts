import type {
  DiscoveryEcosystem,
  DiscoverySearchResult,
  PackageMetadata,
  ToolchainCompatibilityReport,
} from '../../types/discovery';
import { evaluateLeanCompatibility, STUDIO_LEAN_DEFAULT_VERSION } from './LeanDependencyResolver';
import { evaluatePythonCompatibility } from './PythonDependencyResolver';

/**
 * Curated Library of Seminal Open Source Projects for Lean 4 & Python
 */
export const CURATED_PACKAGES: readonly PackageMetadata[] = [
  // LEAN 4: 1. Point-Set Topology (Mathlib 4.8.0 compatible)
  {
    id: 'mathlib4-topology-sample',
    name: 'mathlib4-topology-sample',
    description: 'Topologia di base e filtri: punti di accumulazione, aperti e chiusi in Lean 4.',
    author: 'leanprover-community',
    repositoryUrl: 'https://github.com/leanprover-community/mathlib4',
    stars: 1840,
    license: 'Apache-2.0',
    ecosystem: 'lean4',
    version: '4.8.0',
    tags: ['topology', 'mathlib', 'filters', 'analysis'],
    category: 'topology',
    toolchain: {
      leanVersion: 'v4.8.0',
      mathlibCommit: 'v4.8.0-rc1',
    },
    files: [
      {
        path: 'lean-toolchain',
        content: 'leanprover/lean4:v4.8.0\n',
        language: 'text',
      },
      {
        path: 'lakefile.lean',
        content: `import Lake
open Lake DSL

package «topology_sample»

require mathlib from git
  "https://github.com/leanprover-community/mathlib4" @ "v4.8.0"

@[default_target]
lean_lib «TopologySample»
`,
        language: 'lean4',
      },
      {
        path: 'TopologySample.lean',
        content: `-- Formal Point-Set Topology Sample in Lean 4
def isOpenIntersection (U V : Set Nat) (hU : True) (hV : True) : True := by
  trivial

theorem union_empty_id (s : Set Nat) : s ∪ ∅ = s := by
  ext x
  simp

#check union_empty_id
`,
        language: 'lean4',
      },
    ],
  },

  // LEAN 4: 2. Propositional & First-Order Natural Deduction (Pure Lean 4.8.0, no heavy mathlib)
  {
    id: 'lean4-logic-foundations',
    name: 'lean4-logic-foundations',
    description: 'Logica proposizionale e predicativa con deduzione naturale pura in Lean 4.',
    author: 'leanprover',
    repositoryUrl: 'https://github.com/leanprover/lean4',
    stars: 5620,
    license: 'Apache-2.0',
    ecosystem: 'lean4',
    version: '4.8.0',
    tags: ['logic', 'foundations', 'first-order', 'deduction'],
    category: 'logic',
    toolchain: {
      leanVersion: 'v4.8.0',
    },
    files: [
      {
        path: 'lean-toolchain',
        content: 'leanprover/lean4:v4.8.0\n',
        language: 'text',
      },
      {
        path: 'lakefile.lean',
        content: `import Lake
open Lake DSL

package «logic_foundations»

@[default_target]
lean_lib «LogicFoundations»
`,
        language: 'lean4',
      },
      {
        path: 'LogicFoundations.lean',
        content: `-- Fondamenti di Logica Matematica Formale
theorem modus_ponens (P Q : Prop) (hP : P) (hImp : P → Q) : Q := by
  exact hImp hP

theorem de_morgan_and (P Q : Prop) : ¬(P ∨ Q) ↔ (¬P ∧ ¬Q) := by
  constructor
  · intro h
    constructor
    · intro hp; exact h (Or.inl hp)
    · intro hq; exact h (Or.inr hq)
  · rintro ⟨hnp, hnq⟩ (hp | hq)
    · exact hnp hp
    · exact hnq hq

#check de_morgan_and
`,
        language: 'lean4',
      },
    ],
  },

  // LEAN 4: 3. Toolchain Mismatch Benchmark (Requires Lean 4.13.0 -> triggers verified: false)
  {
    id: 'lean4-prime-number-future',
    name: 'lean4-prime-number-future',
    description: 'Teoria dei numeri e infinitudine dei numeri primi (Richiede Lean 4.13.0).',
    author: 'formal-math-lab',
    repositoryUrl: 'https://github.com/formal-math-lab/primes-413',
    stars: 420,
    license: 'MIT',
    ecosystem: 'lean4',
    version: '4.13.0',
    tags: ['number-theory', 'primes', 'future-toolchain'],
    category: 'number-theory',
    toolchain: {
      leanVersion: 'v4.13.0',
      mathlibCommit: 'nightly-2024-10-01',
    },
    files: [
      {
        path: 'lean-toolchain',
        content: 'leanprover/lean4:v4.13.0\n',
        language: 'text',
      },
      {
        path: 'lakefile.lean',
        content: `import Lake
open Lake DSL

package «primes_future»

require mathlib from git
  "https://github.com/leanprover-community/mathlib4" @ "nightly-2024-10-01"

@[default_target]
lean_lib «Primes»
`,
        language: 'lean4',
      },
      {
        path: 'Primes.lean',
        content: `-- Euclid Infinitude of Primes (Toolchain mismatch demo)
theorem nat_add_comm_demo (a b : Nat) : a + b = b + a := by
  omega

#check nat_add_comm_demo
`,
        language: 'lean4',
      },
    ],
  },

  // LEAN 4: 4. Abstract Algebra: Monoid & Group Homomorphisms
  {
    id: 'lean4-algebra-monoids',
    name: 'lean4-algebra-monoids',
    description: 'Strutture algebriche: monoidi commutativi e omomorfismi di gruppo in Lean 4.',
    author: 'algebra-lean',
    repositoryUrl: 'https://github.com/algebra-lean/monoids',
    stars: 310,
    license: 'MIT',
    ecosystem: 'lean4',
    version: '4.8.0',
    tags: ['algebra', 'monoids', 'groups'],
    category: 'algebra',
    toolchain: {
      leanVersion: 'v4.8.0',
    },
    files: [
      {
        path: 'lean-toolchain',
        content: 'leanprover/lean4:v4.8.0\n',
        language: 'text',
      },
      {
        path: 'lakefile.lean',
        content: `import Lake
open Lake DSL

package «algebra_monoids»

@[default_target]
lean_lib «Monoids»
`,
        language: 'lean4',
      },
      {
        path: 'Monoids.lean',
        content: `-- Algebra Astratta: Monoidi e Omomorfismi
structure MonoidHom (M N : Type) [Mul M] [Mul N] where
  toFun : M → N
  map_mul : ∀ x y : M, toFun (x * y) = toFun x * toFun y

theorem id_monoid_hom (M : Type) [Mul M] : True := by
  trivial
`,
        language: 'lean4',
      },
    ],
  },

  // PYTHON: 5. Computer Algebra & Symbolic Differentiation (SymPy - WASM Ready)
  {
    id: 'sympy-formal-geometry-cas',
    name: 'sympy-formal-geometry-cas',
    description: 'Calcolo simbolico, differenziazione e integrazione analitica con SymPy.',
    author: 'sympy',
    repositoryUrl: 'https://github.com/sympy/sympy',
    stars: 12400,
    license: 'BSD-3-Clause',
    ecosystem: 'python',
    version: '1.13.0',
    tags: ['cas', 'symbolic', 'calculus', 'geometry', 'sympy'],
    category: 'cas',
    toolchain: {
      pythonVersion: '>=3.11',
      purePython: true,
      pyodideCompatible: true,
    },
    files: [
      {
        path: 'requirements.txt',
        content: `sympy>=1.12
mpmath>=1.3.0
`,
        language: 'text',
      },
      {
        path: 'main.py',
        content: `import sympy as sp

x, y = sp.symbols('x y')
expr = sp.sin(x) * sp.exp(x)

# Symbolic derivative
d_expr = sp.diff(expr, x)
# Symbolic integral
int_expr = sp.integrate(d_expr, x)

print("Espressione:", expr)
print("Derivata prima d/dx:", d_expr)
print("Integrale ricostruito:", int_expr)
print("Verifica identita:", sp.simplify(expr - int_expr) == 0)
`,
        language: 'python',
      },
    ],
  },

  // PYTHON: 6. First-Order SMT Solver with Z3 in Python (WASM Ready)
  {
    id: 'z3-formal-smt-solver',
    name: 'z3-formal-smt-solver',
    description: 'Risolutore formale SMT e soddisfacibilità logica con Z3 Theorem Prover.',
    author: 'Z3Prover',
    repositoryUrl: 'https://github.com/Z3Prover/z3',
    stars: 9800,
    license: 'MIT',
    ecosystem: 'python',
    version: '4.13.0',
    tags: ['smt', 'sat', 'solver', 'formal-verification', 'z3'],
    category: 'smt',
    toolchain: {
      pythonVersion: '>=3.11',
      purePython: false,
      pyodideCompatible: true,
    },
    files: [
      {
        path: 'requirements.txt',
        content: `z3-solver>=4.12.0\n`,
        language: 'text',
      },
      {
        path: 'main.py',
        content: `from z3 import Solver, Int, sat

s = Solver()
x = Int('x')
y = Int('y')

s.add(x > 2)
s.add(y < 10)
s.add(x + 2 * y == 7)

if s.check() == sat:
    m = s.model()
    print("SMT Soluzione trovata:")
    print(f"x = {m[x]}, y = {m[y]}")
    print(f"Verifica: {m[x].as_long() + 2 * m[y].as_long()} == 7")
else:
    print("Insoddisfacibile")
`,
        language: 'python',
      },
    ],
  },

  // PYTHON: 7. Graph Theory & Network Algorithms (NetworkX - WASM Ready)
  {
    id: 'networkx-graph-theory',
    name: 'networkx-graph-theory',
    description: 'Algoritmi di teoria dei grafi: percorsi minimi, flusso massimo e connettività.',
    author: 'networkx',
    repositoryUrl: 'https://github.com/networkx/networkx',
    stars: 14200,
    license: 'BSD-3-Clause',
    ecosystem: 'python',
    version: '3.3',
    tags: ['graphs', 'algorithms', 'dijkstra', 'networkx'],
    category: 'algorithms',
    toolchain: {
      pythonVersion: '>=3.11',
      purePython: true,
      pyodideCompatible: true,
    },
    files: [
      {
        path: 'requirements.txt',
        content: `networkx>=3.2\n`,
        language: 'text',
      },
      {
        path: 'main.py',
        content: `import networkx as nx

G = nx.Graph()
edges = [
    ('A', 'B', 4), ('A', 'C', 2),
    ('B', 'C', 1), ('B', 'D', 5),
    ('C', 'D', 8), ('C', 'E', 10),
    ('D', 'E', 2)
]

for u, v, w in edges:
    G.add_edge(u, v, weight=w)

shortest_path = nx.shortest_path(G, source='A', target='E', weight='weight')
path_length = nx.shortest_path_length(G, source='A', target='E', weight='weight')

print("Grafo con", G.number_of_nodes(), "nodi e", G.number_of_edges(), "archi.")
print("Percorso minimo da A a E:", " -> ".join(shortest_path))
print("Costo totale del cammino:", path_length)
`,
        language: 'python',
      },
    ],
  },

  // PYTHON: 8. PEP 783 Native WebAssembly Wheel (Pydantic Core - WASM Ready)
  {
    id: 'pydantic-core-wasm-sample',
    name: 'pydantic-core-wasm-sample',
    description: 'Validazione ad alte prestazioni con pydantic-core compilato per pyemscripten_2026_0_wasm32.',
    author: 'pydantic',
    repositoryUrl: 'https://github.com/pydantic/pydantic-core',
    stars: 5400,
    license: 'MIT',
    ecosystem: 'python',
    version: '2.27.2',
    tags: ['validation', 'rust', 'wasm', 'pep783', 'pydantic'],
    category: 'algorithms',
    toolchain: {
      pythonVersion: '>=3.14',
      purePython: false,
      pyodideCompatible: true,
      wasmTier: 'wheel-available',
      platformTag: 'pyemscripten_2026_0_wasm32',
      classificationExplanation: 'Ships native PEP 783 pyemscripten_2026_0_wasm32 wheel directly on PyPI.',
    },
    files: [
      {
        path: 'requirements.txt',
        content: `pydantic_core>=2.27.0\n`,
        language: 'text',
      },
      {
        path: 'main.py',
        content: `from pydantic_core import SchemaValidator, core_schema

schema = core_schema.typed_dict_schema({
    'title': core_schema.typed_dict_field(core_schema.str_schema()),
    'count': core_schema.typed_dict_field(core_schema.int_schema()),
})
v = SchemaValidator(schema)
validated = v.validate_python({'title': 'PEP 783 WASM Wheel', 'count': 42})
print("Validated via Rust WASM Core:", validated)
`,
        language: 'python',
      },
    ],
  },

  // PYTHON: 9. Unsupported C/CUDA Extension Package (PyTorch -> Triggers Mismatch Warning)
  {
    id: 'pytorch-deep-neural-sim',
    name: 'pytorch-deep-neural-sim',
    description: 'Simulazione reti neurali profonde con PyTorch (Richiede backend CUDA nativo).',
    author: 'pytorch',
    repositoryUrl: 'https://github.com/pytorch/pytorch',
    stars: 87000,
    license: 'BSD-3-Clause',
    ecosystem: 'python',
    version: '2.3.0',
    tags: ['deep-learning', 'neural-networks', 'cuda', 'c-extension'],
    category: 'scientific',
    toolchain: {
      pythonVersion: '>=3.11',
      purePython: false,
      pyodideCompatible: false,
      wasmTier: 'incompatible',
      platformTag: 'incompatible',
      classificationExplanation: 'Heavy native C++/CUDA binaries and multi-GB shared libraries cannot run in browser WebAssembly.',
    },
    files: [
      {
        path: 'requirements.txt',
        content: `torch>=2.2.0
torchvision>=0.17.0
`,
        language: 'text',
      },
      {
        path: 'main.py',
        content: `# PyTorch model requiring C-extensions
import torch
print("PyTorch Version:", torch.__version__)
`,
        language: 'python',
      },
    ],
  },
];

export class DiscoveryEngine {
  private readonly searchCache = new Map<string, { result: DiscoverySearchResult; expiresAt: number }>();
  private readonly cacheTtlMs = 10 * 60 * 1000; // 10 minutes

  /**
   * Evaluates project compatibility dynamically for a package
   */
  evaluatePackageCompatibility(
    pkg: PackageMetadata,
    currentLeanVersion: string = STUDIO_LEAN_DEFAULT_VERSION,
  ): ToolchainCompatibilityReport {
    if (pkg.ecosystem === 'lean4') {
      return evaluateLeanCompatibility(pkg.files, currentLeanVersion);
    }
    return evaluatePythonCompatibility(pkg.files);
  }

  /**
   * Searches repositories across curated collection with optional live proxy fallback
   */
  async search(
    query: string,
    ecosystem: DiscoveryEcosystem = 'all',
  ): Promise<DiscoverySearchResult> {
    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `${ecosystem}:${normalizedQuery}`;

    const cached = this.searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    // 1. Try server live discovery proxy
    try {
      const url = `/api/v1/discovery/search?q=${encodeURIComponent(normalizedQuery)}&ecosystem=${ecosystem}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as DiscoverySearchResult;
        if (data.packages && data.packages.length > 0) {
          this.searchCache.set(cacheKey, {
            result: data,
            expiresAt: Date.now() + this.cacheTtlMs,
          });
          return data;
        }
      }
    } catch {
      // Backend proxy unavailable or offline: fall back to curated library
    }

    // 2. Filter from curated package library
    let filtered = CURATED_PACKAGES.filter((pkg) => {
      if (ecosystem !== 'all' && pkg.ecosystem !== ecosystem) {
        return false;
      }
      if (!normalizedQuery) return true;

      const matchName = pkg.name.toLowerCase().includes(normalizedQuery);
      const matchDesc = pkg.description.toLowerCase().includes(normalizedQuery);
      const matchTag = pkg.tags.some((t) => t.toLowerCase().includes(normalizedQuery));
      const matchAuthor = pkg.author.toLowerCase().includes(normalizedQuery);
      return matchName || matchDesc || matchTag || matchAuthor;
    });

    const result: DiscoverySearchResult = {
      packages: filtered,
      total: filtered.length,
      source: 'curated-cache',
    };

    this.searchCache.set(cacheKey, {
      result,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return result;
  }

  /**
   * Retrieves a single curated package by ID
   */
  getPackageById(id: string): PackageMetadata | undefined {
    return CURATED_PACKAGES.find((p) => p.id === id);
  }
}

export const discoveryEngine = new DiscoveryEngine();
