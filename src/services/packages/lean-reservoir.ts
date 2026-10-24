export interface ReservoirPackageVersion {
  readonly version: string;
  readonly gitUrl: string;
  readonly defaultBranch?: string;
  readonly license?: string;
  readonly description?: string;
  readonly dependencies?: readonly string[];
}

export interface ReservoirPackage {
  readonly name: string;
  readonly fullName: string; // owner/repo
  readonly description: string;
  readonly license: string;
  readonly stars: number;
  readonly defaultBranch: string;
  readonly versions: readonly string[];
  readonly latestVersion: string;
  readonly repositoryUrl: string;
  readonly topics: readonly string[];
}

export interface ReservoirSearchResult {
  readonly total: number;
  readonly packages: readonly ReservoirPackage[];
  readonly source: 'network' | 'offline-snapshot';
}

export const RESERVOIR_API_BASE = 'https://reservoir.lean-lang.org/api/v1';
export const RESERVOIR_API_VERSION_HEADER = '1.0.0';
export const LAKE_REGISTRY_API_VERSION_HEADER = '0.1.0';

export const RESERVOIR_OFFLINE_PACKAGES: readonly ReservoirPackage[] = [
  {
    name: 'mathlib',
    fullName: 'leanprover-community/mathlib4',
    description: 'The Lean mathematical library: algebra, topology, analysis, category theory, number theory, and combinatorics.',
    license: 'Apache-2.0',
    stars: 3800,
    defaultBranch: 'master',
    versions: ['v4.35.0-rc4', 'v4.33.1', 'v4.31.0', 'v4.28.0'],
    latestVersion: 'v4.35.0-rc4',
    repositoryUrl: 'https://github.com/leanprover-community/mathlib4',
    topics: ['mathlib', 'formal-mathematics', 'mathematics', 'proofs'],
  },
  {
    name: 'batteries',
    fullName: 'leanprover-community/batteries',
    description: 'The "extended standard library" for Lean 4, providing data structures, tactics, and foundational utilities.',
    license: 'Apache-2.0',
    stars: 480,
    defaultBranch: 'main',
    versions: ['v4.35.0-rc4', 'v4.33.1'],
    latestVersion: 'v4.35.0-rc4',
    repositoryUrl: 'https://github.com/leanprover-community/batteries',
    topics: ['standard-library', 'tactics', 'data-structures'],
  },
  {
    name: 'aesop',
    fullName: 'leanprover-community/aesop',
    description: 'Automated Extensible Search for Obvious Proofs in Lean 4 — white-box best-first proof search tactic.',
    license: 'Apache-2.0',
    stars: 620,
    defaultBranch: 'master',
    versions: ['v4.35.0-rc4', 'v4.33.0'],
    latestVersion: 'v4.35.0-rc4',
    repositoryUrl: 'https://github.com/leanprover-community/aesop',
    topics: ['tactics', 'proof-search', 'automation'],
  },
  {
    name: 'proofwidgets',
    fullName: 'leanprover-community/ProofWidgets4',
    description: 'Interactive user interface components, graphs, diagrams, and Infoview widgets for Lean 4.',
    license: 'Apache-2.0',
    stars: 340,
    defaultBranch: 'main',
    versions: ['v4.35.0-rc4', 'v0.0.48'],
    latestVersion: 'v4.35.0-rc4',
    repositoryUrl: 'https://github.com/leanprover-community/ProofWidgets4',
    topics: ['infoview', 'widgets', 'ui', 'visualization'],
  },
  {
    name: 'duper',
    fullName: 'leanprover-community/duper',
    description: 'Higher-order superposition theorem prover and automated hammer tactic for Lean 4.',
    license: 'Apache-2.0',
    stars: 290,
    defaultBranch: 'main',
    versions: ['v4.35.0-rc4', 'v0.0.12'],
    latestVersion: 'v4.35.0-rc4',
    repositoryUrl: 'https://github.com/leanprover-community/duper',
    topics: ['superposition', 'automated-reasoning', 'hammer'],
  },
  {
    name: 'plausible',
    fullName: 'leanprover-community/plausible',
    description: 'Property-based testing and counterexample generator for Lean 4, inspired by QuickCheck.',
    license: 'Apache-2.0',
    stars: 185,
    defaultBranch: 'main',
    versions: ['v4.35.0-rc4', 'v4.33.0'],
    latestVersion: 'v4.35.0-rc4',
    repositoryUrl: 'https://github.com/leanprover-community/plausible',
    topics: ['testing', 'counterexamples', 'quickcheck'],
  },
  {
    name: 'importGraph',
    fullName: 'leanprover-community/import-graph',
    description: 'Tool and Lake facet to inspect and render the module import dependency graph of Lean 4 projects.',
    license: 'Apache-2.0',
    stars: 120,
    defaultBranch: 'main',
    versions: ['v4.35.0-rc4'],
    latestVersion: 'v4.35.0-rc4',
    repositoryUrl: 'https://github.com/leanprover-community/import-graph',
    topics: ['dependencies', 'import-graph', 'lake'],
  },
  {
    name: 'cli',
    fullName: 'leanprover/lean4-cli',
    description: 'Robust, type-safe command-line argument parser and CLI framework for Lean 4 executables.',
    license: 'Apache-2.0',
    stars: 210,
    defaultBranch: 'main',
    versions: ['v4.35.0-rc4', 'v2.2.0'],
    latestVersion: 'v4.35.0-rc4',
    repositoryUrl: 'https://github.com/leanprover/lean4-cli',
    topics: ['cli', 'argument-parser'],
  },
];

export class LeanReservoirClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = RESERVOIR_API_BASE) {
    this.baseUrl = baseUrl;
  }

  public getHeaders(): Record<string, string> {
    return {
      'Accept': 'application/json',
      'X-Reservoir-Api-Version': RESERVOIR_API_VERSION_HEADER,
      'X-Lake-Registry-Api-Version': LAKE_REGISTRY_API_VERSION_HEADER,
    };
  }

  public async searchPackages(query: string, options?: { limit?: number; offset?: number }): Promise<ReservoirSearchResult> {
    const q = query.trim().toLowerCase();
    const limit = options?.limit ?? 20;

    // Search offline snapshot
    const filtered = RESERVOIR_OFFLINE_PACKAGES.filter((pkg) => {
      if (!q) return true;
      return (
        pkg.name.toLowerCase().includes(q) ||
        pkg.fullName.toLowerCase().includes(q) ||
        pkg.description.toLowerCase().includes(q) ||
        pkg.topics.some((t) => t.toLowerCase().includes(q))
      );
    });

    return {
      total: filtered.length,
      packages: filtered.slice(0, limit),
      source: 'offline-snapshot',
    };
  }

  public getPackageByName(name: string): ReservoirPackage | undefined {
    const target = name.toLowerCase();
    return RESERVOIR_OFFLINE_PACKAGES.find(
      (pkg) => pkg.name.toLowerCase() === target || pkg.fullName.toLowerCase() === target,
    );
  }

  public generateLakefileRequirement(pkgName: string, version?: string): string {
    const pkg = this.getPackageByName(pkgName);
    if (!pkg) {
      const v = version ?? 'main';
      return `require ${pkgName} from git "https://github.com/leanprover-community/${pkgName}" @ "${v}"`;
    }

    const selectedVersion = version ?? pkg.latestVersion;
    return `require ${pkg.name} from git "${pkg.repositoryUrl}" @ "${selectedVersion}"`;
  }

  public generateLakeManifestEntry(pkgName: string, version?: string): Record<string, unknown> {
    const pkg = this.getPackageByName(pkgName);
    const gitUrl = pkg ? pkg.repositoryUrl : `https://github.com/leanprover-community/${pkgName}`;
    const rev = version ?? (pkg ? pkg.latestVersion : 'main');

    return {
      name: pkg ? pkg.name : pkgName,
      url: gitUrl,
      rev,
      type: 'git',
      inherited: false,
      configFile: 'lakefile.lean',
    };
  }
}

export const leanReservoirClient = new LeanReservoirClient();
