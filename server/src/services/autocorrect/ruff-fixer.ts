import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const execAsync = promisify(exec);

export interface RuffFixOptions {
  readonly allowUnsafe?: boolean;
  readonly rules?: readonly string[];
}

export interface RuffFixResult {
  readonly originalCode: string;
  readonly correctedCode: string;
  readonly appliedRules: readonly string[];
  readonly unsafeApplied: boolean;
  readonly durationMs: number;
  readonly engine: 'native-ruff' | 'deterministic-fallback';
}

import {
  runDeterministicPythonFixer,
  type DeterministicFixOptions,
  type DeterministicFixResult,
} from '../../../../src/services/autocorrect/python-deterministic-fixer';

export { runDeterministicPythonFixer, type DeterministicFixOptions, type DeterministicFixResult };

/**
 * Primary L1 Python Fixer: attempts native Ruff CLI; falls back to deterministic rule engine.
 */
export async function fixPythonCode(
  code: string,
  options: RuffFixOptions = {},
): Promise<RuffFixResult> {
  const t0 = performance.now();

  // 1. Try native Ruff CLI if installed
  try {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ruff-fix-'));
    const tmpFile = path.join(tmpDir, 'target.py');
    await fs.writeFile(tmpFile, code, 'utf-8');

    const unsafeFlag = options.allowUnsafe ? '--unsafe-fixes' : '';
    const cmd = `ruff check --fix ${unsafeFlag} ${tmpFile}`;

    const { stdout, stderr } = await execAsync(cmd, { timeout: 4000 });
    const correctedCode = await fs.readFile(tmpFile, 'utf-8');
    await fs.rm(tmpDir, { recursive: true, force: true });

    const appliedRules: string[] = [];
    const ruleMatches = `${stdout}\n${stderr}`.match(/\b([A-Z][0-9]{3,4})\b/g);
    if (ruleMatches) {
      for (const r of ruleMatches) {
        if (!appliedRules.includes(r)) appliedRules.push(r);
      }
    }

    const durationMs = Math.round(performance.now() - t0);
    return {
      originalCode: code,
      correctedCode,
      appliedRules,
      unsafeApplied: Boolean(options.allowUnsafe),
      durationMs,
      engine: 'native-ruff',
    };
  } catch {
    // 2. Fall back to deterministic rule engine
    const fallbackResult = runDeterministicPythonFixer(code, options);
    const durationMs = Math.round(performance.now() - t0);
    return {
      originalCode: code,
      correctedCode: fallbackResult.correctedCode,
      appliedRules: fallbackResult.appliedRules,
      unsafeApplied: fallbackResult.unsafeApplied,
      durationMs,
      engine: 'deterministic-fallback',
    };
  }
}
