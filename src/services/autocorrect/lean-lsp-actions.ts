export interface LeanCodeAction {
  readonly id: string;
  readonly title: string;
  readonly kind: 'quickfix' | 'refactor';
  readonly line: number;
  readonly originalText: string;
  readonly replacementText: string;
  readonly explanation: string;
}

/**
 * Extracts "Try this:" LSP suggestions from Lean 4 compiler output or diagnostics.
 * Translates exact?, simp?, apply? tactics into replacement code actions.
 */
export function extractLeanCodeActions(
  code: string,
  compilerOutput: string,
): readonly LeanCodeAction[] {
  const actions: LeanCodeAction[] = [];
  const lines = code.split('\n');

  // Match pattern: Try this: <tactic> (or at line L:C: Try this: ...)
  // e.g. "Try this: rfl" or "Try this: simp only [add_comm]"
  const tryThisRegex = /(?:line\s+(\d+).*?)?Try\s+this:\s*([^\r\n]+)/gi;
  let match: RegExpExecArray | null;

  while ((match = tryThisRegex.exec(compilerOutput)) !== null) {
    const specifiedLine = match[1] ? Number.parseInt(match[1], 10) : undefined;
    const replacementText = match[2]?.trim();
    if (!replacementText) continue;

    // Find corresponding line in source code containing exact?, simp?, or sorry
    let targetLineIdx = -1;
    if (specifiedLine !== undefined && specifiedLine >= 1 && specifiedLine <= lines.length) {
      targetLineIdx = specifiedLine - 1;
    } else {
      targetLineIdx = lines.findIndex((l) =>
        /\b(exact\?|simp\?|apply\?|sorry)\b/.test(l),
      );
    }

    if (targetLineIdx !== -1) {
      const originalLine = lines[targetLineIdx] ?? '';
      actions.push({
        id: `lean-action-${actions.length + 1}`,
        title: `Try this: ${replacementText}`,
        kind: 'quickfix',
        line: targetLineIdx + 1,
        originalText: originalLine,
        replacementText: originalLine.replace(/\b(exact\?|simp\?|apply\?|sorry)\b/, replacementText),
        explanation: `Replaces search tactic with kernel-elaborated proof term "${replacementText}".`,
      });
    }
  }

  // Also match inline exact? or simp? in code if compiler output suggests rfl
  if (actions.length === 0 && (compilerOutput.includes('rfl') || compilerOutput.includes('exact rfl'))) {
    const exactIdx = lines.findIndex((l) => l.includes('exact?'));
    if (exactIdx !== -1) {
      const originalLine = lines[exactIdx] ?? '';
      actions.push({
        id: `lean-action-exact-rfl`,
        title: 'Try this: rfl',
        kind: 'quickfix',
        line: exactIdx + 1,
        originalText: originalLine,
        replacementText: originalLine.replace('exact?', 'rfl'),
        explanation: 'Closed goal by definitional computation.',
      });
    }
  }

  return actions;
}

/**
 * Applies all non-conflicting code actions across a source file atomically ("Fix All in File").
 */
export function applyAllLeanFixes(
  code: string,
  actions: readonly LeanCodeAction[],
): { updatedCode: string; appliedCount: number } {
  if (actions.length === 0) {
    return { updatedCode: code, appliedCount: 0 };
  }

  const lines = code.split('\n');
  let appliedCount = 0;

  for (const action of actions) {
    const idx = action.line - 1;
    if (idx >= 0 && idx < lines.length) {
      lines[idx] = action.replacementText;
      appliedCount++;
    }
  }

  return {
    updatedCode: lines.join('\n'),
    appliedCount,
  };
}
