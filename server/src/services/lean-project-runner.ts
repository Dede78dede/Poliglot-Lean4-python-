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
import { assertPathContained } from './verification/server-provenance';
import {
  attachServerProvenance,
  CANONICAL_VERIFICATION_PROTOCOL,
  STANDARD_AXIOM_ALLOWLIST,
  type AxiomAuditReport,
  type EngineEvidence,
  type VerificationRequestV1,
} from './verification/hybrid-adjudicator';

const MAX_PROJECT_FILES = 500;
const MAX_SINGLE_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

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

export class LakeProcessExecutionError extends Error {
  readonly exitCode: number;
  readonly stderr: string;

  constructor(message: string, exitCode: number, stderr: string) {
    super(message);
    this.name = 'LakeProcessExecutionError';
    this.exitCode = exitCode;
    this.stderr = stderr;
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
  readonly memoryBytes?: number;
  readonly toolchain?: string;
  readonly imageDigest?: string;
  readonly axioms?: readonly string[];
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
    if (files.length > MAX_PROJECT_FILES) {
      throw new Error(`PROJECT_QUOTA_EXCEEDED: File count ${files.length} exceeds limit of ${MAX_PROJECT_FILES}.`);
    }

    const sessionDir = sessionManager.getSessionPath(sessionId);
    await sessionManager.createOrTouchSession(sessionId);

    let batchBytes = 0;
    for (const f of files) {
      const byteLen = Buffer.byteLength(f.content, 'utf-8');
      if (byteLen > MAX_SINGLE_FILE_BYTES) {
        throw new Error(`PROJECT_QUOTA_EXCEEDED: File "${f.path}" exceeds 5 MB limit.`);
      }
      batchBytes += byteLen;
    }

    const withinQuota = await sessionManager.checkQuota(sessionId, batchBytes);
    if (!withinQuota) {
      throw new Error('PROJECT_QUOTA_EXCEEDED: Session or aggregate host storage quota exceeded.');
    }

    for (const f of files) {
      const safeFullPath = assertPathContained(sessionDir, f.path);
      await fs.mkdir(path.dirname(safeFullPath), { recursive: true });
      await fs.writeFile(safeFullPath, f.content, 'utf-8');
    }

    if (files.length > 0) {
      sessionManager.updateSessionBytes(sessionId, batchBytes, files.length);
    }

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

  async checkReady(): Promise<boolean> {
    if (this.config.mode === 'simulator') return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(2000, this.config.timeoutMs));
    try {
      const headers: Record<string, string> = {};
      if (this.config.authToken) {
        headers['Authorization'] = `Bearer ${this.config.authToken}`;
      }
      const res = await fetch(`${this.config.runnerUrl}/readyz`, { headers, signal: controller.signal });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  toEngineEvidence(req: VerificationRequestV1, result: LeanBuildResultData): EngineEvidence {
    const output = `${result.stdout}\n${result.stderr}`;
    const hasSorry = /uses 'sorry'|sorryAx/i.test(output);
    const explicitAxioms = result.axioms;
    let observedAxioms: string[] = [];
    let extracted = false;

    if (Array.isArray(explicitAxioms)) {
      observedAxioms = explicitAxioms.map((a) => a.trim()).filter(Boolean);
      extracted = true;
    } else {
      const match = output.match(/depends on axioms:\s*\[([^\]]*)\]/i);
      if (match) {
        observedAxioms = match[1].split(',').map((s) => s.trim()).filter(Boolean);
        extracted = true;
      } else if (/does not depend on any axioms/i.test(output)) {
        observedAxioms = [];
        extracted = true;
      }
    }

    const violations = observedAxioms.filter((ax) => !STANDARD_AXIOM_ALLOWLIST.includes(ax));

    const axiomAudit: AxiomAuditReport = result.fallback
      ? { status: 'not_run', observedAxioms: [], allowedAxioms: [...STANDARD_AXIOM_ALLOWLIST] }
      : !extracted
        ? {
            status: 'not_run',
            observedAxioms: [],
            allowedAxioms: [...STANDARD_AXIOM_ALLOWLIST],
            violations: ['Axiom audit telemetry not reported by Lake build output.'],
          }
        : violations.length > 0 || hasSorry
          ? {
              status: 'failed',
              observedAxioms,
              allowedAxioms: [...STANDARD_AXIOM_ALLOWLIST],
              violations: [...violations, ...(hasSorry ? ['sorryAx'] : [])],
            }
          : {
              status: 'passed',
              observedAxioms,
              allowedAxioms: [...STANDARD_AXIOM_ALLOWLIST],
            };

    const diagnostics = result.stderr
      ? [{ severity: 'error' as const, message: result.stderr }]
      : [];

    if (result.fallback) {
      return {
        engine: 'simulator',
        contractVersion: CANONICAL_VERIFICATION_PROTOCOL,
        outcome: 'simulated',
        requestId: req.requestId,
        sourceDigest: req.sourceDigest,
        contextDigest: req.contextDigest,
        manifestDigest: req.environment.manifestDigest,
        targetIds: req.targetIds,
        toolchain: result.toolchain ?? req.environment.leanToolchain,
        durationMs: result.durationMs,
        exitCode: result.exitCode,
        diagnostics,
        axiomAudit,
        error: result.fallbackNotice ?? 'Lake runner fell back to parser; real kernel execution unavailable.',
      };
    }

    const passed =
      result.exitCode === 0 &&
      result.verified &&
      !hasSorry &&
      axiomAudit.status === 'passed';

    const outcome = passed
      ? 'accepted'
      : result.exitCode === 0 && !result.verified
        ? 'inconclusive'
        : 'rejected';

    return attachServerProvenance({
      engine: 'lake',
      contractVersion: CANONICAL_VERIFICATION_PROTOCOL,
      outcome,
      requestId: req.requestId,
      sourceDigest: req.sourceDigest,
      contextDigest: req.contextDigest,
      manifestDigest: req.environment.manifestDigest,
      imageDigest: result.imageDigest ?? req.environment.lakeRunnerImageDigest ?? 'lake-runner-live',
      targetIds: req.targetIds,
      toolchain: result.toolchain ?? req.environment.leanToolchain,
      durationMs: result.durationMs,
      exitCode: result.exitCode,
      diagnostics,
      axiomAudit,
      error: passed ? null : result.stderr || 'Lake build did not pass formal verification and axiom audit.',
    });
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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    try {
      const response = await fetch(`${this.config.runnerUrl}/build`, {
        method: 'POST',
        headers,
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
        durationMs?: number;
        memoryBytes?: number;
        toolchain?: string;
        toolchains?: string[];
        axioms?: string[];
        imageDigest?: string;
      };

      const durationMs = json.durationMs ?? Math.round(performance.now() - startTime);
      const stdout = json.stdout ?? '';
      const stderr = json.stderr ?? '';

      if (typeof json.exitCode !== 'number') {
        throw new LakeProcessExecutionError(
          'Lake runner upstream response did not contain an explicit integer exitCode.',
          1,
          stderr || 'Missing exitCode from Lake runner process.',
        );
      }
      const exitCode = json.exitCode;

      const toolchainFile = files.find(
        (f) => f.path === 'lean-toolchain' || f.path.endsWith('/lean-toolchain'),
      );
      let toolchainMismatch: { required: string; current: string } | undefined;
      if (toolchainFile) {
        const required = toolchainFile.content.trim().replace(/^leanprover\/lean4:/, '');
        const runnerToolchains: string[] = Array.isArray(json.toolchains) ? json.toolchains : [];
        const current =
          (json.toolchain as string) ||
          (runnerToolchains.includes(required) ? required : DEFAULT_LEAN_TOOLCHAIN);
        const isSupported =
          runnerToolchains.length > 0
            ? runnerToolchains.includes(required)
            : (AVAILABLE_LEAN_TOOLCHAINS as readonly string[]).includes(required);
        if (!isSupported) {
          toolchainMismatch = { required, current };
        }
      }

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
        memoryBytes: json.memoryBytes,
        toolchain: json.toolchain,
        imageDigest: json.imageDigest,
        axioms: json.axioms,
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
      verified: false,
      fallback: true,
      fallbackNotice: parseRes.notice,
    };
  }

  getConfig(): LeanRunnerConfig {
    return this.config;
  }
}
