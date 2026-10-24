import type {
  AllowedPlatformTag,
  PackageClassification,
  PythonDependencyAnalysis,
  ToolchainCompatibilityReport,
  ToolchainStatus,
  WasmCompatibilityTier,
} from '../../types/discovery';
import { packageTierClassifier } from './package-tier-classifier';
import { localSnapshotRegistry } from './pypi-snapshot-registry';

export const PYODIDE_PYTHON_VERSION = '3.14 (WASM)';

export interface ParsedRequirement {
  readonly name: string;
  readonly specifier?: string;
  readonly isWasmSupported: boolean;
  readonly tier?: WasmCompatibilityTier;
  readonly platformTag?: AllowedPlatformTag;
  readonly explanation?: string;
}

/**
 * Parses requirements.txt content, ignoring comments, empty lines, and options.
 * Classifies each requirement against PEP 783 snapshot and Pyodide compatibility rules.
 */
export function parseRequirementsTxt(content: string): readonly ParsedRequirement[] {
  const lines = content.split(/\r?\n/);
  const result: ParsedRequirement[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('-')) {
      continue;
    }

    // Strip inline comment
    const cleanLine = line.split('#')[0]!.trim();
    // Match package name and optional specifier (e.g. numpy>=1.24.0 or sympy==1.12)
    const match = cleanLine.match(/^([a-zA-Z0-9_.-]+)(.*)$/);
    if (match && match[1]) {
      const name = match[1].toLowerCase();
      const specifier = match[2]?.trim() || undefined;

      const classification = packageTierClassifier.classifySynchronous(name, specifier);
      result.push({
        name,
        specifier,
        isWasmSupported: classification.isWasmSupported,
        tier: classification.tier,
        platformTag: classification.platformTag,
        explanation: classification.explanation,
      });
    }
  }

  return result;
}

/**
 * Parses pyproject.toml to extract dependencies under [project] dependencies = [...]
 * or [tool.poetry.dependencies]
 */
export function parsePyprojectToml(content: string): readonly ParsedRequirement[] {
  const result: ParsedRequirement[] = [];
  const lines = content.split(/\r?\n/);

  let inDependenciesArray = false;
  let inDependenciesTable = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Section header change
    if (line.startsWith('[')) {
      inDependenciesArray = false;
      inDependenciesTable =
        line.startsWith('[tool.poetry.dependencies') ||
        line.startsWith('[project.dependencies');
      continue;
    }

    // PEP 621 array start: dependencies = [
    if (line.startsWith('dependencies') && line.includes('=')) {
      if (line.includes('[')) {
        inDependenciesArray = true;
      }
    }

    if (inDependenciesArray) {
      if (line.includes(']')) {
        inDependenciesArray = false;
      }
      // TOML array items: "sympy>=1.12",
      const quoteMatch = line.match(/^["']([a-zA-Z0-9_.-]+)(.*?)["'],?$/);
      if (quoteMatch && quoteMatch[1]) {
        const name = quoteMatch[1].toLowerCase();
        const specifier = quoteMatch[2]?.trim() || undefined;
        const classification = packageTierClassifier.classifySynchronous(name, specifier);
        result.push({
          name,
          specifier,
          isWasmSupported: classification.isWasmSupported,
          tier: classification.tier,
          platformTag: classification.platformTag,
          explanation: classification.explanation,
        });
      }
      continue;
    }

    if (inDependenciesTable) {
      if (!line || line.startsWith('#')) continue;

      // Table key-value: numpy = "^1.20"
      const kvMatch = line.match(/^([a-zA-Z0-9_.-]+)\s*=\s*["']([^"']+)["']/);
      if (kvMatch && kvMatch[1]) {
        const name = kvMatch[1].toLowerCase();
        if (name === 'python') continue; // Skip python version constraint
        const specifier = kvMatch[2]?.trim();
        const classification = packageTierClassifier.classifySynchronous(name, specifier);
        result.push({
          name,
          specifier,
          isWasmSupported: classification.isWasmSupported,
          tier: classification.tier,
          platformTag: classification.platformTag,
          explanation: classification.explanation,
        });
      }
    }
  }

  return result;
}

/**
 * Extracts python version constraints from pyproject.toml, setup.cfg, or environment.yml
 */
export function extractRequiresPython(content: string): string | undefined {
  // 1. PEP 621 requires-python in pyproject.toml: requires-python = ">=3.11"
  const pep621Match = content.match(/requires-python\s*=\s*["']([^"']+)["']/i);
  if (pep621Match && pep621Match[1]) {
    return pep621Match[1].trim();
  }

  // 2. Poetry python constraint: python = "^3.11" or python = ">=3.11,<3.13"
  const poetryMatch = content.match(/\[tool\.poetry\.dependencies\][\s\S]*?python\s*=\s*["']([^"']+)["']/i);
  if (poetryMatch && poetryMatch[1]) {
    return poetryMatch[1].trim();
  }

  // 3. setup.cfg: python_requires = >=3.11
  const setupCfgMatch = content.match(/python_requires\s*=\s*([^\r\n]+)/i);
  if (setupCfgMatch && setupCfgMatch[1]) {
    return setupCfgMatch[1].trim();
  }

  // 4. environment.yml: - python>=3.11 or - python=3.11
  const envYmlMatch = content.match(/-\s*python\s*([=><~][^\r\n#\s]+)/i);
  if (envYmlMatch && envYmlMatch[1]) {
    return envYmlMatch[1].trim();
  }

  return undefined;
}

/**
 * Synchronous compatibility evaluation using local snapshot registry for immediate UI rendering.
 */
export function evaluatePythonCompatibility(
  files: readonly { readonly path: string; readonly content: string }[],
): ToolchainCompatibilityReport {
  let requirements: readonly ParsedRequirement[] = [];

  for (const file of files) {
    if (file.path === 'requirements.txt' || file.path.endsWith('/requirements.txt')) {
      requirements = parseRequirementsTxt(file.content);
      break;
    }
    if (file.path === 'pyproject.toml' || file.path.endsWith('/pyproject.toml')) {
      requirements = parsePyprojectToml(file.content);
      break;
    }
  }

  const unsupported = requirements
    .filter((r) => !r.isWasmSupported)
    .map((r) => r.name);

  const hasUnsupportedCExtensions = unsupported.length > 0;
  const status: ToolchainStatus = hasUnsupportedCExtensions ? 'mismatch' : 'compatible';

  const notes: string[] = [];
  const supported = requirements.filter((r) => r.isWasmSupported).map((r) => r.name);

  if (supported.length > 0) {
    notes.push(`Pacchetti Pyodide compatibili: ${supported.join(', ')}`);
  }

  const classifications = requirements.map((r) =>
    packageTierClassifier.classifySynchronous(r.name, r.specifier),
  );

  const analysis: PythonDependencyAnalysis = {
    requirements,
    hasUnsupportedCExtensions,
    unsupportedPackages: unsupported,
    classifications,
  };

  if (hasUnsupportedCExtensions) {
    const warning = `⚠ PACCHETTI C/GPU NON COMPATIBILI CON WASM: [${unsupported.join(
      ', ',
    )}]. L'esecuzione richiederà un sandbox backend standard.`;
    return {
      status: 'mismatch',
      ecosystem: 'python',
      requiredVersion: 'Python standard con C/CUDA extensions',
      currentVersion: PYODIDE_PYTHON_VERSION,
      verifiedAllowed: false,
      warning,
      notes,
      pythonAnalysis: analysis,
    };
  }

  notes.push('Ambiente WASM pronto: tutti i pacchetti sono compatibili con il runtime client-side.');

  return {
    status: 'compatible',
    ecosystem: 'python',
    requiredVersion: 'Python 3.11+ / Pyodide WASM',
    currentVersion: PYODIDE_PYTHON_VERSION,
    verifiedAllowed: true,
    notes,
    pythonAnalysis: analysis,
  };
}

/**
 * Asynchronous compatibility evaluation combining live PyPI wheel inspection with snapshot fallback.
 */
export async function evaluatePythonCompatibilityAsync(
  files: readonly { readonly path: string; readonly content: string }[],
): Promise<ToolchainCompatibilityReport> {
  let baseReqs: readonly ParsedRequirement[] = [];

  for (const file of files) {
    if (file.path === 'requirements.txt' || file.path.endsWith('/requirements.txt')) {
      baseReqs = parseRequirementsTxt(file.content);
      break;
    }
    if (file.path === 'pyproject.toml' || file.path.endsWith('/pyproject.toml')) {
      baseReqs = parsePyprojectToml(file.content);
      break;
    }
  }

  const classifications: PackageClassification[] = [];
  const resolvedRequirements: ParsedRequirement[] = [];

  for (const req of baseReqs) {
    const classification = await packageTierClassifier.classifyAsync(req.name, req.specifier);
    classifications.push(classification);
    resolvedRequirements.push({
      name: req.name,
      specifier: req.specifier,
      isWasmSupported: classification.isWasmSupported,
      tier: classification.tier,
      platformTag: classification.platformTag,
      explanation: classification.explanation,
    });
  }

  const unsupported = resolvedRequirements
    .filter((r) => !r.isWasmSupported)
    .map((r) => r.name);

  const hasUnsupportedCExtensions = unsupported.length > 0;
  const status: ToolchainStatus = hasUnsupportedCExtensions ? 'mismatch' : 'compatible';

  const notes: string[] = [];
  const supported = resolvedRequirements.filter((r) => r.isWasmSupported).map((r) => r.name);

  if (supported.length > 0) {
    notes.push(`Pacchetti Pyodide compatibili (PEP 783): ${supported.join(', ')}`);
  }

  const analysis: PythonDependencyAnalysis = {
    requirements: resolvedRequirements,
    hasUnsupportedCExtensions,
    unsupportedPackages: unsupported,
    classifications,
  };

  if (hasUnsupportedCExtensions) {
    const warning = `⚠ PACCHETTI C/GPU NON COMPATIBILI CON WASM: [${unsupported.join(
      ', ',
    )}]. L'esecuzione richiederà un sandbox backend standard o compilazione via pyodide-build.`;
    return {
      status: 'mismatch',
      ecosystem: 'python',
      requiredVersion: 'Python standard con C/CUDA extensions',
      currentVersion: PYODIDE_PYTHON_VERSION,
      verifiedAllowed: false,
      warning,
      notes,
      pythonAnalysis: analysis,
    };
  }

  notes.push('Ambiente WASM pronto: tutti i pacchetti sono compatibili con il runtime client-side (PEP 783).');

  return {
    status: 'compatible',
    ecosystem: 'python',
    requiredVersion: 'Python 3.14 / Pyodide 314 WASM',
    currentVersion: PYODIDE_PYTHON_VERSION,
    verifiedAllowed: true,
    notes,
    pythonAnalysis: analysis,
  };
}

export class PythonDependencyResolver {
  public parseRequirements(content: string): readonly ParsedRequirement[] {
    return parseRequirementsTxt(content);
  }

  public parsePyproject(content: string): readonly ParsedRequirement[] {
    return parsePyprojectToml(content);
  }

  public evaluate(files: readonly { readonly path: string; readonly content: string }[]): ToolchainCompatibilityReport {
    return evaluatePythonCompatibility(files);
  }

  public async evaluateAsync(files: readonly { readonly path: string; readonly content: string }[]): Promise<ToolchainCompatibilityReport> {
    return evaluatePythonCompatibilityAsync(files);
  }
}

export const pythonDependencyResolver = new PythonDependencyResolver();
