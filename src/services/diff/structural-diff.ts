/**
 * Structural AST Diff Engine for Lean 4 (Phase 13, Sprint 13.6, DIF1)
 *
 * Epistemic Guardrail:
 * - Differentiates between signature modifications (which invalidate downstream proofs)
 *   and proof-only changes (which preserve external epistemic guarantees).
 * - Detects binder additions, binder removals, and proposition alterations.
 */

export interface LeanDeclarationAst {
  readonly kind: 'theorem' | 'lemma' | 'def' | 'axiom';
  readonly name: string;
  readonly binders: readonly string[];
  readonly typeAnnotation: string;
  readonly proofBody: string;
  readonly rawText: string;
  readonly lineStart: number;
  readonly lineEnd: number;
}

export type StructuralChangeType =
  | 'signature_modified'
  | 'binder_added'
  | 'binder_removed'
  | 'proof_modified'
  | 'declaration_added'
  | 'declaration_removed';

export type EpistemicImpact =
  | 'epistemic_invalidation' // Modifies proposition or binders -> invalidates downstream proofs
  | 'proof_repair_needed'    // Proof changed into invalid/unverified state
  | 'non_breaking';          // Proof changed while preserving exact type signature

export interface StructuralDiffItem {
  readonly declarationName: string;
  readonly kind: 'theorem' | 'lemma' | 'def' | 'axiom';
  readonly changeType: StructuralChangeType;
  readonly epistemicImpact: EpistemicImpact;
  readonly before?: {
    readonly binders: readonly string[];
    readonly typeAnnotation: string;
    readonly proofBody: string;
  };
  readonly after?: {
    readonly binders: readonly string[];
    readonly typeAnnotation: string;
    readonly proofBody: string;
  };
  readonly description: string;
}

export interface StructuralDiffResult {
  readonly success: boolean;
  readonly items: readonly StructuralDiffItem[];
  readonly hasSignatureChanges: boolean;
  readonly requiresReVerification: boolean;
  readonly summary: string;
}

export class StructuralDiffEngine {
  /**
   * Parses Lean declarations into structured AST nodes.
   */
  public parseDeclarations(source: string): readonly LeanDeclarationAst[] {
    const decls: LeanDeclarationAst[] = [];
    const lines = source.split('\n');

    // Regex matching Lean 4 theorem/lemma/def/axiom declarations
    // e.g.: theorem add_comm (a b : Nat) : a + b = b + a := by ring
    const declHeaderRegex = /^(theorem|lemma|def|axiom)\s+([a-zA-Z0-9_'.]+)([\s\S]*?)(?::\s*([\s\S]*?))?(?::=|\s+by|\s+where|$)/;

    let currentDecl: {
      kind: 'theorem' | 'lemma' | 'def' | 'axiom';
      name: string;
      lineStart: number;
      lines: string[];
    } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^(theorem|lemma|def|axiom)\s+([a-zA-Z0-9_'.]+)/);

      if (match) {
        if (currentDecl) {
          decls.push(this.finalizeDeclaration(currentDecl, i - 1));
        }
        currentDecl = {
          kind: match[1] as 'theorem' | 'lemma' | 'def' | 'axiom',
          name: match[2],
          lineStart: i + 1,
          lines: [line],
        };
      } else if (currentDecl) {
        currentDecl.lines.push(line);
      }
    }

    if (currentDecl) {
      decls.push(this.finalizeDeclaration(currentDecl, lines.length));
    }

    return decls;
  }

  private finalizeDeclaration(
    decl: {
      kind: 'theorem' | 'lemma' | 'def' | 'axiom';
      name: string;
      lineStart: number;
      lines: string[];
    },
    lineEnd: number
  ): LeanDeclarationAst {
    const rawText = decl.lines.join('\n');
    let binders: string[] = [];
    let typeAnnotation = '';
    let proofBody = '';

    // Extract binders: (x : Nat) or {x : Nat} or [Group G]
    const binderMatches = rawText.match(/(\([a-zA-Z0-9_\s:,α-ωΑ-Ω∀∃λ→∧∨¬≠≤≥]+\)|\{[a-zA-Z0-9_\s:,α-ωΑ-Ω∀∃λ→∧∨¬≠≤≥]+\}|\[[a-zA-Z0-9_\s:,α-ωΑ-Ω∀∃λ→∧∨¬≠≤≥]+\])/g);
    if (binderMatches) {
      binders = binderMatches.map((b) => b.trim());
    }

    // Split at ':=' or ':= by' or 'by' to separate type from proof
    const assignIndex = rawText.indexOf(':=');
    if (assignIndex !== -1) {
      const header = rawText.slice(0, assignIndex);
      proofBody = rawText.slice(assignIndex + 2).trim();

      const colonIndex = header.indexOf(':');
      if (colonIndex !== -1) {
        typeAnnotation = header.slice(colonIndex + 1).trim();
      }
    } else {
      const byIndex = rawText.indexOf('\nby ');
      if (byIndex !== -1) {
        const header = rawText.slice(0, byIndex);
        proofBody = rawText.slice(byIndex).trim();
        const colonIndex = header.indexOf(':');
        if (colonIndex !== -1) {
          typeAnnotation = header.slice(colonIndex + 1).trim();
        }
      } else {
        const colonIndex = rawText.indexOf(':');
        if (colonIndex !== -1) {
          typeAnnotation = rawText.slice(colonIndex + 1).trim();
        }
      }
    }

    return {
      kind: decl.kind,
      name: decl.name,
      binders: Object.freeze(binders),
      typeAnnotation: typeAnnotation.trim(),
      proofBody: proofBody.trim(),
      rawText,
      lineStart: decl.lineStart,
      lineEnd,
    };
  }

  /**
   * Computes structural AST diff between original and modified Lean sources.
   */
  public diff(originalSource: string, modifiedSource: string): StructuralDiffResult {
    const beforeDecls = new Map<string, LeanDeclarationAst>();
    const afterDecls = new Map<string, LeanDeclarationAst>();

    for (const d of this.parseDeclarations(originalSource)) {
      beforeDecls.set(d.name, d);
    }
    for (const d of this.parseDeclarations(modifiedSource)) {
      afterDecls.set(d.name, d);
    }

    const items: StructuralDiffItem[] = [];
    let hasSignatureChanges = false;
    let requiresReVerification = false;

    // Check modified and removed declarations
    for (const [name, before] of beforeDecls.entries()) {
      const after = afterDecls.get(name);
      if (!after) {
        // Removed declaration
        items.push({
          declarationName: name,
          kind: before.kind,
          changeType: 'declaration_removed',
          epistemicImpact: 'epistemic_invalidation',
          before: {
            binders: before.binders,
            typeAnnotation: before.typeAnnotation,
            proofBody: before.proofBody,
          },
          description: `Declaration ${name} was deleted.`,
        });
        hasSignatureChanges = true;
        requiresReVerification = true;
        continue;
      }

      // Check binders
      const beforeBinders = before.binders.join(' ');
      const afterBinders = after.binders.join(' ');
      if (before.binders.length < after.binders.length) {
        items.push({
          declarationName: name,
          kind: after.kind,
          changeType: 'binder_added',
          epistemicImpact: 'epistemic_invalidation',
          before: { binders: before.binders, typeAnnotation: before.typeAnnotation, proofBody: before.proofBody },
          after: { binders: after.binders, typeAnnotation: after.typeAnnotation, proofBody: after.proofBody },
          description: `Binder added to ${name}: (${after.binders.filter((b) => !before.binders.includes(b)).join(', ')})`,
        });
        hasSignatureChanges = true;
        requiresReVerification = true;
      } else if (before.binders.length > after.binders.length) {
        items.push({
          declarationName: name,
          kind: after.kind,
          changeType: 'binder_removed',
          epistemicImpact: 'epistemic_invalidation',
          before: { binders: before.binders, typeAnnotation: before.typeAnnotation, proofBody: before.proofBody },
          after: { binders: after.binders, typeAnnotation: after.typeAnnotation, proofBody: after.proofBody },
          description: `Binder removed from ${name}: (${before.binders.filter((b) => !after.binders.includes(b)).join(', ')})`,
        });
        hasSignatureChanges = true;
        requiresReVerification = true;
      }

      // Check type proposition signature
      if (before.typeAnnotation !== after.typeAnnotation) {
        items.push({
          declarationName: name,
          kind: after.kind,
          changeType: 'signature_modified',
          epistemicImpact: 'epistemic_invalidation',
          before: { binders: before.binders, typeAnnotation: before.typeAnnotation, proofBody: before.proofBody },
          after: { binders: after.binders, typeAnnotation: after.typeAnnotation, proofBody: after.proofBody },
          description: `Proposition signature of ${name} altered: "${before.typeAnnotation}" -> "${after.typeAnnotation}"`,
        });
        hasSignatureChanges = true;
        requiresReVerification = true;
      } else if (before.proofBody !== after.proofBody) {
        // Only proof body was modified! Signature preserved!
        items.push({
          declarationName: name,
          kind: after.kind,
          changeType: 'proof_modified',
          epistemicImpact: 'non_breaking',
          before: { binders: before.binders, typeAnnotation: before.typeAnnotation, proofBody: before.proofBody },
          after: { binders: after.binders, typeAnnotation: after.typeAnnotation, proofBody: after.proofBody },
          description: `Proof body for ${name} modified; type signature remains invariant.`,
        });
        requiresReVerification = true;
      }
    }

    // Check newly added declarations
    for (const [name, after] of afterDecls.entries()) {
      if (!beforeDecls.has(name)) {
        items.push({
          declarationName: name,
          kind: after.kind,
          changeType: 'declaration_added',
          epistemicImpact: 'non_breaking',
          after: {
            binders: after.binders,
            typeAnnotation: after.typeAnnotation,
            proofBody: after.proofBody,
          },
          description: `New declaration ${name} added.`,
        });
        requiresReVerification = true;
      }
    }

    const summary = `${items.length} structural changes detected (${
      items.filter((i) => i.changeType === 'signature_modified').length
    } signature, ${items.filter((i) => i.changeType === 'proof_modified').length} proof-only).`;

    return {
      success: true,
      items: Object.freeze(items),
      hasSignatureChanges,
      requiresReVerification,
      summary,
    };
  }
}

export const structuralDiffEngine = new StructuralDiffEngine();
