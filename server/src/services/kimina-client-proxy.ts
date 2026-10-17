import { z } from 'zod';
import type { KiminaConfig } from '../config/kimina-config';
import { KiminaSimulator } from './kimina-simulator';
import { evaluateFormalVerification } from './verification-formula';

const KiminaVerifyResponseSchema = z.object({
  results: z.array(
    z.object({
      custom_id: z.string(),
      error: z.string().nullable().optional(),
      response: z
        .object({
          messages: z
            .array(
              z.object({
                severity: z.string(),
                data: z.string(),
              }),
            )
            .optional(),
        })
        .optional(),
    }),
  ),
});

export interface LeanServerResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
  readonly durationMs: number;
  readonly verified: boolean;
  readonly simulated: boolean;
}

export class KiminaTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Lean 4 verification exceeded timeout limit of ${timeoutMs}ms.`);
    this.name = 'KiminaTimeoutError';
  }
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
    const startTime = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          codes: [{ custom_id: crypto.randomUUID(), proof: code }],
          infotree_type: 'original',
          timeout: Math.ceil(timeoutMs / 1000),
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Kimina upstream error HTTP ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      const parsed = KiminaVerifyResponseSchema.safeParse(json);

      if (!parsed.success) {
        throw new Error(`Invalid response format received from Kimina server: ${parsed.error.message}`);
      }

      const durationMs = Math.round(performance.now() - startTime);
      const firstResult = parsed.data.results[0];

      if (!firstResult) {
        return {
          stdout: '',
          stderr: 'No verification result returned from Kimina.',
          exitCode: 1,
          durationMs,
          verified: false,
          simulated: false,
        };
      }

      const messages = firstResult.response?.messages ?? [];
      const stdout = messages.map((m) => m.data).join('\n');
      const stderr = firstResult.error ?? '';
      const hasErrorSeverity = messages.some((m) => m.severity.toLowerCase() === 'error');
      const exitCode = firstResult.error || hasErrorSeverity ? 1 : 0;

      // Exact mathematical verified criteria:
      // verified ⟺ exitCode === 0 ∧ contains_proof_obligation ∧ ¬hasSorry ∧ ¬hasErrorSeverity ∧ ¬simulated
      const evalResult = evaluateFormalVerification({
        codeOrFiles: code,
        stdout,
        stderr,
        exitCode,
        simulated: false,
        hasErrorSeverity,
      });

      return {
        stdout,
        stderr,
        exitCode,
        durationMs,
        verified: evalResult.verified,
        simulated: false,
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
