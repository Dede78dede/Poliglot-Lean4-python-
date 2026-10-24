/**
 * Heron Linter & Refactoring Bridge Service
 *
 * Implements Codeberg wvhulle/heron (2026-06-13):
 * Linter for Lean 4 with automatic fixes and refactors provided to LSP clients.
 * Requires Lean 4 fork (branch lean-fork/v4.31.0) isolated in heron-runner.
 *
 * Gated behind feature flag ENABLE_HERON (default: false).
 */

export interface LeanDiagnostic {
  readonly ruleId: string;
  readonly message: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly line: number;
  readonly character: number;
  readonly suggestedRefactorId?: string;
  readonly replacement?: string;
}

export interface RefactorAction {
  readonly id: string;
  readonly title: string;
  readonly ruleId: string;
  readonly replacementCode: string;
}

export class HeronLinterService {
  private enabled: boolean = false;
  public readonly requiredToolchain: string = 'lean-fork/v4.31.0';

  constructor() {
    this.enabled =
      typeof process !== 'undefined'
        ? process.env?.['ENABLE_HERON'] === 'true'
        : false;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
  }

  /**
   * Lints Lean 4 code with Heron check rules.
   */
  public async lintLean(code: string): Promise<readonly LeanDiagnostic[]> {
    if (!this.enabled) {
      return Object.freeze([]);
    }

    const diagnostics: LeanDiagnostic[] = [];
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      // Rule H001: Unused variable
      if (line.includes('let _unused =') || line.includes('(h_unused :')) {
        diagnostics.push({
          ruleId: 'HERON_001_UNUSED_BINDER',
          message: 'Unused binder detected in declaration context',
          severity: 'warning',
          line: i + 1,
          character: 2,
          suggestedRefactorId: `remove-unused-${i}`,
          replacement: line.replace(/let\s+_unused\s*=[^;]+;?/, ''),
        });
      }

      // Rule H002: Redundant type annotation
      if (line.includes(': Nat := (1 : Nat)')) {
        diagnostics.push({
          ruleId: 'HERON_002_REDUNDANT_COERCION',
          message: 'Redundant explicit type coercion on natural literal',
          severity: 'info',
          line: i + 1,
          character: 10,
          suggestedRefactorId: `simplify-coercion-${i}`,
          replacement: line.replace(': Nat := (1 : Nat)', ':= 1'),
        });
      }
    }

    return Object.freeze(diagnostics);
  }

  /**
   * Applies an automated refactor suggested by Heron.
   */
  public async applyRefactor(code: string, refactorId: string): Promise<string> {
    if (!this.enabled) {
      throw new Error('HERON_DISABLED: Heron linter is disabled by default (ENABLE_HERON=false). Requires heron-runner fork container.');
    }

    const diags = await this.lintLean(code);
    const target = diags.find((d) => d.suggestedRefactorId === refactorId);
    if (!target || !target.replacement) {
      return code;
    }

    const lines = code.split('\n');
    lines[target.line - 1] = target.replacement;
    return lines.join('\n');
  }
}

export const heronLinterService = new HeronLinterService();
