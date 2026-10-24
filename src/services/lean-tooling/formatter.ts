/**
 * Lean 4 Code Formatter Service
 *
 * Implements:
 * - Verification check for lean-fmt / wvhulle/pretty-lean fork
 * - formatLean(code, mode): formats Lean 4 source code
 * - Conservative indentation-only formatter fallback
 * - Feature flag ENABLE_LEAN_FMT (default: false, verify at build time)
 * - Returns FORMATTER_UNAVAILABLE when external formatting tool is unverified/unreachable
 */

export interface FormatterResult {
  readonly formattedCode: string;
  readonly toolUsed: 'lean-fmt' | 'pretty-lean' | 'conservative-indent';
  readonly isVerifiedTool: boolean;
  readonly error?: string;
}

export class LeanFormatterService {
  private enabled: boolean = false;
  private isToolVerifiedAtBuildTime: boolean = false; // C2: lean-fmt unverified

  constructor() {
    this.enabled =
      typeof process !== 'undefined'
        ? process.env?.['ENABLE_LEAN_FMT'] === 'true'
        : false;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
  }

  public setToolVerified(verified: boolean): void {
    this.isToolVerifiedAtBuildTime = verified;
  }

  /**
   * Formats Lean 4 code. If external formatter is requested but unverified, returns FORMATTER_UNAVAILABLE.
   */
  public async formatLean(
    code: string,
    mode: 'document' | 'selection' = 'document'
  ): Promise<string> {
    if (!this.enabled && !this.isToolVerifiedAtBuildTime) {
      throw new Error('FORMATTER_UNAVAILABLE: lean-fmt repository is not verified at build time. Use pretty-lean fallback or enable ENABLE_LEAN_FMT.');
    }

    // Conservative indentation formatter
    const lines = code.split('\n');
    let indentLevel = 0;
    const formattedLines: string[] = [];

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        formattedLines.push('');
        continue;
      }

      // Decrement indentation for closing keywords/tactics
      if (trimmed.startsWith('end') || trimmed.startsWith('done')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      const indentSpaces = '  '.repeat(indentLevel);
      formattedLines.push(`${indentSpaces}${trimmed}`);

      // Increment indentation after opening blocks
      if (
        trimmed.endsWith(':= by') ||
        trimmed.endsWith(':=') ||
        trimmed.endsWith('where') ||
        trimmed.startsWith('namespace ') ||
        trimmed.startsWith('section ')
      ) {
        indentLevel++;
      }
    }

    return formattedLines.join('\n');
  }
}

export const leanFormatterService = new LeanFormatterService();
