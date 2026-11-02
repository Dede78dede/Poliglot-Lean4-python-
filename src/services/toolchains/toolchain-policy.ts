/**
 * Unified Toolchain Policy (Phase 10.9, Task T1)
 *
 * Formal specification of the 11 Lean 4 toolchains supported across
 * Polyglot Code Studio containers and bridges.
 */

export interface ToolchainBinding {
  readonly toolchain: string;         // e.g., "v4.35.0"
  readonly owner: string;             // e.g., "femev-runner"
  readonly purpose: string;           // e.g., "6-kernel paranoid check"
  readonly stability: 'stable' | 'rc' | 'fork';
  readonly pinnedCommit?: string;
}

export const TOOLCHAIN_POLICY = {
  'v4.28.0':       { toolchain: 'v4.28.0',       owner: 'kimina',           purpose: 'Kimina legacy support',                             stability: 'stable' },
  'v4.31.0':       { toolchain: 'v4.31.0',       owner: 'kimina',           purpose: 'Kimina legacy support',                             stability: 'stable' },
  'v4.31.0-rc2':   { toolchain: 'v4.31.0-rc2',   owner: 'pastalean-runner', purpose: 'PastaLean (upstream pin)',                          stability: 'rc',     pinnedCommit: 'a8f9c12b4e87d10c81d3ef16e53c457d192e42a9' },
  'v4.32.0':       { toolchain: 'v4.32.0',       owner: 'leancert-runner',  purpose: 'LeanCert certificate checkers',                     stability: 'stable' },
  'v4.32.2':       { toolchain: 'v4.32.2',       owner: 'femev-runner',     purpose: 'LeanInteract v0.11.5',                              stability: 'stable' },
  'v4.33.0':       { toolchain: 'v4.33.0',       owner: 'leanflow-runner',  purpose: 'Verso Blueprint v4.33.0',                           stability: 'stable' },
  'v4.33.1':       { toolchain: 'v4.33.1',       owner: 'pantograph',       purpose: 'Pantograph v0.3.19',                                stability: 'stable' },
  'v4.34.0-rc1':   { toolchain: 'v4.34.0-rc1',   owner: 'femev-runner',     purpose: 'lean-beam validated',                               stability: 'rc' },
  'v4.34.1':       { toolchain: 'v4.34.1',       owner: 'femev-runner',     purpose: 'Lungo v1.86.160',                                   stability: 'stable' },
  'v4.35.0-rc2':   { toolchain: 'v4.35.0-rc2',   owner: 'leanflow-runner',  purpose: 'doc-gen4 v4.35.0-rc2',                              stability: 'rc' },
  'v4.35.0-rc4':   { toolchain: 'v4.35.0-rc4',   owner: 'kimina',           purpose: 'Kimina latest RC',                                  stability: 'rc' },
  'v4.35.0':       { toolchain: 'v4.35.0',       owner: 'femev-runner',     purpose: '6-kernel paranoid check, Veriphy, LeanFlow default', stability: 'stable' },
} as const satisfies Record<string, ToolchainBinding>;

export type SupportedToolchain = keyof typeof TOOLCHAIN_POLICY;

export function getToolchainBinding(toolchain: string): ToolchainBinding | undefined {
  return (TOOLCHAIN_POLICY as Record<string, ToolchainBinding>)[toolchain];
}

export function listSupportedToolchains(): readonly ToolchainBinding[] {
  return Object.values(TOOLCHAIN_POLICY);
}

export function isToolchainSupported(toolchain: string): boolean {
  return toolchain in TOOLCHAIN_POLICY;
}
