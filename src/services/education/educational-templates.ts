/**
 * Educational Mode Templates (Phase 10.9.5, Task S4)
 *
 * Curated pedagogical game templates (Robo / Natural Number Game, Lean4Game).
 * Gated by feature flag ENABLE_EDUCATIONAL_MODE (default: false).
 */

import { featureFlagRegistry } from '../flags/feature-flag-registry';

export interface EducationalTemplate {
  readonly id: string;
  readonly title: string;
  readonly gameType: 'robo_nng' | 'lean4game_logic' | 'provable_python';
  readonly difficulty: 'introductory' | 'intermediate' | 'advanced';
  readonly description: string;
  readonly initialCode: string;
  readonly goalStatement: string;
  readonly solutionHint: string;
}

export const EDUCATIONAL_TEMPLATES: readonly EducationalTemplate[] = Object.freeze([
  {
    id: 'robo-nng-add-zero',
    title: 'Robo: Addition World — Level 1 (zero_add)',
    gameType: 'robo_nng',
    difficulty: 'introductory',
    description: 'Learn proof by induction on the natural numbers. Prove that 0 + n = n for all n : Nat.',
    initialCode: [
      '-- Robo Educational Mode: Natural Number Game',
      '-- Level 1: zero_add',
      'theorem zero_add (n : Nat) : 0 + n = n := by',
      '  induction n with',
      '  | zero => rfl',
      '  | succ d ih =>',
      '    rw [Nat.add_succ, ih]',
    ].join('\n'),
    goalStatement: '∀ (n : Nat), 0 + n = n',
    solutionHint: 'Use `induction n with | zero => rfl | succ d ih => ...` and apply the induction hypothesis.',
  },
  {
    id: 'lean4game-set-inter-subset',
    title: 'Lean4Game: Set Theory World — Level 2 (inter_subset_left)',
    gameType: 'lean4game_logic',
    difficulty: 'introductory',
    description: 'First steps in set theory: prove that the intersection of two sets A and B is a subset of A.',
    initialCode: [
      '-- Lean4Game: Set Theory World',
      '-- Level 2: Intersection Subset',
      'variable {α : Type} (A B : Set α)',
      '',
      'theorem inter_subset_left : A ∩ B ⊆ A := by',
      '  intro x hx',
      '  exact hx.1',
    ].join('\n'),
    goalStatement: 'A ∩ B ⊆ A',
    solutionHint: 'Unfold the definition of subset with `intro x hx` then access the left conjunct with `hx.1`.',
  },
  {
    id: 'provable-python-fibonacci',
    title: 'Provable Python: Fibonacci Invariant Induction',
    gameType: 'provable_python',
    difficulty: 'intermediate',
    description: 'Bridge Python iterative implementation with Lean 4 formal induction specification.',
    initialCode: [
      '# Python 3.14 Provable Implementation',
      'def fib(n: int) -> int:',
      '    if n <= 0: return 0',
      '    if n == 1: return 1',
      '    a, b = 0, 1',
      '    for _ in range(2, n + 1):',
      '        a, b = b, a + b',
      '    return b',
    ].join('\n'),
    goalStatement: 'fib(n) matches formal mathematical recurrence F_0=0, F_1=1, F_{n+2}=F_{n+1}+F_n',
    solutionHint: 'Use the PastaLean Bridge to emit two-file formal specification and induction proofs.',
  },
]);

export class EducationalService {
  public isEnabled(): boolean {
    return featureFlagRegistry.isEnabled('ENABLE_EDUCATIONAL_MODE');
  }

  public listTemplates(): readonly EducationalTemplate[] {
    if (!this.isEnabled()) {
      return [];
    }
    return EDUCATIONAL_TEMPLATES;
  }

  public getTemplate(id: string): EducationalTemplate | undefined {
    if (!this.isEnabled()) {
      return undefined;
    }
    return EDUCATIONAL_TEMPLATES.find((t) => t.id === id);
  }
}

export const educationalService = new EducationalService();
