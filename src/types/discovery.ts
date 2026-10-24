import { z } from 'zod';
import type { ProjectFile } from './projects';

export const DiscoveryEcosystemSchema = z.enum(['lean4', 'python', 'all']);
export type DiscoveryEcosystem = z.infer<typeof DiscoveryEcosystemSchema>;

export const ToolchainStatusSchema = z.enum(['compatible', 'mismatch', 'unknown']);
export type ToolchainStatus = z.infer<typeof ToolchainStatusSchema>;

/**
 * PEP 783 Six-Tier Pyodide WebAssembly compatibility model.
 * Aligned with the official "Are we PEP 783 yet?" tracker (Green, Blue, Purple, Cyan, Yellow):
 * - wheel-available: Green (4%) - Ships pyemscripten_2026_0_wasm32 wheel on PyPI.
 * - pyodide-recipe: Blue (8%) - Built from source by pyodide-recipes.
 * - recipe-patched-pure-python: Purple (0%) - Pure Python requiring pyodide-recipes patch.
 * - pure-python: Cyan (83%) - Pure Python wheel (py3-none-any.whl), no recipe patch required.
 * - build-required: Yellow (5%) - Source available, requires pyodide-build compilation.
 * - incompatible: Yellow/Red - Incompatible ABI (e.g. pyemscripten_2025_0), CUDA/GPU, or native OS binaries.
 */
export type WasmCompatibilityTier =
  | 'wheel-available'
  | 'pyodide-recipe'
  | 'recipe-patched-pure-python'
  | 'pure-python'
  | 'build-required'
  | 'incompatible';

/**
 * Strict platform tag for Pyodide 314.x (Python 3.14 / Emscripten 5.0.3).
 * Correction C1: pyemscripten_2025_0 is rejected as incompatible because Emscripten has no cross-version ABI stability.
 */
export type AllowedPlatformTag =
  | 'pyemscripten_2026_0_wasm32'
  | 'pure-python'
  | 'incompatible';

export interface WheelArtifactInfo {
  readonly filename: string;
  readonly platformTag: string;
  readonly pythonTag: string;
  readonly abiTag: string;
  readonly uploadTime?: string;
  readonly sizeBytes?: number;
  readonly downloadUrl?: string;
}

export interface PackageClassification {
  readonly packageName: string;
  readonly version: string;
  readonly tier: WasmCompatibilityTier;
  readonly platformTag: AllowedPlatformTag;
  readonly matchedWheel?: WheelArtifactInfo;
  readonly isWasmSupported: boolean;
  readonly pyodideCompatible: boolean; // Preserved for strict backward compatibility
  readonly requiresBuild: boolean;
  readonly sourceOrigin: 'live-pypi' | 'cached' | 'snapshot-fallback';
  readonly explanation: string;
}

export interface ToolchainRequirement {
  readonly leanVersion?: string; // e.g. "v4.8.0" or "v4.13.0"
  readonly mathlibCommit?: string;
  readonly pythonVersion?: string; // e.g. ">=3.11"
  readonly purePython?: boolean;
  readonly pyodideCompatible?: boolean;
  readonly wasmTier?: WasmCompatibilityTier;
  readonly platformTag?: AllowedPlatformTag;
  readonly classificationExplanation?: string;
}

export interface PackageMetadata {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly author: string;
  readonly repositoryUrl: string;
  readonly homepageUrl?: string;
  readonly stars: number;
  readonly license: string;
  readonly ecosystem: 'lean4' | 'python';
  readonly version: string;
  readonly tags: readonly string[];
  readonly category: 'logic' | 'topology' | 'algebra' | 'number-theory' | 'scientific' | 'cas' | 'smt' | 'algorithms';
  readonly toolchain: ToolchainRequirement;
  readonly files: readonly {
    readonly path: string;
    readonly content: string;
    readonly language: ProjectFile['language'];
  }[];
}

export interface LeanDependencyAnalysis {
  readonly toolchainVersion?: string;
  readonly mathlibDependency?: {
    readonly name: string;
    readonly gitUrl: string;
    readonly revision?: string;
  };
  readonly dependencies: readonly {
    readonly name: string;
    readonly gitUrl?: string;
    readonly revision?: string;
  }[];
}

export interface PythonDependencyAnalysis {
  readonly requirements: readonly {
    readonly name: string;
    readonly specifier?: string;
    readonly isWasmSupported: boolean;
    readonly tier?: WasmCompatibilityTier;
    readonly platformTag?: AllowedPlatformTag;
    readonly explanation?: string;
  }[];
  readonly hasUnsupportedCExtensions: boolean;
  readonly unsupportedPackages: readonly string[];
  readonly classifications?: readonly PackageClassification[];
}

export interface ToolchainCompatibilityReport {
  readonly status: ToolchainStatus;
  readonly ecosystem: 'lean4' | 'python';
  readonly requiredVersion: string;
  readonly currentVersion: string;
  readonly verifiedAllowed: boolean;
  readonly warning?: string;
  readonly notes: readonly string[];
  readonly leanAnalysis?: LeanDependencyAnalysis;
  readonly pythonAnalysis?: PythonDependencyAnalysis;
}

export interface DiscoverySearchResult {
  readonly packages: readonly PackageMetadata[];
  readonly results?: readonly PackageMetadata[];
  readonly total: number;
  readonly source: 'reservoir' | 'github' | 'pypi' | 'curated-cache';
  readonly warning?: 'RATE_LIMITED' | 'NETWORK_ERROR';
  readonly resetAt?: string;
}

export interface DiscoveryRateLimitResponse {
  readonly results: readonly PackageMetadata[];
  readonly warning: 'RATE_LIMITED' | 'NETWORK_ERROR';
  readonly resetAt?: string;
}
