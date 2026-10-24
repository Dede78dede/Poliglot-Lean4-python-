/**
 * Autoformalization Router (Phase 10.9.5, Task S1)
 *
 * Unifies PastaLean (Python -> Lean), LeanFlow (LaTeX -> Lean), and Mathesis (NL -> Lean)
 * under a typed Strategy pattern with fallback routing and ExternalStoreBase reactivity.
 * Throws BridgeError(ROUTER_NO_PROVIDER_AVAILABLE) when no active provider is reachable.
 */

import { ExternalStoreBase } from '../stores/external-store-base';
import { featureFlagRegistry } from '../flags/feature-flag-registry';
import { BridgeError } from '../errors/bridge-error';
import { mathesisProvider } from './mathesis-provider';
import { pastaLeanBridge } from '../../../server/src/services/pastalean/pastalean-bridge';
import { leanFlowBridge } from '../../../server/src/services/leanflow/leanflow-bridge';
import { createLogger, StructuredLogger } from '../logging/logger';

const logger = createLogger('autoformalization-router');

export interface AutoformalizationRequest {
  readonly inputType: 'python' | 'latex' | 'natural_language';
  readonly sourceCode: string;
  readonly projectName?: string;
  readonly targetToolchain?: string;
  readonly correlationId?: string;
}

export interface AutoformalizationResult {
  readonly providerUsed: 'pastalean' | 'leanflow' | 'mathesis' | 'fallback';
  readonly generatedLeanCode: string;
  readonly declarations: readonly string[];
  readonly executionDurationMs: number;
}

export interface AutoformalizationProviderStrategy {
  readonly name: 'pastalean' | 'leanflow' | 'mathesis';
  readonly isAvailable: () => boolean;
  readonly canHandle: (inputType: 'python' | 'latex' | 'natural_language') => boolean;
  readonly formalize: (request: AutoformalizationRequest) => Promise<AutoformalizationResult>;
}

export interface AutoformalizationRouterSnapshot {
  readonly registeredProviders: readonly {
    readonly name: string;
    readonly available: boolean;
  }[];
  readonly defaultProvider: string;
  readonly totalFormalizations: number;
}

export class AutoformalizationRouter extends ExternalStoreBase<AutoformalizationRouterSnapshot> {
  private providers: Map<string, AutoformalizationProviderStrategy> = new Map();
  private formalizationCounter = 0;

  constructor() {
    super({ id: 'autoformalizationRouter', multiTabSync: true });
    this.registerDefaultProviders();
  }

  private registerDefaultProviders(): void {
    // 1. PastaLean Provider (Python AST -> Lean 4)
    this.registerProvider({
      name: 'pastalean',
      isAvailable: () => featureFlagRegistry.isEnabled('ENABLE_PASTALEAN'),
      canHandle: (type) => type === 'python',
      formalize: async (req) => {
        const start = Date.now();
        const res = await pastaLeanBridge.generateTwoFileBundle({
          pythonCode: req.sourceCode,
          target: 'command',
        });
        return {
          providerUsed: 'pastalean',
          generatedLeanCode: res.generatedLeanCode,
          declarations: ['generated_lean_program'],
          executionDurationMs: Date.now() - start,
        };
      },
    });

    // 2. LeanFlow Provider (LaTeX -> Lean 4)
    this.registerProvider({
      name: 'leanflow',
      isAvailable: () => featureFlagRegistry.isEnabled('ENABLE_LEANFLOW'),
      canHandle: (type) => type === 'latex',
      formalize: async (req) => {
        const start = Date.now();
        const res = await leanFlowBridge.formalize({
          sourcePath: `docs/${req.projectName ?? 'paper'}.tex`,
          projectName: req.projectName ?? 'paper',
          provider: 'lemex',
          latexSource: req.sourceCode,
        });
        return {
          providerUsed: 'leanflow',
          generatedLeanCode: res.declarations.map((d) => d.leanStatement).join('\n\n'),
          declarations: res.declarations.map((d) => d.leanName),
          executionDurationMs: Date.now() - start,
        };
      },
    });

    // 3. Mathesis Provider (Natural Language -> Lean 4)
    this.registerProvider({
      name: 'mathesis',
      isAvailable: () => mathesisProvider.isAvailable(),
      canHandle: (type) => type === 'natural_language',
      formalize: async (req) => {
        const res = await mathesisProvider.formalize({
          naturalLanguagePrompt: req.sourceCode,
          targetToolchain: req.targetToolchain,
          correlationId: req.correlationId,
        });
        return {
          providerUsed: 'mathesis',
          generatedLeanCode: res.leanCode,
          declarations: res.declarations,
          executionDurationMs: res.executionDurationMs,
        };
      },
    });
  }

  public registerProvider(provider: AutoformalizationProviderStrategy): void {
    this.providers.set(provider.name, provider);
    this.notify();
  }

  public getProvider(name: string): AutoformalizationProviderStrategy | undefined {
    return this.providers.get(name);
  }

  public listProviders(): readonly { readonly name: string; readonly available: boolean }[] {
    return Array.from(this.providers.values()).map((p) => ({
      name: p.name,
      available: p.isAvailable(),
    }));
  }

  /**
   * Routes an autoformalization request to the optimal available strategy.
   * If the preferred provider is unavailable or disabled, evaluates fallbacks.
   * Throws BridgeError(ROUTER_NO_PROVIDER_AVAILABLE) if all candidates are unreachable.
   */
  public async routeFormalization(request: AutoformalizationRequest): Promise<AutoformalizationResult> {
    const correlationId = request.correlationId ?? StructuredLogger.generateCorrelationId();
    logger.info('Routing autoformalization request', correlationId, { inputType: request.inputType });

    // Filter providers that can handle the input type and are currently available
    const eligibleProviders = Array.from(this.providers.values()).filter(
      (p) => p.canHandle(request.inputType) && p.isAvailable()
    );

    if (eligibleProviders.length === 0) {
      logger.error('No autoformalization provider available for requested input type', correlationId, {
        inputType: request.inputType,
      });
      throw new BridgeError('ROUTER_NO_PROVIDER_AVAILABLE', correlationId, {
        inputType: request.inputType,
        registeredProviders: Array.from(this.providers.keys()),
        availableProviders: Array.from(this.providers.values())
          .filter((p) => p.isAvailable())
          .map((p) => p.name),
      });
    }

    const primary = eligibleProviders[0]!;
    try {
      const result = await primary.formalize(request);
      this.formalizationCounter++;
      this.notify();
      return result;
    } catch (err) {
      logger.warn(`Primary provider ${primary.name} failed, checking fallbacks`, correlationId);
      // If primary failed and there is a secondary candidate
      if (eligibleProviders.length > 1) {
        const secondary = eligibleProviders[1]!;
        const fallbackResult = await secondary.formalize(request);
        this.formalizationCounter++;
        this.notify();
        return fallbackResult;
      }
      throw err;
    }
  }

  protected computeSnapshot(): AutoformalizationRouterSnapshot {
    const list = this.listProviders();
    return Object.freeze({
      registeredProviders: Object.freeze(list),
      defaultProvider: list.find((p) => p.available)?.name ?? 'none',
      totalFormalizations: this.formalizationCounter,
    });
  }
}

export const autoformalizationRouter = new AutoformalizationRouter();
