import type {
  InteractionRequest,
  InteractionStep,
  InteractionStepResult,
  PipelineRunResult,
} from '../../types/interaction';
import type { UsePyodideReturn } from '../../hooks/usePyodide';
import { IndexedDBSessionDataStore } from './session-data-store';

export class PipelineOrchestrator {
  private readonly pyodide: UsePyodideReturn;
  private readonly store: IndexedDBSessionDataStore;
  private readonly sessionId: string;

  constructor(pyodide: UsePyodideReturn, sessionId = crypto.randomUUID()) {
    this.pyodide = pyodide;
    this.sessionId = sessionId;
    this.store = new IndexedDBSessionDataStore(sessionId);
  }

  async run(
    request: InteractionRequest,
    onStepUpdate?: (stepResult: InteractionStepResult) => void,
  ): Promise<PipelineRunResult> {
    const startTime = performance.now();
    const results: InteractionStepResult[] = [];
    let shouldAbort = false;

    // Load initial data if provided
    if (request.initialData) {
      for (const [k, v] of Object.entries(request.initialData)) {
        await this.store.set(k, v);
      }
    }

    for (const step of request.pipeline) {
      if (shouldAbort) {
        break;
      }

      let stepResult: InteractionStepResult;

      try {
        if (step.language === 'python') {
          stepResult = await this.executePythonStep(step);
        } else {
          stepResult = await this.executeLeanStep(step);
        }
      } catch (err: unknown) {
        if (step.language === 'python') {
          stepResult = {
            step: step.step,
            language: 'python',
            status: 'error',
            stdout: '',
            stderr: err instanceof Error ? err.message : String(err),
            durationMs: 0,
            executedIn: 'client',
            error: String(err),
          };
        } else {
          stepResult = {
            step: step.step,
            language: 'lean4',
            status: 'error',
            stdout: '',
            stderr: err instanceof Error ? err.message : String(err),
            durationMs: 0,
            verified: false,
            simulated: false,
            executedIn: 'server',
            error: String(err),
          };
        }
      }

      results.push(stepResult);
      onStepUpdate?.(stepResult);

      // Policy enforcement
      const isFailed = stepResult.status === 'error';
      const isUnverified = stepResult.language === 'lean4' && !stepResult.verified;

      if (request.executionPolicy === 'fail-fast' && (isFailed || isUnverified)) {
        shouldAbort = true;
      } else if (request.executionPolicy === 'require-verified' && isUnverified) {
        shouldAbort = true;
      }
    }

    const totalDurationMs = Math.round(performance.now() - startTime);
    const allSuccessful =
      results.length === request.pipeline.length && results.every((r) => r.status === 'success');

    // Formal definition:
    // pipelineVerified ⟺ all steps succeeded ∧ has at least one lean4 step ∧ all lean4 steps are verified
    const leanSteps = results.filter((r): r is Extract<InteractionStepResult, { language: 'lean4' }> => r.language === 'lean4');
    const pipelineVerified =
      allSuccessful &&
      leanSteps.length > 0 &&
      leanSteps.every((r) => r.verified === true && !r.simulated);

    return {
      sessionId: this.sessionId,
      policy: request.executionPolicy,
      steps: results,
      pipelineVerified,
      totalDurationMs,
      success: allSuccessful,
    };
  }

  private async executePythonStep(step: InteractionStep): Promise<InteractionStepResult> {
    const start = performance.now();

    // Read input files from store and generate Python bindings
    let preamble = '';
    if (step.inputFiles && step.inputFiles.length > 0) {
      preamble += '# Injected inputs from previous steps\nimport json\n';
      for (const fileKey of step.inputFiles) {
        const data = await this.store.get(fileKey);
        if (data !== undefined) {
          preamble += `${fileKey.replace(/[^a-zA-Z0-9_]/g, '_')} = ${JSON.stringify(data)}\n`;
        }
      }
      preamble += '\n';
    }

    const codeToRun = preamble + step.code;
    const execResult = await this.pyodide.execute(codeToRun, 30_000);
    const durationMs = Math.round(performance.now() - start);

    // Save step output
    const outputData: Record<string, unknown> = {
      stdout: execResult.stdout,
      exitCode: execResult.exitCode,
    };

    if (step.outputFiles && step.outputFiles.length > 0) {
      for (const outKey of step.outputFiles) {
        await this.store.set(outKey, { generatedAt: Date.now(), step: step.step });
      }
    }

    return {
      step: step.step,
      language: 'python',
      status: execResult.exitCode === 0 ? 'success' : 'error',
      stdout: execResult.stdout,
      stderr: execResult.stderr,
      durationMs,
      outputData,
      executedIn: 'client',
    };
  }

  private async executeLeanStep(step: InteractionStep): Promise<InteractionStepResult> {
    const inputDataMap: Record<string, unknown> = {};
    if (step.inputFiles && step.inputFiles.length > 0) {
      for (const fileKey of step.inputFiles) {
        inputDataMap[fileKey] = await this.store.get(fileKey);
      }
    }

    const response = await fetch('/api/v1/interact/lean-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.sessionId,
        step: step.step,
        code: step.code,
        inputData: inputDataMap,
        timeoutMs: 15_000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Lean step ${step.step} failed: ${err}`);
    }

    const data = (await response.json()) as InteractionStepResult;
    return data;
  }

  getSessionStore(): IndexedDBSessionDataStore {
    return this.store;
  }
}
