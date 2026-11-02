/**
 * Unified Feature Flag Registry (Phase 11.3, Sprint R.1)
 *
 * Consolidates 53 feature flags into a typed registry extending ExternalStoreBase.
 */

import { ExternalStoreBase } from '../stores/external-store-base';

export const FEATURE_FLAGS = {
  // Runtime
  ENABLE_FEMEV:            { default: false, phase: '10.5', category: 'runtime' },
  ENABLE_PASTALEAN:        { default: false, phase: '10.6', category: 'runtime' },
  ENABLE_LUNGO:            { default: false, phase: '10.6', category: 'runtime' },
  ENABLE_LEANFLOW:         { default: false, phase: '10.7', category: 'runtime' },
  ENABLE_LEANSCREEN:       { default: false, phase: '10.7', category: 'runtime' },
  ENABLE_LATEX_INGESTION:  { default: false, phase: '10.7', category: 'runtime' },
  ENABLE_LEANCERT:         { default: false, phase: '10.8', category: 'runtime' },
  // Tooling
  ENABLE_NUMPYSPEC:        { default: false, phase: '10.8', category: 'tooling' },
  ENABLE_NERODIA:          { default: false, phase: '10.8', category: 'tooling' },
  ENABLE_PROVEPY:          { default: false, phase: '10.8', category: 'tooling' },
  ENABLE_LEAN_FMT:         { default: false, phase: '10.8', category: 'tooling' },
  ENABLE_HERON:            { default: false, phase: '10.8', category: 'tooling' },
  ENABLE_VERSO:            { default: false, phase: '10.8', category: 'tooling' },
  // Search
  ENABLE_LEAN_FINDER_V2:   { default: true,  phase: '10.8', category: 'runtime' },
  ENABLE_LEANSEARCH_V2:    { default: true,  phase: '10.8', category: 'runtime' },
  ENABLE_LEANEXPLORE:      { default: true,  phase: '10.8', category: 'runtime' },
  ENABLE_CRAMF:            { default: false, phase: '10.8', category: 'experiment' },
  // Blueprint
  ENABLE_LEAN_ATLAS:       { default: false, phase: '10.8', category: 'tooling' },
  // MCP
  ENABLE_MCP_SERVER:       { default: false, phase: '10.3', category: 'runtime' },
  ENABLE_MCP_HTTP_TRANSPORT: { default: false, phase: '10.3', category: 'runtime' },
  // Infrastructure
  ENABLE_ARCHON_HORIZON:   { default: false, phase: '10.3', category: 'experiment' },
  ENABLE_LEAN_RESERVOIR:   { default: true,  phase: '10.3', category: 'runtime' },
  ENABLE_DUPER:            { default: false, phase: '8',    category: 'experiment' },
  ENABLE_LEANSAGE:         { default: false, phase: '8',    category: 'experiment' },
  ENABLE_PYODIDE_BUILD:    { default: false, phase: '10.1', category: 'experiment' },
  // Selective Integrations (Phase 10.9.5)
  ENABLE_PAPERPROOF:       { default: false, phase: '10.9.5', category: 'runtime' },
  ENABLE_MATHESIS:         { default: false, phase: '10.9.5', category: 'runtime' },
  ENABLE_EDUCATIONAL_MODE: { default: false, phase: '10.9.5', category: 'tooling' },
  // Phase 10.9.7 Additions
  ENABLE_UNIFIED_SEARCH:    { default: true,  phase: '10.9.7', category: 'runtime' },
  ENABLE_LSPEC_CI_TEMPLATE: { default: false, phase: '10.9.7', category: 'tooling' },
  // Phase 10.10 Additions (LLM-Native Access Layer)
  ENABLE_MCP_DISCOVER:      { default: true,  phase: '10.10', category: 'runtime' },
  ENABLE_MCP_STATELESS:     { default: true,  phase: '10.10', category: 'runtime' },
  ENABLE_TOOL_SEARCH:       { default: false, phase: '10.10', category: 'runtime' },
  ENABLE_MCP_GATEWAY:       { default: false, phase: '10.10', category: 'experiment' },
  ENABLE_SKILL_BUNDLES:     { default: false, phase: '10.10', category: 'tooling' },
  ENABLE_DEEPSEEK_KIMI_MINIMAX: { default: false, phase: '10.10', category: 'experiment' },
  // Phase 11.0.1 Additions (IDE Shell, Advanced Editing & File Manager)
  ENABLE_ACTIVITY_BAR:      { default: true,  phase: '11.0.1', category: 'runtime' },
  ENABLE_FILE_MANAGER:      { default: true,  phase: '11.0.1', category: 'runtime' },
  ENABLE_DIFF_VIEWER:       { default: true,  phase: '11.0.1', category: 'runtime' },
  ENABLE_CONTEXT_ENGINE:    { default: false, phase: '11.0.1', category: 'experiment' },
  // Phase 11.0.2 Additions (LLM Chat, Settings UI & Automations)
  ENABLE_LLM_CHAT:            { default: false, phase: '11.0.2', category: 'runtime' },
  ENABLE_SETTINGS_UI:         { default: true,  phase: '11.0.2', category: 'runtime' },
  ENABLE_AGENTIC_AUTOMATION:  { default: false, phase: '11.0.2', category: 'experiment' },
  ENABLE_PROJECT_SCAFFOLDING: { default: true,  phase: '11.0.2', category: 'runtime' },
  // Phase 11.1 Additions (lean-beam Speculative Tactic Execution)
  ENABLE_LEAN_BEAM:           { default: false, phase: '11.1', category: 'experiment' },
  // Phase 11.2 Additions (Workspace Archive, Paperproof Playback, OTel, Mathesis & Yjs CRDT)
  ENABLE_WORKSPACE_ARCHIVE:   { default: true,  phase: '11.2', category: 'runtime' },
  ENABLE_PAPERPROOF_PLAYBACK: { default: false, phase: '11.2', category: 'tooling' },
  ENABLE_OTEL_BROWSER:        { default: false, phase: '11.2', category: 'experiment' },
  ENABLE_OTEL_NODE:           { default: false, phase: '11.2', category: 'experiment' },
  ENABLE_YJS_COLLABORATION:   { default: false, phase: '11.2', category: 'experiment' },
  // Phase 11.3 Additions (React Architecture, Performance & Accessibility)
  ENABLE_REACT_COMPILER:      { default: false, phase: '11.3', category: 'experiment' },
  ENABLE_VIRTUALIZED_LISTS:   { default: true,  phase: '11.3', category: 'runtime' },
  // Phase 12 Additions (Proof Reuse, Proposal Loop, Translation Fidelity & Conditional Integrations)
  ENABLE_PROOF_REUSE:          { default: true,  phase: '12',   category: 'runtime' },
  ENABLE_PROPOSAL_LOOP:        { default: false, phase: '12',   category: 'experiment' },
  ENABLE_TRANSLATION_FIDELITY: { default: true,  phase: '12',   category: 'runtime' },
  ENABLE_LP2:                  { default: false, phase: '12',   category: 'experiment' },
  ENABLE_TREETHINK:            { default: false, phase: '12',   category: 'experiment' },
  // Phase 13 Additions (Unified Result Contracts, Contract Parity, Native Notebook & Config Discovery)
  ENABLE_RESULT_ENVELOPE:      { default: true,  phase: '13',   category: 'runtime' },
  ENABLE_CONTRACT_PARITY:      { default: true,  phase: '13',   category: 'runtime' },
  ENABLE_NOTEBOOK:             { default: true,  phase: '13',   category: 'runtime' },
  ENABLE_CONFIG_MANAGER:       { default: true,  phase: '13',   category: 'runtime' },
  // Policy (different prefix; documented as a policy flag, not an enable flag)
  PIPELINE_STRICT_GOALS:   { default: false, phase: '10.5', category: 'policy' },
} as const satisfies Record<string, { default: boolean; phase: string; category: 'runtime' | 'tooling' | 'experiment' | 'policy' }>;

export type FeatureFlagName = keyof typeof FEATURE_FLAGS;

export interface FeatureFlagItem {
  readonly name: FeatureFlagName;
  readonly enabled: boolean;
  readonly category: 'runtime' | 'tooling' | 'experiment' | 'policy';
  readonly phase: string;
}

export class DefaultFeatureFlagRegistry extends ExternalStoreBase<Readonly<Record<FeatureFlagName, boolean>>> {
  private values: Record<FeatureFlagName, boolean>;

  constructor() {
    super({ id: 'featureFlags', multiTabSync: true });
    this.values = Object.fromEntries(
      Object.entries(FEATURE_FLAGS).map(([k, v]) => [k, v.default])
    ) as Record<FeatureFlagName, boolean>;
  }

  protected computeSnapshot(): Readonly<Record<FeatureFlagName, boolean>> {
    return { ...this.values };
  }

  public isEnabled(name: FeatureFlagName): boolean {
    return this.values[name] ?? false;
  }

  public set(name: FeatureFlagName, value: boolean): void {
    if (this.values[name] !== value) {
      this.values[name] = value;
      this.notify();
    }
  }

  public reset(name?: FeatureFlagName): void {
    if (name) {
      this.values[name] = FEATURE_FLAGS[name].default;
    } else {
      this.values = Object.fromEntries(
        Object.entries(FEATURE_FLAGS).map(([k, v]) => [k, v.default])
      ) as Record<FeatureFlagName, boolean>;
    }
    this.notify();
  }

  public list(): readonly FeatureFlagItem[] {
    return (Object.keys(FEATURE_FLAGS) as FeatureFlagName[]).map((name) => ({
      name,
      enabled: this.values[name],
      category: FEATURE_FLAGS[name].category,
      phase: FEATURE_FLAGS[name].phase,
    }));
  }
}

export const featureFlagRegistry = new DefaultFeatureFlagRegistry();
