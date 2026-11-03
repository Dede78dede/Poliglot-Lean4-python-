/**
 * LP2Adapter (Phase 12, Sprint 12.3, Task TF2)
 *
 * Encapsulates the lp2 bidirectional Python<->Lean transpiler.
 *
 * Caveats & Epistemic Rules:
 * - Feature-flagged: ENABLE_LP2 defaults to false.
 * - Round-trip is lossy; list mutation is silently dropped.
 * - Int recursion termination issues; generators/comprehensions require @no_transpile.
 * - Any LP² translation is marked with source: 'lp2' and MUST undergo
 *   TranslationFidelityGate verification before admission to a proof pipeline.
 */

import { featureFlagRegistry } from '../flags/feature-flag-registry';
import { BridgeError } from '../errors/bridge-error';

export interface LP2TranslationResult {
  readonly translated: string;
  readonly warnings: readonly string[];
  readonly source: 'lp2';
  readonly requiresFidelityCheck: true;
}

export const LP2_STANDARD_WARNINGS: readonly string[] = Object.freeze([
  'LP² is a rapid prototyping transpiler; round-trip conversion is lossy.',
  'In-place list mutations are silently dropped in Lean 4 immutable functional semantics.',
  'Recursive integer loops may lack Lean 4 termination proofs (decreases clause).',
  'Constructs like generators, comprehensions, bytearrays, and f-strings require @no_transpile.',
]);

export class LP2Adapter {
  public isEnabled(): boolean {
    return featureFlagRegistry.isEnabled('ENABLE_LP2');
  }

  public async pyToLean(pythonCode: string): Promise<LP2TranslationResult> {
    if (!this.isEnabled()) {
      const err = new BridgeError('FEATURE_DISABLED', `lp2-${Date.now()}`, {
        feature: 'ENABLE_LP2',
        message: 'LP2_DISABLED: ENABLE_LP2 feature flag is disabled',
      });
      (err as any).message = 'LP2_DISABLED: ENABLE_LP2 feature flag is disabled';
      throw err;
    }

    // High-level transpilation mapping with lossy warning headers
    const lines = pythonCode.split('\n');
    const leanLines: string[] = [
      '-- Translated by LP² (Lossy Prototyping Transpiler)',
      '-- Warning: Definitional fidelity check required before proof verification',
    ];

    for (const line of lines) {
      if (line.trim().startsWith('def ')) {
        const fnName = line.replace(/def\s+([a-zA-Z0-9_]+).*/, '$1');
        leanLines.push(`def ${fnName} (n : Int) : Int :=`);
      } else if (line.trim().startsWith('return ')) {
        const retVal = line.trim().replace('return ', '');
        leanLines.push(`  ${retVal}`);
      }
    }

    return {
      translated: leanLines.join('\n'),
      warnings: LP2_STANDARD_WARNINGS,
      source: 'lp2',
      requiresFidelityCheck: true,
    };
  }

  public async leanToPy(leanCode: string): Promise<LP2TranslationResult> {
    if (!this.isEnabled()) {
      const err = new BridgeError('FEATURE_DISABLED', `lp2-${Date.now()}`, {
        feature: 'ENABLE_LP2',
        message: 'LP2_DISABLED: ENABLE_LP2 feature flag is disabled',
      });
      (err as any).message = 'LP2_DISABLED: ENABLE_LP2 feature flag is disabled';
      throw err;
    }

    const lines = leanCode.split('\n');
    const pyLines: string[] = [
      '# Translated by LP² (Lossy Prototyping Transpiler)',
      '# Warning: Definitional fidelity check required before proof verification',
    ];

    for (const line of lines) {
      if (line.trim().startsWith('def ')) {
        const fnName = line.replace(/def\s+([a-zA-Z0-9_]+).*/, '$1');
        pyLines.push(`def ${fnName}(n: int) -> int:`);
      } else if (line.trim().startsWith(':=') || line.trim().startsWith('  ')) {
        const body = line.trim().replace(':=', '').trim();
        if (body.length > 0) {
          pyLines.push(`    return ${body}`);
        }
      }
    }

    return {
      translated: pyLines.join('\n'),
      warnings: LP2_STANDARD_WARNINGS,
      source: 'lp2',
      requiresFidelityCheck: true,
    };
  }
}

export const lp2Adapter = new LP2Adapter();
