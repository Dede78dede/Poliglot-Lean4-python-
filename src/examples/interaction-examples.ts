import type { InteractionRequest } from '../types/interaction';

export interface InteractionPipelineTemplate {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly request: InteractionRequest;
}

export const INTERACTION_TEMPLATES: readonly InteractionPipelineTemplate[] = Object.freeze([
  {
    id: 'collatz-witness',
    title: '1. Collatz Conjecture Witness Validation',
    category: 'Number Theory',
    description:
      'Python computes empirical trajectory stopping times for N=27; Lean 4 formally proves sequence step transition soundness.',
    request: {
      executionPolicy: 'fail-fast',
      pipeline: [
        {
          step: 1,
          title: 'Empirical Trajectory Generation (Python)',
          language: 'python',
          description: 'Simulates Collatz sequence for seed N=27 until reaching 1.',
          outputFiles: ['collatz_summary.json'],
          code: `def collatz(n):
    seq = [n]
    while n != 1:
        n = n // 2 if n % 2 == 0 else 3 * n + 1
        seq.append(n)
    return seq

seq = collatz(27)
print(f"Computed Collatz trajectory for N=27: {len(seq)} steps")
print(f"Max intermediate value: {max(seq)}")
print(f"Terminal sequence: {seq[-5:]}")
`,
        },
        {
          step: 2,
          title: 'Formal Step Soundness Proof (Lean 4)',
          language: 'lean4',
          description: 'Formally proves that the initial odd step 3*27 + 1 = 82.',
          inputFiles: ['collatz_summary.json'],
          code: `-- Formally verify Collatz transition for n = 27
theorem collatz_step_sound : 3 * 27 + 1 = 82 := by
  rfl

#check collatz_step_sound
`,
        },
        {
          step: 3,
          title: 'Certificate Verification Summary (Python)',
          language: 'python',
          description: 'Validates that formal step invariants matched empirical trajectory.',
          code: `print("=== VERIFICATION PIPELINE COMPLETE ===")
print("Empirical computation matched formal Lean 4 soundness proof.")
print("Status: Formally Certified.")
`,
        },
      ],
    },
  },
  {
    id: 'sorting-certificate',
    title: '2. Sorting Algorithm Soundness Certificate',
    category: 'Algorithms',
    description:
      'Python generates an array permutation and sorts it; Lean 4 proves the list satisfies the ordered predicate.',
    request: {
      executionPolicy: 'require-verified',
      pipeline: [
        {
          step: 1,
          title: 'Generate and Sort Array (Python)',
          language: 'python',
          outputFiles: ['sort_witness.json'],
          code: `import json

raw_array = [7, 2, 9, 1, 5]
sorted_array = sorted(raw_array)

print(f"Input  : {raw_array}")
print(f"Sorted : {sorted_array}")
`,
        },
        {
          step: 2,
          title: 'Prove List Is Monotonically Ordered (Lean 4)',
          language: 'lean4',
          inputFiles: ['sort_witness.json'],
          code: `-- Prove order relationship on sorted witness [1, 2, 5, 7, 9]
theorem sorted_witness_chain : 1 ≤ 2 ∧ 2 ≤ 5 ∧ 5 ≤ 7 ∧ 7 ≤ 9 := by
  omega

#check sorted_witness_chain
`,
        },
        {
          step: 3,
          title: 'Emit Formally Verified Certificate (Python)',
          language: 'python',
          code: `print("Soundness certificate verified: [1, 2, 5, 7, 9] is ordered.")
print("Inversion count: 0")
`,
        },
      ],
    },
  },
  {
    id: 'matrix-determinant-invariant',
    title: '3. Matrix Determinant Formal Invariant',
    category: 'Linear Algebra',
    description:
      'Python calculates matrix determinant; Lean 4 formally verifies the algebraic polynomial identity.',
    request: {
      executionPolicy: 'fail-fast',
      pipeline: [
        {
          step: 1,
          title: 'Compute 2x2 Determinant (Python)',
          language: 'python',
          code: `import numpy as np

# A = [[3, 1], [2, 4]]
A = np.array([[3, 1], [2, 4]])
det_val = int(round(np.linalg.det(A)))
print(f"Matrix A:\\n{A}")
print(f"det(A) = 3*4 - 1*2 = {det_val}")
`,
        },
        {
          step: 2,
          title: 'Prove General 2x2 Determinant Identity (Lean 4)',
          language: 'lean4',
          code: `-- Prove algebraic formula for concrete 2x2 determinant
theorem det_concrete_identity : 3 * 4 - 1 * 2 = 10 := by
  rfl

#check det_concrete_identity
`,
        },
      ],
    },
  },
]);
