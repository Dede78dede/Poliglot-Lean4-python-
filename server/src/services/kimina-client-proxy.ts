import { z } from 'zod';
import type { KiminaConfig } from '../config/kimina-config';
import { KiminaSimulator } from './kimina-simulator';
import { evaluateFormalVerification } from './verification-formula';
import {
  attachServerProvenance,
  CANONICAL_VERIFICATION_PROTOCOL,
  STANDARD_AXIOM_ALLOWLIST,
  type AxiomAuditReport,
  type EngineEvidence,
  type VerificationRequestV1,
} from './verification/hybrid-adjudicator';

export interface KiminaSorry {
  readonly line?: number;
  readonly column?: number;
  readonly goal?: string;
  readonly proof?: string;
}

export interface KiminaDiagnostic {
  readonly severity: 'error' | 'warning' | 'info';
  readonly message: string;
  readonly line?: number;
  readonly column?: number;
}

export interface LeanServerResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
  readonly durationMs: number;
  readonly verified: boolean;
  readonly simulated: boolean;
  readonly correlationId?: string;
  readonly diagnostics?: readonly KiminaDiagnostic[];
  readonly sorries?: readonly KiminaSorry[];
  readonly axioms?: readonly string[];
  readonly imageDigest?: string;
}

export class KiminaTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Lean 4 verification exceeded timeout limit of ${timeoutMs}ms.`);
    this.name = 'KiminaTimeoutError';
  }
}

export class KiminaCorrelationMismatchError extends Error {
  constructor(expectedId: string, receivedId: string) {
    super(`Kimina correlation mismatch: expected request ID "${expectedId}", received "${receivedId}".`);
    this.name = 'KiminaCorrelationMismatchError';
  }
}

// Pinned /api/check response schema
const KiminaCheckItemSchema = z.object({
  id: z.string().optional(),
  custom_id: z.string().optional(),
  error: z.string().nullable().optional(),
  exitCode: z.number().int().optional(),
  axioms: z.array(z.string()).optional(),
  imageDigest: z.string().optional(),
  messages: z
    .array(
      z.object({
        severity: z.string(),
        data: z.string().optional(),
        message: z.string().optional(),
        line: z.number().optional(),
        column: z.number().optional(),
      }),
    )
    .optional(),
  sorries: z
    .array(
      z.object({
        line: z.number().optional(),
        column: z.number().optional(),
        goal: z.string().optional(),
        proof: z.string().optional(),
      }),
    )
    .optional(),
});

// Upstream batch or single responses
const KiminaCheckResponseSchema = z.union([
  KiminaCheckItemSchema,
  z.object({
    results: z.array(
      z.object({
        custom_id: z.string().optional(),
        id: z.string().optional(),
        error: z.string().nullable().optional(),
        axioms: z.array(z.string()).optional(),
        imageDigest: z.string().optional(),
        response: z
          .object({
            axioms: z.array(z.string()).optional(),
            messages: z
              .array(
                z.object({
                  severity: z.string(),
                  data: z.string().optional(),
                  message: z.string().optional(),
                  line: z.number().optional(),
                  column: z.number().optional(),
                }),
              )
              .optional(),
            sorries: z
              .array(
                z.object({
                  line: z.number().optional(),
                  column: z.number().optional(),
                  goal: z.string().optional(),
                  proof: z.string().optional(),
                }),
              )
              .optional(),
          })
          .optional(),
      }),
    ),
  }),
]);

export function parseObservedAxioms(
  explicitAxioms: readonly string[] | undefined,
  messages: readonly KiminaDiagnostic[],
): { observed: string[]; extracted: boolean } {
  if (Array.isArray(explicitAxioms)) {
    return {
      observed: explicitAxioms.map((a) => a.trim()).filter(Boolean),
      extracted: true,
    };
  }

  for (const diag of messages) {
    const match = diag.message.match(/depends on axioms:\s*\[([^\]]*)\]/i);
    if (match) {
      const items = match[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return { observed: items, extracted: true };
    }
    if (/does not depend on any axioms/i.test(diag.message)) {
      return { observed: [], extracted: true };
    }
  }

  return { observed: [], extracted: false };
}

export class KiminaClientProxy {
  private readonly config: KiminaConfig;
  private readonly simulator: KiminaSimulator;

  constructor(config: KiminaConfig) {
    this.config = config;
    this.simulator = new KiminaSimulator();
  }

  async verify(code: string, timeoutMs: number): Promise<LeanServerResult> {
    switch (this.config.mode) {
      case 'real':
        return this.verifyReal(code, timeoutMs);
      case 'simulator':
        console.warn('[KiminaClientProxy] Executing in SIMULATOR mode — not real verification.');
        return this.simulator.verify(code);
      case 'auto':
        return this.verifyAuto(code, timeoutMs);
    }
  }

  async checkReady(): Promise<boolean> {
    if (this.config.mode === 'simulator') return false;
    const baseUrl = 'baseUrl' in this.config ? this.config.baseUrl : 'http://localhost:8000';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(2000, this.config.timeoutMs));
    try {
      const headers: Record<string, string> = {};
      if (this.config.authToken) {
        headers['Authorization'] = `Bearer ${this.config.authToken}`;
      }
      const res = await fetch(`${baseUrl}/health`, { headers, signal: controller.signal });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  toEngineEvidence(req: VerificationRequestV1, result: LeanServerResult): EngineEvidence {
    const diagnostics = (result.diagnostics ?? []).map((d) => ({
      severity: d.severity,
      message: d.message,
      line: d.line,
      column: d.column,
    }));
    const hasSorries = (result.sorries?.length ?? 0) > 0;
    const { observed, extracted } = parseObservedAxioms(result.axioms, diagnostics);
    const violations = observed.filter((ax) => !STANDARD_AXIOM_ALLOWLIST.includes(ax));

    const axiomAudit: AxiomAuditReport = result.simulated
      ? { status: 'not_run', observedAxioms: [], allowedAxioms: [...STANDARD_AXIOM_ALLOWLIST] }
      : !extracted
        ? {
            status: 'not_run',
            observedAxioms: [],
            allowedAxioms: [...STANDARD_AXIOM_ALLOWLIST],
            violations: ['Axiom set not reported by Kimina kernel response.'],
          }
        : violations.length > 0 || hasSorries
          ? {
              status: 'failed',
              observedAxioms: observed,
              allowedAxioms: [...STANDARD_AXIOM_ALLOWLIST],
              violations: [...violations, ...(hasSorries ? ['sorryAx'] : [])],
            }
          : {
              status: 'passed',
              observedAxioms: observed,
              allowedAxioms: [...STANDARD_AXIOM_ALLOWLIST],
            };

    if (result.simulated) {
      return {
        engine: 'simulator',
        contractVersion: CANONICAL_VERIFICATION_PROTOCOL,
        outcome: 'simulated',
        requestId: req.requestId,
        sourceDigest: req.sourceDigest,
        contextDigest: req.contextDigest,
        manifestDigest: req.environment.manifestDigest,
        targetIds: req.targetIds,
        toolchain: req.environment.leanToolchain,
        durationMs: result.durationMs,
        exitCode: result.exitCode,
        diagnostics,
        axiomAudit,
        error: 'Kimina fell back to simulator; real kernel execution unavailable.',
      };
    }

    const passed =
      result.exitCode === 0 &&
      result.verified &&
      !hasSorries &&
      axiomAudit.status === 'passed';

    const outcome = passed
      ? 'accepted'
      : result.exitCode === 0 && !result.verified
        ? 'inconclusive'
        : 'rejected';

    return attachServerProvenance({
      engine: 'kimina',
      contractVersion: CANONICAL_VERIFICATION_PROTOCOL,
      outcome,
      requestId: req.requestId,
      sourceDigest: req.sourceDigest,
      contextDigest: req.contextDigest,
      manifestDigest: req.environment.manifestDigest,
      imageDigest: result.imageDigest ?? req.environment.kiminaImageDigest ?? 'kimina-live',
      targetIds: req.targetIds,
      toolchain: req.environment.leanToolchain,
      durationMs: result.durationMs,
      exitCode: result.exitCode,
      diagnostics,
      axiomAudit,
      error: passed ? null : result.stderr || 'Kimina kernel did not pass verification and axiom audit.',
    });
  }

  private async verifyAuto(code: string, timeoutMs: number): Promise<LeanServerResult> {
    const baseUrl = 'baseUrl' in this.config ? this.config.baseUrl : 'http://localhost:8000';
    try {
      return await this.verifyReal(code, timeoutMs);
    } catch (error) {
      console.warn(
        `[KiminaClientProxy] Kimina Server at ${baseUrl} unreachable. Falling back to local simulator.`,
        error instanceof Error ? error.message : error,
      );
      return this.simulator.verify(code);
    }
  }

  private async verifyReal(code: string, timeoutMs: number): Promise<LeanServerResult> {
    const baseUrl = 'baseUrl' in this.config ? this.config.baseUrl : 'http://localhost:8000';
    const correlationId = crypto.randomUUID();
    const startTime = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    try {
      let response = await fetch(`${baseUrl}/api/check`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: correlationId,
          code,
          timeout: Math.ceil(timeoutMs / 1000),
        }),
        signal: controller.signal,
      });

      if (response.status === 404) {
        response = await fetch(`${baseUrl}/verify`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            codes: [{ custom_id: correlationId, proof: code }],
            infotree_type: 'original',
            timeout: Math.ceil(timeoutMs / 1000),
          }),
          signal: controller.signal,
        });
      }

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Kimina upstream error HTTP ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      const parsed = KiminaCheckResponseSchema.safeParse(json);

      if (!parsed.success) {
        throw new Error(`Invalid response format received from Kimina server: ${parsed.error.message}`);
      }

      const durationMs = Math.round(performance.now() - startTime);

      let itemResult: {
        id?: string;
        custom_id?: string;
        error?: string | null;
        exitCode?: number;
        axioms?: string[];
        imageDigest?: string;
        messages?: Array<{ severity: string; data?: string; message?: string; line?: number; column?: number }>;
        sorries?: Array<{ line?: number; column?: number; goal?: string; proof?: string }>;
      } | undefined;

      if ('results' in parsed.data) {
        const matched =
          parsed.data.results.find((r) => r.custom_id === correlationId || r.id === correlationId) ??
          parsed.data.results[0];

        if (matched) {
          const receivedId = matched.custom_id || matched.id;
          if (receivedId && receivedId !== correlationId && parsed.data.results.length === 1) {
            // Single legacy result without matching id allowed only when singleton
          } else if (receivedId && receivedId !== correlationId) {
            throw new KiminaCorrelationMismatchError(correlationId, receivedId);
          }

          itemResult = {
            id: receivedId,
            error: matched.error,
            axioms: matched.axioms ?? matched.response?.axioms,
            imageDigest: matched.imageDigest,
            messages: matched.response?.messages,
            sorries: matched.response?.sorries,
          };
        }
      } else {
        const receivedId = parsed.data.id || parsed.data.custom_id;
        if (receivedId && receivedId !== correlationId) {
          throw new KiminaCorrelationMismatchError(correlationId, receivedId);
        }
        itemResult = parsed.data;
      }

      if (!itemResult) {
        return {
          stdout: '',
          stderr: 'No verification result returned from Kimina.',
          exitCode: 1,
          durationMs,
          verified: false,
          simulated: false,
          correlationId,
        };
      }

      const rawMessages = itemResult.messages ?? [];
      const diagnostics: KiminaDiagnostic[] = rawMessages.map((m) => ({
        severity: (m.severity.toLowerCase() === 'error'
          ? 'error'
          : m.severity.toLowerCase() === 'warning'
            ? 'warning'
            : 'info') as 'error' | 'warning' | 'info',
        message: m.data ?? m.message ?? '',
        line: m.line,
        column: m.column,
      }));

      const stdout = diagnostics.map((d) => d.message).join('\n');
      const stderr = itemResult.error ?? '';
      const hasErrorSeverity = diagnostics.some((d) => d.severity === 'error');
      const parsedExitCode =
        itemResult.exitCode !== undefined ? itemResult.exitCode : itemResult.error || hasErrorSeverity ? 1 : 0;

      const structuredSorries: KiminaSorry[] = (itemResult.sorries ?? []).map((s) => ({
        line: s.line,
        column: s.column,
        goal: s.goal,
        proof: s.proof,
      }));

      const hasSorryInResult = structuredSorries.length > 0;

      const evalResult = evaluateFormalVerification({
        codeOrFiles: code,
        stdout: hasSorryInResult ? `${stdout}\n[Kimina] declaration uses 'sorry'` : stdout,
        stderr,
        exitCode: parsedExitCode,
        simulated: false,
        hasErrorSeverity,
      });

      return {
        stdout,
        stderr,
        exitCode: parsedExitCode,
        durationMs,
        verified: evalResult.verified && !hasSorryInResult,
        simulated: false,
        correlationId,
        diagnostics,
        sorries: structuredSorries,
        axioms: itemResult.axioms,
        imageDigest: itemResult.imageDigest,
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new KiminaTimeoutError(timeoutMs);
      }
      throw err;
    }
  }

  getConfig(): KiminaConfig {
    return this.config;
  }
}
