import { ExternalStoreBase } from '../stores/external-store-base';
import type { ExecutionState, ExecutionResult, ExecutionError } from '../../types/execution';
import type { SupportedLanguage } from '../../types/language';

export class ExecutionStore extends ExternalStoreBase<ExecutionState> {
  private currentState: ExecutionState = { kind: 'idle' };

  constructor() {
    super({
      id: 'executionStore',
      multiTabSync: false,
      persistToIndexedDb: false,
    });
  }

  protected computeSnapshot(): ExecutionState {
    return this.currentState;
  }

  public startExecution(language: SupportedLanguage | 'lean'): void {
    const canonicalLang: SupportedLanguage = language === 'lean' ? 'lean4' : language;
    this.currentState = {
      kind: 'running',
      startedAt: Date.now(),
      language: canonicalLang,
    };
    this.notify();
  }

  public completeExecution(result: ExecutionResult, language: SupportedLanguage | 'lean'): void {
    const canonicalLang: SupportedLanguage = language === 'lean' ? 'lean4' : language;
    this.currentState = {
      kind: 'completed',
      result,
      language: canonicalLang,
    };
    this.notify();
  }

  public failExecution(error: ExecutionError, language: SupportedLanguage | 'lean'): void {
    const canonicalLang: SupportedLanguage = language === 'lean' ? 'lean4' : language;
    this.currentState = {
      kind: 'failed',
      error,
      language: canonicalLang,
    };
    this.notify();
  }

  public reset(): void {
    this.currentState = { kind: 'idle' };
    this.notify();
  }
}

export const executionStore = new ExecutionStore();
