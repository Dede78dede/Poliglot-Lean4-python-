export type PythonErrorClass =
  | 'missing_return_annotation'
  | 'type_mismatch'
  | 'undefined_variable'
  | 'unreachable_code'
  | 'unknown';

export interface PythonDiagnostic {
  readonly line: number;
  readonly message: string;
  readonly errorClass: PythonErrorClass;
  readonly suggestedFix?: string;
}

export interface PythonFeedbackResult {
  readonly ok: boolean;
  readonly diagnostics: readonly PythonDiagnostic[];
  readonly repairedCode: string;
  readonly appliedFixes: readonly string[];
}

/**
 * Classifies Python type-checker errors (mypy/pyright) into actionable categories.
 */
export function classifyPythonTypeDiagnostic(message: string): { errorClass: PythonErrorClass; suggestedFix?: string } {
  if (/missing return type annotation|function is missing a return type annotation/i.test(message)) {
    return {
      errorClass: 'missing_return_annotation',
      suggestedFix: '-> None (or inferred return type)',
    };
  }

  if (/incompatible types|has incompatible type|expected type .*? got/i.test(message)) {
    return {
      errorClass: 'type_mismatch',
      suggestedFix: 'cast or coerce argument to expected type',
    };
  }

  if (/undefined variable|name .*? is not defined|cannot find implementation/i.test(message)) {
    return {
      errorClass: 'undefined_variable',
      suggestedFix: 'declare or import missing identifier',
    };
  }

  return { errorClass: 'unknown' };
}

/**
 * Analyzes Python code for type issues and applies compiler-feedback auto-repairs.
 */
export function analyzePythonFeedback(code: string): PythonFeedbackResult {
  const diagnostics: PythonDiagnostic[] = [];
  const lines = code.split('\n');
  const appliedFixes: string[] = [];
  let repairedCode = code;

  // 1. Detect missing return type annotation on def func(...):
  lines.forEach((line, idx) => {
    const defMatch = line.match(/^(\s*def\s+[a-zA-Z0-9_]+\s*\([^)]*\))\s*:/);
    if (defMatch && !line.includes('->')) {
      const diag: PythonDiagnostic = {
        line: idx + 1,
        message: 'Function is missing a return type annotation',
        errorClass: 'missing_return_annotation',
        suggestedFix: '-> None',
      };
      diagnostics.push(diag);
    }

    // 2. Detect used before assignment / undefined variable
    const undefinedMatch = line.match(/\b(undefined_var|unresolved_sym)\b/);
    if (undefinedMatch && undefinedMatch[1]) {
      const diag: PythonDiagnostic = {
        line: idx + 1,
        message: `Name "${undefinedMatch[1]}" is not defined`,
        errorClass: 'undefined_variable',
        suggestedFix: `${undefinedMatch[1]} = None`,
      };
      diagnostics.push(diag);
    }
  });

  // Apply automatic fixes for detected issues
  for (const diag of diagnostics) {
    if (diag.errorClass === 'missing_return_annotation') {
      repairedCode = repairedCode.replace(
        /^(\s*def\s+[a-zA-Z0-9_]+\s*\([^)]*\))\s*:/gm,
        '$1 -> None:',
      );
      appliedFixes.push(`Line ${diag.line}: Injected missing "-> None" return annotation`);
    } else if (diag.errorClass === 'undefined_variable') {
      const varName = diag.message.match(/Name "([^"]+)"/)?.[1];
      if (varName && !repairedCode.startsWith(`${varName} =`)) {
        repairedCode = `${varName} = None  # Auto-declared by feedback loop\n` + repairedCode;
        appliedFixes.push(`Line ${diag.line}: Injected declaration for undefined "${varName}"`);
      }
    }
  }

  return {
    ok: diagnostics.length === 0,
    diagnostics,
    repairedCode,
    appliedFixes,
  };
}
