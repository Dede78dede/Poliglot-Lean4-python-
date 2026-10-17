import fs from 'fs/promises';
import path from 'path';
import {
  type LeanRunnerConfig,
  AVAILABLE_LEAN_TOOLCHAINS,
  DEFAULT_LEAN_TOOLCHAIN,
} from '../config/lean-runner-config';
import { sessionManager } from './session-manager';
import { parseLeanProjectSyntax } from './lean-parser-fallback';
import { evaluateFormalVerification } from './verification-formula';

export class ToolchainNotInstalledError extends Error {
  readonly requested: string;
  readonly available: readonly string[];
  readonly statusCode = 409;

  constructor(requested: string, available: readonly string[]) {
    super(`Toolchain "${requested}" is not installed in the isolated --internal=true runtime.`);
    this.name = 'ToolchainNotInstalledError';
    this.requested = requested;
    this.available = available;
  }
}

export interface LeanProjectFile {
  readonly path: string;
  readonly content: string;
}

export interface LeanBuildResultData {
  readonly status: 'success' | 'error' | 'fallback';
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
  readonly durationMs: number;
  readonly verified: boolean;
  readonly fallback: boolean;
  readonly fallbackNotice?: string;
}

export class LeanProjectRunner {
  private readonly config: LeanRunnerConfig;

  constructor(config: LeanRunnerConfig) {
    this.config = config;
  }

  async build(
    sessionId: string,
    files: readonly LeanProjectFile[],
  ): Promise<LeanBuildResultData> {
    const sessionDir = sessionManager.getSessionPath(sessionId);
    await sessionManager.createOrTouchSession(sessionId);

    // Write all project files to the session directory
    for (const f of files) {
      const fullPath = path.join(sessionDir, f.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, f.content, 'utf-8');
    }

    // Check toolchain version from lean-toolchain if present
    const toolchainFile = files.find(
      (f) => f.path === 'lean-toolchain' || f.path.endsWith('/lean-toolchain'),
    );
    let toolchainNotice: string | undefined;

    if (toolchainFile) {
      const requested = toolchainFile.content.trim().replace(/^leanprover\/lean4:/, '');
      if (requested && !AVAILABLE_LEAN_TOOLCHAINS.includes(requested as any)) {
        throw new ToolchainNotInstalledError(requested, AVAILABLE_LEAN_TOOLCHAINS);
      }
    } else {
      toolchainNotice = `[Diagnostic Notice] No lean-toolchain file detected; defaulting to pre-installed ${DEFAULT_LEAN_TOOLCHAIN}.`;
    }

    let result: LeanBuildResultData;
    switch (this.config.mode) {
      case 'real':
        result = await this.buildReal(sessionId, sessionDir, files);
        break;
      case 'simulator':
        result = this.buildWithParser(files);
        break;
      case 'auto':
        result = await this.buildAuto(sessionId, sessionDir, files);
        break;
    }

    if (toolchainNotice) {
      result = {
        ...result,
        stdout: `${toolchainNotice}\n${result.stdout}`,
      };
    }

    return result;
  }

  private async buildAuto(
    sessionId: string,
    sessionDir: string,
    files: readonly LeanProjectFile[],
  ): Promise<LeanBuildResultData> {
    try {
      return await this.buildReal(sessionId, sessionDir, files);
    } catch (err: unknown) {
      console.warn(
        `[LeanProjectRunner] Lake runner at "${this.config.runnerUrl}" unreachable. Falling back to syntax validator. Notice: Forbidden in production.`,
        err instanceof Error ? err.message : err,
      );
      return this.buildWithParser(files);
    }
  }

  private async buildReal(
    sessionId: string,
    sessionDir: string,
    files: readonly LeanProjectFile[],
  ): Promise<LeanBuildResultData> {
    const startTime = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.runnerUrl}/build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          projectPath: sessionDir,
          target: 'default',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Lake runner HTTP ${response.status}: ${errText}`);
      }

      const json = (await response.json()) as {
        stdout?: string;
        stderr?: string;
        exitCode?: number;
      };

      const durationMs = Math.round(performance.now() - startTime);
      const stdout = json.stdout ?? '';
      const stderr = json.stderr ?? '';
      const exitCode = json.exitCode ?? 0;

      // Check toolchain version from lean-toolchain if present
      const toolchainFile = files.find(
        (f) => f.path === 'lean-toolchain' || f.path.endsWith('/lean-toolchain'),
      );
      let toolchainMismatch: { required: string; current: string } | undefined;
      if (toolchainFile) {
        const required = toolchainFile.content.trim().replace(/^leanprover\/lean4:/, '');
        const current = 'v4.8.0';
        if (required && !required.includes('4.8.0')) {
          toolchainMismatch = { required, current };
        }
      }

      // Rigorous formal verification formula:
      // verified ⟺ exitCode === 0 ∧ contains_proof_obligation ∧ ¬hasSorry ∧ ¬hasError ∧ ¬simulated ∧ ¬toolchainMismatch
      const evalResult = evaluateFormalVerification({
        codeOrFiles: files,
        stdout,
        stderr,
        exitCode,
        simulated: false,
        toolchainMismatch,
      });

      return {
        status: exitCode === 0 ? 'success' : 'error',
        stdout: evalResult.reason ? `${stdout}\n[Formal Verification Notice] ${evalResult.reason}` : stdout,
        stderr,
        exitCode,
        durationMs,
        verified: evalResult.verified,
        fallback: false,
      };
    } catch (err: unknown) {
      clearTimeout(timeout);
      throw err;
    }
  }

  private buildWithParser(files: readonly LeanProjectFile[]): LeanBuildResultData {
    const startTime = performance.now();
    const parseRes = parseLeanProjectSyntax(files);
    const durationMs = Math.round(performance.now() - startTime);

    return {
      status: parseRes.status === 'success' ? 'fallback' : 'error',
      stdout:
        parseRes.status === 'success'
          ? `${parseRes.notice}\nSyntax parsed across ${files.length} project files. No syntax structural errors found.`
          : '',
      stderr: parseRes.errors.join('\n'),
      exitCode: parseRes.status === 'success' ? 0 : 1,
      durationMs,
      verified: false, // ALWAYS false in fallback mode
      fallback: true,
      fallbackNotice: parseRes.notice,
    };
  }

  getConfig(): LeanRunnerConfig {
    return this.config;
  }
}
