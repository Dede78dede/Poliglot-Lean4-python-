/**
 * Unified Feature Flag Registry (Phase 11.3, Sprint R.1 — Hardened Phase 14.9.9.1)
 *
 * Consolidates 62 feature flags into a typed registry extending ExternalStoreBase.
 * Epistemic Governance:
 * All 62 flags are strictly annotated with owner, phase, category, behaviorWhenOff,
 * createdAt, expiresAt, and description.
 */

import { ExternalStoreBase } from '../stores/external-store-base';

export interface FeatureFlagMetadata {
  readonly default: boolean;
  readonly phase: string;
  readonly category: 'runtime' | 'tooling' | 'experiment' | 'policy';
  readonly owner: string;
  readonly behaviorWhenOff: '503' | '404' | 'noop';
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly description: string;
}

export const FEATURE_FLAGS: Record<string, FeatureFlagMetadata> = {
  // Runtime
  ENABLE_FEMEV:            { default: false, phase: '10.5', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Framework Epistemologico per la Matematica Experimental-Visual' },
  ENABLE_PASTALEAN:        { default: false, phase: '10.6', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Python to Lean 4 gradual typing transpiler' },
  ENABLE_LUNGO:            { default: false, phase: '10.6', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Multi-target CLI translation bridge' },
  ENABLE_LEANFLOW:         { default: false, phase: '10.7', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Flow-based proof pipeline execution' },
  ENABLE_LEANSCREEN:       { default: false, phase: '10.7', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Preflight AST screening without kernel execution' },
  ENABLE_LATEX_INGESTION:  { default: false, phase: '10.7', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'LaTeX mathematical statement ingestion' },
  ENABLE_LEANCERT:         { default: false, phase: '10.8', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Certified numerical interval arithmetic verifier' },
  // Tooling
  ENABLE_NUMPYSPEC:        { default: false, phase: '10.8', category: 'tooling', owner: 'squad-tooling', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'NumPy array shape and type contract validation' },
  ENABLE_NERODIA:          { default: false, phase: '10.8', category: 'tooling', owner: 'squad-tooling', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Lean 4 compiler integration for Python modules' },
  ENABLE_PROVEPY:          { default: false, phase: '10.8', category: 'tooling', owner: 'squad-tooling', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Decorator-based Python function verification' },
  ENABLE_LEAN_FMT:         { default: false, phase: '10.8', category: 'tooling', owner: 'squad-tooling', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Lean source formatting service' },
  ENABLE_HERON:            { default: false, phase: '10.8', category: 'tooling', owner: 'squad-tooling', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Heron geometric analysis tool' },
  ENABLE_VERSO:            { default: false, phase: '10.8', category: 'tooling', owner: 'squad-tooling', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Verso literate programming generator' },
  // Search
  ENABLE_LEAN_FINDER_V2:   { default: true,  phase: '10.8', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '404', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Lean theorem declaration finder service' },
  ENABLE_LEANSEARCH_V2:    { default: true,  phase: '10.8', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '404', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Semantic search engine across Mathlib declarations' },
  ENABLE_LEANEXPLORE:      { default: true,  phase: '10.8', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '404', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Lean interactive explorer and navigation' },
  ENABLE_CRAMF:            { default: false, phase: '10.8', category: 'experiment', owner: 'squad-experiment', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'CRAMF experimental compression protocol' },
  // Blueprint
  ENABLE_LEAN_ATLAS:       { default: false, phase: '10.8', category: 'tooling', owner: 'squad-tooling', behaviorWhenOff: '404', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Interactive blueprint atlas visualizer' },
  // MCP
  ENABLE_MCP_SERVER:       { default: false, phase: '10.3', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Model Context Protocol server daemon' },
  ENABLE_MCP_HTTP_TRANSPORT: { default: false, phase: '10.3', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'HTTP transport adapter for MCP messages' },
  // Infrastructure
  ENABLE_ARCHON_HORIZON:   { default: false, phase: '10.3', category: 'experiment', owner: 'squad-experiment', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Archon multi-agent planning horizon' },
  ENABLE_LEAN_RESERVOIR:   { default: true,  phase: '10.3', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '404', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Lean package reservoir package discovery' },
  ENABLE_DUPER:            { default: false, phase: '8',    category: 'experiment', owner: 'squad-experiment', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Duper superposition prover integration' },
  ENABLE_LEANSAGE:         { default: false, phase: '8',    category: 'experiment', owner: 'squad-experiment', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'LeanSage retrieval augmented tactic suggester' },
  ENABLE_PYODIDE_BUILD:    { default: false, phase: '10.1', category: 'experiment', owner: 'squad-experiment', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'In-browser Pyodide build pipeline' },
  // Selective Integrations (Phase 10.9.5)
  ENABLE_PAPERPROOF:       { default: false, phase: '10.9.5', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '404', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Paperproof visual interactive proof graph' },
  ENABLE_MATHESIS:         { default: false, phase: '10.9.5', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Mathesis automated reasoning provider' },
  ENABLE_EDUCATIONAL_MODE: { default: false, phase: '10.9.5', category: 'tooling', owner: 'squad-tooling', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Educational scaffolding and tutor hints' },
  // Phase 10.9.7 Additions
  ENABLE_UNIFIED_SEARCH:    { default: true,  phase: '10.9.7', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '404', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Unified multi-runtime symbol and theorem search' },
  ENABLE_LSPEC_CI_TEMPLATE: { default: false, phase: '10.9.7', category: 'tooling', owner: 'squad-tooling', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'LSpec continuous integration workflow template' },
  // Phase 10.10 Additions (LLM-Native Access Layer)
  ENABLE_MCP_DISCOVER:      { default: true,  phase: '10.10', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'MCP tool and resource capability discovery' },
  ENABLE_MCP_STATELESS:     { default: true,  phase: '10.10', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Stateless execution mode for MCP tool invocation' },
  ENABLE_TOOL_SEARCH:       { default: false, phase: '10.10', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Dynamic tool search index for LLM agents' },
  ENABLE_MCP_GATEWAY:       { default: false, phase: '10.10', category: 'experiment', owner: 'squad-experiment', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Multi-tenant MCP gateway proxy' },
  ENABLE_SKILL_BUNDLES:     { default: false, phase: '10.10', category: 'tooling', owner: 'squad-tooling', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Modular agent skill bundles loader' },
  ENABLE_DEEPSEEK_KIMI_MINIMAX: { default: false, phase: '10.10', category: 'experiment', owner: 'squad-experiment', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'External frontier LLM provider connectors' },
  // Phase 11.0.1 Additions (IDE Shell, Advanced Editing & File Manager)
  ENABLE_ACTIVITY_BAR:      { default: true,  phase: '11.0.1', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '404', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Left primary activity bar navigation' },
  ENABLE_FILE_MANAGER:      { default: true,  phase: '11.0.1', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '404', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Virtual file tree workspace manager' },
  ENABLE_DIFF_VIEWER:       { default: true,  phase: '11.0.1', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '404', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Side-by-side structural syntax diff viewer' },
  ENABLE_CONTEXT_ENGINE:    { default: false, phase: '11.0.1', category: 'experiment', owner: 'squad-experiment', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'IDE context extraction and embedding engine' },
  // Phase 11.0.2 Additions (LLM Chat, Settings UI & Automations)
  ENABLE_LLM_CHAT:            { default: false, phase: '11.0.2', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '404', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Assistant sidebar panel' },
  ENABLE_SETTINGS_UI:         { default: true,  phase: '11.0.2', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '404', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'User settings and preferences modal' },
  ENABLE_AGENTIC_AUTOMATION:  { default: false, phase: '11.0.2', category: 'experiment', owner: 'squad-experiment', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Autonomous multi-step code refactoring loop' },
  ENABLE_PROJECT_SCAFFOLDING: { default: true,  phase: '11.0.2', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Lakefile and pyproject project template scaffolder' },
  // Phase 11.1 Additions (lean-beam Speculative Tactic Execution)
  ENABLE_LEAN_BEAM:           { default: false, phase: '11.1', category: 'experiment', owner: 'squad-experiment', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Speculative parallel tactic execution engine' },
  // Phase 11.2 Additions (Workspace Archive, Paperproof Playback, OTel, Mathesis & Yjs CRDT)
  ENABLE_WORKSPACE_ARCHIVE:   { default: true,  phase: '11.2', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'ZIP export and import for workspace sessions' },
  ENABLE_PAPERPROOF_PLAYBACK: { default: false, phase: '11.2', category: 'tooling', owner: 'squad-tooling', behaviorWhenOff: '404', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Step-by-step interactive tactic replay' },
  ENABLE_OTEL_BROWSER:        { default: false, phase: '11.2', category: 'experiment', owner: 'squad-experiment', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'OpenTelemetry browser telemetry collector' },
  ENABLE_OTEL_NODE:           { default: false, phase: '11.2', category: 'experiment', owner: 'squad-experiment', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'OpenTelemetry Node.js server collector' },
  ENABLE_YJS_COLLABORATION:   { default: false, phase: '11.2', category: 'experiment', owner: 'squad-experiment', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Real-time collaborative CRDT editor sync' },
  // Phase 11.3 Additions (React Architecture, Performance & Accessibility)
  ENABLE_REACT_COMPILER:      { default: false, phase: '11.3', category: 'experiment', owner: 'squad-experiment', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'React 19 compiler automatic memoization' },
  ENABLE_VIRTUALIZED_LISTS:   { default: true,  phase: '11.3', category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Virtualized DOM list rendering for large datasets' },
  // Phase 12 Additions (Proof Reuse, Proposal Loop, Translation Fidelity & Conditional Integrations)
  ENABLE_PROOF_REUSE:          { default: true,  phase: '12',   category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Lemma cache and proof recycling index' },
  ENABLE_PROPOSAL_LOOP:        { default: false, phase: '12',   category: 'experiment', owner: 'squad-experiment', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Multi-agent proof generation proposal loop' },
  ENABLE_TRANSLATION_FIDELITY: { default: true,  phase: '12',   category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Formal fidelity checker for transpiled code' },
  ENABLE_LP2:                  { default: false, phase: '12',   category: 'experiment', owner: 'squad-experiment', behaviorWhenOff: '503', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Lean-Python-Polyglot intermediate representation' },
  ENABLE_TREETHINK:            { default: false, phase: '12',   category: 'experiment', owner: 'squad-experiment', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Tree-search tactic exploration backend' },
  // Phase 13 Additions (Unified Result Contracts, Contract Parity, Native Notebook & Config Discovery)
  ENABLE_RESULT_ENVELOPE:      { default: true,  phase: '13',   category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Standard RFC 9457 error and success envelope' },
  ENABLE_CONTRACT_PARITY:      { default: true,  phase: '13',   category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'TypeScript Zod to Python Pydantic contract parity check' },
  ENABLE_NOTEBOOK:             { default: true,  phase: '13',   category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: '404', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Interactive dual-runtime notebook interface' },
  ENABLE_CONFIG_MANAGER:       { default: true,  phase: '13',   category: 'runtime', owner: 'squad-runtime', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Hierarchical configuration loader' },
  // Policy (different prefix; documented as a policy flag, not an enable flag)
  PIPELINE_STRICT_GOALS:   { default: false, phase: '10.5', category: 'policy', owner: 'squad-core', behaviorWhenOff: 'noop', createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-12-31T00:00:00Z', description: 'Policy flag enforcing strict non-empty goal count in verification pipeline' },
};

export type FeatureFlagName = keyof typeof FEATURE_FLAGS;

export interface FeatureFlagItem {
  readonly name: FeatureFlagName;
  readonly enabled: boolean;
  readonly category: 'runtime' | 'tooling' | 'experiment' | 'policy';
  readonly phase: string;
  readonly owner: string;
  readonly behaviorWhenOff: '503' | '404' | 'noop';
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly description: string;
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
      owner: FEATURE_FLAGS[name].owner,
      behaviorWhenOff: FEATURE_FLAGS[name].behaviorWhenOff,
      createdAt: FEATURE_FLAGS[name].createdAt,
      expiresAt: FEATURE_FLAGS[name].expiresAt,
      description: FEATURE_FLAGS[name].description,
    }));
  }
}

export const featureFlagRegistry = new DefaultFeatureFlagRegistry();
