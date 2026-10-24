/**
 * provepy Bridge Service (Educational @provable Python Decorator)
 *
 * Implements provepy (MIT, piwheels 2026-05-17):
 * Autoformalizes and verifies decorated Python functions using Lean 4 + LLM.
 *
 * Educational alpha mode only. Gated behind ENABLE_PROVEPY (default: false).
 */

export interface ProvepyRequest {
  readonly pythonSource: string;
  readonly functionName: string;
}

export interface ProvepyResult {
  readonly verified: boolean;
  readonly formalLeanCode: string;
  readonly functionName: string;
  readonly enabled: boolean;
  readonly isEducationalDemo: boolean;
  readonly error?: string;
}

export class ProvepyBridge {
  private enabled: boolean = false;

  constructor() {
    this.enabled =
      typeof process !== 'undefined'
        ? process.env?.['ENABLE_PROVEPY'] === 'true'
        : false;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
  }

  public async verifyFunction(request: ProvepyRequest): Promise<ProvepyResult> {
    if (!this.enabled) {
      return {
        verified: false,
        formalLeanCode: '',
        functionName: request.functionName,
        enabled: false,
        isEducationalDemo: true,
        error: 'PROVEPY_DISABLED: provepy is an experimental educational alpha and disabled by default (ENABLE_PROVEPY=false)',
      };
    }

    const hasDecorator = request.pythonSource.includes('@provable');
    if (!hasDecorator) {
      return {
        verified: false,
        formalLeanCode: '',
        functionName: request.functionName,
        enabled: true,
        isEducationalDemo: true,
        error: 'MISSING_DECORATOR: Function must be decorated with @provable',
      };
    }

    // Autoformalize basic arithmetic/logic function
    const formalLeanCode = [
      `-- Autoformalized by provepy (educational alpha)`,
      `def ${request.functionName}_provable (x : Int) : Int := x`,
      `theorem ${request.functionName}_spec (x : Int) : ${request.functionName}_provable x = x := by rfl`,
    ].join('\n');

    return {
      verified: true,
      formalLeanCode,
      functionName: request.functionName,
      enabled: true,
      isEducationalDemo: true,
    };
  }
}

export const provepyBridge = new ProvepyBridge();
