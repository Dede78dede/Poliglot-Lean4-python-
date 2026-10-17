import type { ExecutionRequest, ExecutionResult } from '../types/execution';
import { ExecutionError } from '../types/execution';
import { LeanExecuteResponseSchema } from '../types/contracts';

const API_BASE = '/api/v1';

export async function executeLean(request: ExecutionRequest): Promise<ExecutionResult> {
  const timeoutMs = request.timeoutMs;
  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs + 3_000);

  try {
    const response = await fetch(`${API_BASE}/lean/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        code: request.code,
        timeoutMs,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutTimer);

    const isSimulatedHeader = response.headers.get('X-Kimina-Simulated') === 'true';

    if (!response.ok) {
      if (response.status === 408) {
        throw new ExecutionError(
          'LEAN_TIMEOUT',
          `Lean 4 verification exceeded timeout limit of ${timeoutMs}ms.`,
        );
      }

      const errorBody = await response.text();
      let detailMessage = errorBody;
      try {
        const errorJson = JSON.parse(errorBody);
        detailMessage = errorJson.detail || errorJson.title || errorBody;
      } catch {
        // use raw text
      }

      throw new ExecutionError(
        'LEAN_EXECUTION_FAILED',
        `Lean backend returned error (HTTP ${response.status}): ${detailMessage}`,
      );
    }

    const json = await response.json();
    const parsed = LeanExecuteResponseSchema.safeParse(json);

    if (!parsed.success) {
      throw new ExecutionError(
        'LEAN_EXECUTION_FAILED',
        `Backend response failed schema contract validation: ${parsed.error.message}`,
      );
    }

    const data = parsed.data;
    const isSimulated = Boolean(data.simulated || isSimulatedHeader);

    return {
      status: data.exitCode === 0 ? 'success' : 'error',
      stdout: data.stdout,
      stderr: data.stderr,
      exitCode: data.exitCode,
      durationMs: data.durationMs,
      simulated: isSimulated,
      verified: Boolean(data.verified && !isSimulated),
    };
  } catch (err: unknown) {
    clearTimeout(timeoutTimer);

    if (err instanceof ExecutionError) {
      throw err;
    }

    if (err instanceof Error && err.name === 'AbortError') {
      throw new ExecutionError(
        'LEAN_TIMEOUT',
        `Lean execution timed out after ${timeoutMs}ms (network abort).`,
      );
    }

    throw new ExecutionError(
      'LEAN_BACKEND_UNREACHABLE',
      `Cannot connect to Lean execution backend at ${API_BASE}/lean/execute: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
