import { z } from 'zod';
import type { SupportedLanguage } from '../types/language';

export const EXAMPLE_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export type ExampleDifficulty = (typeof EXAMPLE_DIFFICULTIES)[number];

export const CodeExampleSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(100),
  language: z.enum(['python', 'lean4']),
  difficulty: z.enum(EXAMPLE_DIFFICULTIES),
  category: z.string().min(1),
  description: z.string().min(1).max(300),
  code: z.string().min(1),
  solution: z.string().optional(),
  expectedGoal: z.string().optional(),
  expectedOutput: z.string().optional(),
  objectives: z.array(z.string()).min(1).max(5),
  tags: z.array(z.string()).max(10),
});

export type CodeExample = z.infer<typeof CodeExampleSchema>;

/**
 * Tier 2: Guided Lean 4 Learning Path
 * 7 progressive proof milestones using robust Lean 4 core tactics (rfl, cases, induction, simp, omega).
 */
export const LEAN_GUIDED_STEPS: readonly CodeExample[] = Object.freeze([
  {
    id: 'lean-step-1',
    title: '1. Reflexivity & Computation',
    language: 'lean4',
    difficulty: 'beginner',
    category: 'Core Proofs',
    description: 'Prove equality by definitional reflexivity using the `rfl` tactic.',
    code: `-- Step 1: Reflexivity
-- Goal: Prove that 2 + 2 = 4 by definitional computation.
-- Replace \`sorry\` with: rfl
example : 2 + 2 = 4 := by
  sorry
`,
    solution: `example : 2 + 2 = 4 := by
  rfl
`,
    expectedGoal: '⊢ 2 + 2 = 4',
    expectedOutput: 'No goals — proof complete',
    objectives: ['Understand how Lean checks definitional equality', 'Close goals using the `rfl` tactic'],
    tags: ['reflexivity', 'rfl', 'arithmetic'],
  },
  {
    id: 'lean-step-2',
    title: '2. Case Analysis on Booleans',
    language: 'lean4',
    difficulty: 'beginner',
    category: 'Core Proofs',
    description: 'Split boolean values into true and false branches with `cases`.',
    code: `-- Step 2: Boolean Case Analysis
-- Prove that (b && true) = b for all booleans b.
-- Replace \`sorry\` with: cases b <;> rfl
example (b : Bool) : (b && true) = b := by
  sorry
`,
    solution: `example (b : Bool) : (b && true) = b := by
  cases b <;> rfl
`,
    expectedGoal: '⊢ (b && true) = b',
    expectedOutput: 'No goals — proof complete',
    objectives: ['Split hypotheses with `cases`', 'Use `<;>` tacticals to solve all subgoals'],
    tags: ['cases', 'bool', 'logic'],
  },
  {
    id: 'lean-step-3',
    title: '3. Mathematical Induction on Nat',
    language: 'lean4',
    difficulty: 'intermediate',
    category: 'Core Proofs',
    description: 'Prove that n + 0 = n by induction over natural numbers.',
    code: `-- Step 3: Mathematical Induction
-- Prove that n + 0 = n for every natural number n.
-- Replace \`sorry\` with: induction n with | zero => rfl | succ n ih => simp [ih]
example (n : Nat) : n + 0 = n := by
  sorry
`,
    solution: `example (n : Nat) : n + 0 = n := by
  induction n with
  | zero => rfl
  | succ n ih => simp [ih]
`,
    expectedGoal: '⊢ n + 0 = n',
    expectedOutput: 'No goals — proof complete',
    objectives: ['Master mathematical induction in Lean 4', 'Handle zero base case and succ inductive step'],
    tags: ['induction', 'nat', 'arithmetic'],
  },
  {
    id: 'lean-step-4',
    title: '4. Conjunction Introduction',
    language: 'lean4',
    difficulty: 'beginner',
    category: 'Propositional Logic',
    description: 'Construct a proof of p ∧ q given proofs of p and q.',
    code: `-- Step 4: Conjunction
-- Prove that if p and q both hold, then (p ∧ q) holds.
-- Replace \`sorry\` with: exact ⟨hp, hq⟩
example (p q : Prop) (hp : p) (hq : q) : p ∧ q := by
  sorry
`,
    solution: `example (p q : Prop) (hp : p) (hq : q) : p ∧ q := by
  exact ⟨hp, hq⟩
`,
    expectedGoal: '⊢ p ∧ q',
    expectedOutput: 'No goals — proof complete',
    objectives: ['Use constructor terms ⟨hp, hq⟩', 'Work with proposition hypotheses'],
    tags: ['and', 'logic', 'exact'],
  },
  {
    id: 'lean-step-5',
    title: '5. Disjunction Commutativity',
    language: 'lean4',
    difficulty: 'intermediate',
    category: 'Propositional Logic',
    description: 'Show that logical OR is commutative: (p ∨ q) → (q ∨ p).',
    code: `-- Step 5: Disjunction Commutativity
-- Given h : p ∨ q, prove that q ∨ p holds.
-- Replace \`sorry\` with: cases h with | inl hp => exact Or.inr hp | inr hq => exact Or.inl hq
example (p q : Prop) (h : p ∨ q) : q ∨ p := by
  sorry
`,
    solution: `example (p q : Prop) (h : p ∨ q) : q ∨ p := by
  cases h with
  | inl hp => exact Or.inr hp
  | inr hq => exact Or.inl hq
`,
    expectedGoal: '⊢ q ∨ p',
    expectedOutput: 'No goals — proof complete',
    objectives: ['Deconstruct disjunctions with Or.inl and Or.inr', 'Exhaustive branching'],
    tags: ['or', 'cases', 'logic'],
  },
  {
    id: 'lean-step-6',
    title: '6. Linear Arithmetic Automation',
    language: 'lean4',
    difficulty: 'intermediate',
    category: 'Automation',
    description: 'Solve Presburger arithmetic automatically using the `omega` tactic.',
    code: `-- Step 6: Omega Decision Procedure
-- Prove commutativity of addition for natural numbers.
-- In modern Lean 4 core, \`omega\` handles linear integer arithmetic automatically!
-- Replace \`sorry\` with: omega
theorem add_comm_auto (a b : Nat) : a + b = b + a := by
  sorry
`,
    solution: `theorem add_comm_auto (a b : Nat) : a + b = b + a := by
  omega
`,
    expectedGoal: '⊢ a + b = b + a',
    expectedOutput: 'No goals — proof complete',
    objectives: ['Leverage Lean 4 core `omega` decision procedure', 'Automate arithmetic equalities'],
    tags: ['omega', 'automation', 'arithmetic'],
  },
  {
    id: 'lean-step-7',
    title: '7. Modus Ponens & Implication Chains',
    language: 'lean4',
    difficulty: 'advanced',
    category: 'Deductive Logic',
    description: 'Chain multiple implications and apply hypotheses.',
    code: `-- Step 7: Implication Chains
-- Prove transitivity of logical implication: (p → q) → (q → r) → (p → r)
-- Replace \`sorry\` with: intros hpq hqr hp; exact hqr (hpq hp)
theorem imp_trans (p q r : Prop) : (p → q) → (q → r) → (p → r) := by
  sorry
`,
    solution: `theorem imp_trans (p q r : Prop) : (p → q) → (q → r) → (p → r) := by
  intros hpq hqr hp
  exact hqr (hpq hp)
`,
    expectedGoal: '⊢ (p → q) → (q → r) → (p → r)',
    expectedOutput: 'No goals — proof complete',
    objectives: ['Introduce hypotheses with `intros`', 'Apply function-like modus ponens'],
    tags: ['implication', 'transitivity', 'exact'],
  },
]);

/**
 * Tier 2: Guided Python Learning Path
 * 6 progressive milestones demonstrating Pyodide scientific capabilities and micropip.
 */
export const PYTHON_GUIDED_STEPS: readonly CodeExample[] = Object.freeze([
  {
    id: 'py-step-1',
    title: '1. Hello Pyodide WebAssembly',
    language: 'python',
    difficulty: 'beginner',
    category: 'Python Basics',
    description: 'Run Python 3.14 code executing natively in browser WebAssembly.',
    code: `# Step 1: Standard output in Pyodide WebAssembly
import sys

print("Hello from Polyglot Code Studio!")
print(f"Python Version: {sys.version}")
print("Executing purely client-side inside a sandboxed Web Worker.")
`,
    expectedOutput: 'Hello from Polyglot Code Studio!',
    objectives: ['Verify client-side stdout streaming', 'Inspect CPython version'],
    tags: ['basics', 'print', 'sys'],
  },
  {
    id: 'py-step-2',
    title: '2. Functional List Comprehensions',
    language: 'python',
    difficulty: 'beginner',
    category: 'Data Structures',
    description: 'Filter, map, and transform data using Python list and dict comprehensions.',
    code: `# Step 2: List & Dictionary Comprehensions
numbers = list(range(1, 21))

# Filter evens and compute cubes
cubes_of_evens = [x**3 for x in numbers if x % 2 == 0]
print(f"Cubes of evens: {cubes_of_evens}")

# Create frequency mapping
parity_map = {x: "even" if x % 2 == 0 else "odd" for x in numbers[:6]}
print(f"Parity mapping: {parity_map}")
`,
    expectedOutput: 'Cubes of evens',
    objectives: ['Practice idiomatic Python list comprehensions', 'Build structured dictionaries'],
    tags: ['comprehensions', 'data-structures'],
  },
  {
    id: 'py-step-3',
    title: '3. NumPy Vectorized Operations',
    language: 'python',
    difficulty: 'intermediate',
    category: 'Scientific Stack',
    description: 'Matrix multiplication, eigenvalues, and broadcasting with NumPy.',
    code: `# Step 3: NumPy Array Processing
import numpy as np

# Create 3x3 symmetric matrix
A = np.array([[4.0, 1.0, 2.0],
              [1.0, 5.0, 3.0],
              [2.0, 3.0, 6.0]])

# Compute eigenvalues and eigenvectors
eigenvalues, eigenvectors = np.linalg.eigh(A)

print("Matrix A:")
print(A)
print("\nEigenvalues:")
print(eigenvalues)
print(f"\nTrace: {np.trace(A)} | Determinant: {np.linalg.det(A):.2f}")
`,
    expectedOutput: 'Eigenvalues',
    objectives: ['Use pre-compiled NumPy in WebAssembly', 'Perform linear algebra calculations'],
    tags: ['numpy', 'linear-algebra', 'matrices'],
  },
  {
    id: 'py-step-4',
    title: '4. Dynamic Package Installation (micropip)',
    language: 'python',
    difficulty: 'intermediate',
    category: 'Pyodide Ecosystem',
    description: 'Install and use pure-Python wheels directly from PyPI at runtime.',
    code: `# Step 4: Dynamic Package Management with micropip
import micropip

print("Installing 'tabulate' from PyPI at runtime...")
await micropip.install("tabulate")

from tabulate import tabulate

data = [
    ["Python 3.14", "Client (WASM)", "CPython in Web Worker"],
    ["Lean 4.26", "Server (REST)", "Kimina Formal Verifier"],
    ["Zod 4.2+", "Shared Contract", "Two-Argument Schemas"],
]

print("\n" + tabulate(data, headers=["Runtime", "Domain", "Engine"], tablefmt="grid"))
`,
    expectedOutput: 'Runtime',
    objectives: ['Install packages dynamically via micropip', 'Format tabular output'],
    tags: ['micropip', 'packages', 'tabulate'],
  },
  {
    id: 'py-step-5',
    title: '5. Fast Fourier Transform & Signal Processing',
    language: 'python',
    difficulty: 'advanced',
    category: 'Scientific Stack',
    description: 'Generate composite audio waves and compute frequency spectral peaks.',
    code: `# Step 5: FFT & Frequency Domain Analysis
import numpy as np

# Synthesize a dual-tone signal (50Hz + 120Hz)
sample_rate = 1000
duration = 1.0
t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
signal = 0.7 * np.sin(2 * np.pi * 50 * t) + 1.2 * np.sin(2 * np.pi * 120 * t)

# Fast Fourier Transform
fft_values = np.fft.rfft(signal)
frequencies = np.fft.rfftfreq(len(t), 1 / sample_rate)
amplitudes = np.abs(fft_values) / len(t)

# Find top peak frequencies
peak_indices = np.argsort(amplitudes)[-2:][::-1]
for idx in peak_indices:
    print(f"Detected Peak: {frequencies[idx]:.1f} Hz (amplitude: {amplitudes[idx]:.2f})")
`,
    expectedOutput: 'Detected Peak: 120.0 Hz',
    objectives: ['Use numpy.fft in Pyodide', 'Detect frequency harmonics'],
    tags: ['fft', 'signals', 'numpy'],
  },
  {
    id: 'py-step-6',
    title: '6. Verified Monte Carlo Pi Estimation',
    language: 'python',
    difficulty: 'intermediate',
    category: 'Algorithms',
    description: 'Estimate mathematical constant Pi using statistical sampling.',
    code: `# Step 6: Monte Carlo Simulation
import numpy as np
import math

n_samples = 500_000
points = np.random.uniform(-1.0, 1.0, size=(n_samples, 2))
inside_circle = np.sum(points[:, 0]**2 + points[:, 1]**2 <= 1.0)

estimated_pi = (4.0 * inside_circle) / n_samples
error_percent = abs(estimated_pi - math.pi) / math.pi * 100

print(f"Samples: {n_samples:,}")
print(f"Estimated Pi : {estimated_pi:.6f}")
print(f"True Pi      : {math.pi:.6f}")
print(f"Error        : {error_percent:.4f}%")
`,
    expectedOutput: 'Estimated Pi',
    objectives: ['Run vectorized Monte Carlo simulations', 'Benchmark statistical convergence'],
    tags: ['monte-carlo', 'simulation', 'math'],
  },
]);

/**
 * Tier 3: Curated Reference Gallery
 */
export const FULL_GALLERY_EXAMPLES: readonly CodeExample[] = Object.freeze([
  ...LEAN_GUIDED_STEPS,
  ...PYTHON_GUIDED_STEPS,
  {
    id: 'lean-curry-howard',
    title: 'Curry-Howard Isomorphism',
    language: 'lean4',
    difficulty: 'intermediate',
    category: 'Type Theory',
    description: 'Demonstrating that propositions are types and proofs are terms.',
    code: `-- Curry-Howard: A proof is simply a lambda function!
def modus_ponens_term (P Q : Prop) : P → (P → Q) → Q :=
  fun hp hpq => hpq hp

#check modus_ponens_term
#print modus_ponens_term
`,
    objectives: ['See proof terms as pure functions', 'Inspect types with #check'],
    tags: ['curry-howard', 'type-theory', 'terms'],
  },
  {
    id: 'py-primes-sieve',
    title: 'Sieve of Eratosthenes',
    language: 'python',
    difficulty: 'intermediate',
    category: 'Algorithms',
    description: 'High-performance prime number generator using array masking.',
    code: `import numpy as np

def sieve_of_eratosthenes(limit: int) -> list[int]:
    is_prime = np.ones(limit + 1, dtype=bool)
    is_prime[0:2] = False
    for p in range(2, int(limit**0.5) + 1):
        if is_prime[p]:
            is_prime[p*p : limit + 1 : p] = False
    return np.nonzero(is_prime)[0].tolist()

primes = sieve_of_eratosthenes(100)
print(f"Primes up to 100 ({len(primes)} total):\\n{primes}")
`,
    objectives: ['Implement prime sieve with numpy masking'],
    tags: ['primes', 'algorithms', 'numpy'],
  },
]);
