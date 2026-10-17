import { z } from 'zod';
import type { ProjectFile } from './projects';

export const DiscoveryEcosystemSchema = z.enum(['lean4', 'python', 'all']);
export type DiscoveryEcosystem = z.infer<typeof DiscoveryEcosystemSchema>;

export const ToolchainStatusSchema = z.enum(['compatible', 'mismatch', 'unknown']);
export type ToolchainStatus = z.infer<typeof ToolchainStatusSchema>;

export interface ToolchainRequirement {
  readonly leanVersion?: string; // e.g. "v4.8.0" or "v4.13.0"
  readonly mathlibCommit?: string;
  readonly pythonVersion?: string; // e.g. ">=3.11"
  readonly purePython?: boolean;
  readonly pyodideCompatible?: boolean;
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
  }[];
  readonly hasUnsupportedCExtensions: boolean;
  readonly unsupportedPackages: readonly string[];
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
