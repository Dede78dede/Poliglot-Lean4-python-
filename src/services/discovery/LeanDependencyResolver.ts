import type {
  LeanDependencyAnalysis,
  ToolchainCompatibilityReport,
  ToolchainStatus,
} from '../../types/discovery';

export const STUDIO_LEAN_DEFAULT_VERSION = 'v4.8.0';

/**
 * Extracts Lean version from lean-toolchain file content.
 * Common formats:
 * - "leanprover/lean4:v4.8.0"
 * - "v4.13.0"
 * - "leanprover/lean4:nightly-2024-05-10"
 */
export function parseLeanToolchain(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  // Pattern: leanprover/lean4:v4.8.0 or leanprover/lean4:4.8.0
  const match = trimmed.match(/(?:leanprover\/lean4:)?(v?\d+\.\d+\.\d+(?:-[a-zA-Z0-9_.-]+)?)/);
  if (match && match[1]) {
    const v = match[1];
    return v.startsWith('v') ? v : `v${v}`;
  }

  // Nightly or arbitrary tag
  const tagMatch = trimmed.match(/(?:leanprover\/lean4:)?([a-zA-Z0-9_.-]+)/);
  if (tagMatch && tagMatch[1]) {
    return tagMatch[1];
  }

  return trimmed;
}

/**
 * Parses lakefile.lean or lakefile.toml to extract package requirements,
 * particularly Mathlib.
 */
export function parseLakefile(content: string): LeanDependencyAnalysis {
  const dependencies: { name: string; gitUrl?: string; revision?: string }[] = [];
  let mathlibDependency: { name: string; gitUrl: string; revision?: string } | undefined;

  // Regex for lakefile.lean: require <pkg> from git "url" @ "rev"
  // or require "leanprover-community" / "mathlib"
  const requireGitRegex = /require\s+([a-zA-Z0-9_.-]+)\s+from\s+git\s+["']([^"']+)["'](?:\s*@\s*["']([^"']+)["'])?/g;
  let match: RegExpExecArray | null;

  while ((match = requireGitRegex.exec(content)) !== null) {
    const [, name, gitUrl, revision] = match;
    if (name && gitUrl) {
      const dep = { name, gitUrl, revision };
      dependencies.push(dep);
      if (name.toLowerCase() === 'mathlib' || gitUrl.toLowerCase().includes('mathlib')) {
        mathlibDependency = dep;
      }
    }
  }

  // Regex for short form: require mathlib
  // or require "leanprover-community" / "mathlib"
  const requirePkgRegex = /require\s+["']?([a-zA-Z0-9_.-]+)["']?(?:\s*\/\s*["']?([a-zA-Z0-9_.-]+)["']?)?/g;
  while ((match = requirePkgRegex.exec(content)) !== null) {
    const [, scopeOrName, pkgName] = match;
    const resolvedName = pkgName || scopeOrName;
    if (resolvedName && !dependencies.some((d) => d.name === resolvedName)) {
      if (resolvedName.toLowerCase() === 'mathlib') {
        const dep = {
          name: 'mathlib',
          gitUrl: 'https://github.com/leanprover-community/mathlib4',
          revision: undefined,
        };
        dependencies.push(dep);
        mathlibDependency = dep;
      } else {
        dependencies.push({ name: resolvedName });
      }
    }
  }

  // TOML format: [[require]] name = "mathlib" git = "..." rev = "..."
  const tomlRequireRegex = /\[\[require\]\]\s*[\r\n]+(?:[^\r\n]*[\r\n]+)*?name\s*=\s*["']([^"']+)["'](?:[^\r\n]*[\r\n]+)*?(?:git\s*=\s*["']([^"']+)["'])?(?:[^\r\n]*[\r\n]+)*?(?:rev\s*=\s*["']([^"']+)["'])?/g;
  while ((match = tomlRequireRegex.exec(content)) !== null) {
    const [, name, gitUrl, revision] = match;
    if (name && !dependencies.some((d) => d.name === name)) {
      const dep = { name, gitUrl, revision };
      dependencies.push(dep);
      if (name.toLowerCase() === 'mathlib') {
        mathlibDependency = dep as { name: string; gitUrl: string; revision?: string };
      }
    }
  }

  return {
    dependencies,
    mathlibDependency,
  };
}

/**
 * Parses lake-manifest.json to extract locked revisions
 */
export function parseLakeManifest(content: string): LeanDependencyAnalysis {
  try {
    const parsed = JSON.parse(content) as {
      packages?: Array<{
        name?: string;
        url?: string;
        rev?: string;
        inputRev?: string;
      }>;
    };

    const dependencies: { name: string; gitUrl?: string; revision?: string }[] = [];
    let mathlibDependency: { name: string; gitUrl: string; revision?: string } | undefined;

    if (Array.isArray(parsed.packages)) {
      for (const pkg of parsed.packages) {
        if (pkg.name) {
          const dep = {
            name: pkg.name,
            gitUrl: pkg.url,
            revision: pkg.rev || pkg.inputRev,
          };
          dependencies.push(dep);
          if (pkg.name.toLowerCase() === 'mathlib') {
            mathlibDependency = dep as { name: string; gitUrl: string; revision?: string };
          }
        }
      }
    }

    return { dependencies, mathlibDependency };
  } catch {
    return { dependencies: [] };
  }
}

/**
 * Normalizes semver string for comparison (e.g. "v4.8.0" -> "4.8.0")
 */
function normalizeVersion(v: string): string {
  return v.trim().replace(/^v/, '');
}

/**
 * Evaluates Lean 4 toolchain compatibility against the Polyglot Code Studio runtime.
 * Strict Rule: If toolchain versions differ or cannot be satisfied, verifiedAllowed MUST be false!
 */
export function evaluateLeanCompatibility(
  files: readonly { readonly path: string; readonly content: string }[],
  currentVersion = STUDIO_LEAN_DEFAULT_VERSION,
): ToolchainCompatibilityReport {
  let requiredVersion: string | null = null;
  let lakeAnalysis: LeanDependencyAnalysis = { dependencies: [] };

  for (const file of files) {
    if (file.path === 'lean-toolchain' || file.path.endsWith('/lean-toolchain')) {
      requiredVersion = parseLeanToolchain(file.content);
    } else if (
      file.path === 'lakefile.lean' ||
      file.path.endsWith('/lakefile.lean') ||
      file.path === 'lakefile.toml' ||
      file.path.endsWith('/lakefile.toml')
    ) {
      lakeAnalysis = parseLakefile(file.content);
    } else if (file.path === 'lake-manifest.json' || file.path.endsWith('/lake-manifest.json')) {
      const manifestAnalysis = parseLakeManifest(file.content);
      if (manifestAnalysis.dependencies.length > 0) {
        lakeAnalysis = manifestAnalysis;
      }
    }
  }

  const effectiveRequired = requiredVersion ?? currentVersion;
  const normRequired = normalizeVersion(effectiveRequired);
  const normCurrent = normalizeVersion(currentVersion);

  const isMatching = normRequired === normCurrent;
  const status: ToolchainStatus = isMatching ? 'compatible' : 'mismatch';
  const verifiedAllowed = isMatching;

  const notes: string[] = [];
  if (lakeAnalysis.mathlibDependency) {
    notes.push(
      `Dipendenza Mathlib rilevata: ${lakeAnalysis.mathlibDependency.revision ?? 'tag predefinito'}`,
    );
  }

  if (isMatching) {
    notes.push(`Ambiente verificato: Lean ${currentVersion} allineato con la toolchain di progetto.`);
    return {
      status: 'compatible',
      ecosystem: 'lean4',
      requiredVersion: effectiveRequired,
      currentVersion,
      verifiedAllowed: true,
      notes,
      leanAnalysis: {
        ...lakeAnalysis,
        toolchainVersion: effectiveRequired,
      },
    };
  }

  const warning = `⚠ AMBIENTE NON ALLINEATO: Richiede lean4:${effectiveRequired}, ambiente attuale lean4:${currentVersion}. Dimostrazioni non certificate formalmente.`;

  return {
    status: 'mismatch',
    ecosystem: 'lean4',
    requiredVersion: effectiveRequired,
    currentVersion,
    verifiedAllowed: false,
    warning,
    notes,
    leanAnalysis: {
      ...lakeAnalysis,
      toolchainVersion: effectiveRequired,
    },
  };
}
