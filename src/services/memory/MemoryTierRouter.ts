/**
 * Explicit Type-to-Tier Mapping Table for the 5-Tier Memory Architecture.
 *
 * Requirements:
 * - Every DataType maps to exactly one Tier.
 * - The constant is typed as Readonly<Record<DataType, MemoryTier>> and frozen with Object.freeze.
 * - Tier is NOT derived from runtime context; it is an explicit, immutable lookup.
 */

export const MEMORY_TIERS = [
  'Tier1_AST',
  'Tier2_Buffer',
  'Tier3_ClientIndexedDB',
  'Tier4_ServerWorkspace',
  'Tier5_ColdStorage',
] as const;

export type MemoryTier = (typeof MEMORY_TIERS)[number];

export const DATA_TYPES = [
  'AST_DIAGNOSTICS',
  'ACTIVE_EDITOR_BUFFER',
  'VFS_PROJECT_SNAPSHOT',
  'SERVER_SESSION_WORKSPACE',
  'COLD_STORAGE_ARCHIVE',
] as const;

export type DataType = (typeof DATA_TYPES)[number];

export const TIER_ASSIGNMENT: Readonly<Record<DataType, MemoryTier>> = Object.freeze({
  AST_DIAGNOSTICS: 'Tier1_AST',
  ACTIVE_EDITOR_BUFFER: 'Tier2_Buffer',
  VFS_PROJECT_SNAPSHOT: 'Tier3_ClientIndexedDB',
  SERVER_SESSION_WORKSPACE: 'Tier4_ServerWorkspace',
  COLD_STORAGE_ARCHIVE: 'Tier5_ColdStorage',
});

/**
 * Pure, deterministic routing of a DataType to its authoritative MemoryTier.
 */
export function routeDataType(dataType: DataType): MemoryTier {
  const tier = TIER_ASSIGNMENT[dataType];
  if (!tier) {
    throw new Error(`Unassigned DataType: ${String(dataType)}`);
  }
  return tier;
}
