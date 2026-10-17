export interface SimulatorResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
  readonly durationMs: number;
  readonly simulated: true;
  readonly verified: false;
}

/**
 * Local syntax-aware simulator for Lean 4.
 *
 * Safety requirements:
 * 1. Output ALWAYS starts with "⚠ SIMULATED: No verification performed".
 * 2. verified is ALWAYS strictly false.
 * 3. Never claims a proof is verified.
 * 4. Recognizes core Lean 4 syntax (#check, #eval, theorem, example, sorry)
 *    to provide immediate interactive educational feedback in dev mode.
 */
export class KiminaSimulator {
  private static readonly NOTICE_PREFIX =
    '⚠ SIMULATED: No verification performed — Kimina Lean Server container not connected.\n' +
    '------------------------------------------------------------------------\n';

  verify(code: string): SimulatorResult {
    const start = performance.now();
    const trimmed = code.trim();

    if (trimmed.length === 0) {
      return {
        stdout: '',
        stderr: `${KiminaSimulator.NOTICE_PREFIX}Error: Empty Lean 4 input.`,
        exitCode: 1,
        durationMs: performance.now() - start,
        simulated: true,
        verified: false,
      };
    }

    const durationMs = Math.round((performance.now() - start) * 10) / 10 + 12;

    // Recognize #check <expr>
    const checkMatch = /^#check\s+(.+)$/m.exec(trimmed);
    if (checkMatch?.[1]) {
      const expr = checkMatch[1].trim();
      const inferredType = this.inferTypeForCheck(expr);
      return {
        stdout: `${KiminaSimulator.NOTICE_PREFIX}${expr} : ${inferredType}`,
        stderr: '',
        exitCode: 0,
        durationMs,
        simulated: true,
        verified: false,
      };
    }

    // Recognize #eval <expr>
    const evalMatch = /^#eval\s+(.+)$/m.exec(trimmed);
    if (evalMatch?.[1]) {
      const expr = evalMatch[1].trim();
      const evalValue = this.simulateEval(expr);
      return {
        stdout: `${KiminaSimulator.NOTICE_PREFIX}${evalValue}`,
        stderr: '',
        exitCode: 0,
        durationMs,
        simulated: true,
        verified: false,
      };
    }

    // Recognize theorem / lemma / example / def
    if (/\b(theorem|lemma|example|def)\b/.test(trimmed)) {
      const hasSorry = /\bsorry\b/.test(trimmed);
      if (hasSorry) {
        return {
          stdout:
            `${KiminaSimulator.NOTICE_PREFIX}` +
            `declaration uses 'sorry'\n` +
            `Remaining goals:\n` +
            `⊢ Goal not closed (contains sorry)`,
          stderr: '',
          exitCode: 0,
          durationMs,
          simulated: true,
          verified: false,
        };
      }

      // Simulated proof with tactics
      return {
        stdout:
          `${KiminaSimulator.NOTICE_PREFIX}` +
          `Proof syntactic structure recognized.\n` +
          `Notice: Full formal proof validation requires active Kimina Docker container (KIMINA_MODE=real).`,
        stderr: '',
        exitCode: 0,
        durationMs,
        simulated: true,
        verified: false,
      };
    }

    return {
      stdout:
        `${KiminaSimulator.NOTICE_PREFIX}` +
        `Simulated syntax parser executed. Connect Kimina Lean Server container for full elaboration.`,
      stderr: '',
      exitCode: 0,
      durationMs,
      simulated: true,
      verified: false,
    };
  }

  private inferTypeForCheck(expr: string): string {
    if (expr === 'Nat' || expr === 'Int' || expr === 'Bool' || expr === 'String') return 'Type';
    if (expr === 'True' || expr === 'False') return 'Prop';
    if (/^\d+$/.test(expr)) return 'Nat';
    if (/^".*"$/.test(expr)) return 'String';
    if (expr.includes('->') || expr.includes('→')) return 'Type';
    return 'Type';
  }

  private simulateEval(expr: string): string {
    try {
      if (/^[\d\s+\-*/()]+$/.test(expr)) {
        // Safe evaluation of simple integer arithmetic
        // eslint-disable-next-line no-eval
        const result = Function(`"use strict"; return (${expr})`)();
        return String(result);
      }
    } catch {
      // Fallback
    }
    return `(simulated evaluation of: ${expr})`;
  }
}
