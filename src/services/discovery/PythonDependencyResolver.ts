import type {
  PythonDependencyAnalysis,
  ToolchainCompatibilityReport,
  ToolchainStatus,
} from '../../types/discovery';

export const PYODIDE_PYTHON_VERSION = '3.14 (WASM)';

// Common scientific and math packages compiled for Pyodide WebAssembly
const PYODIDE_SUPPORTED_PACKAGES = new Set([
  'numpy',
  'scipy',
  'pandas',
  'sympy',
  'matplotlib',
  'mpmath',
  'networkx',
  'pytest',
  'z3-solver',
  'regex',
  'six',
  'pytz',
  'dateutil',
  'python-dateutil',
  'requests',
  'urllib3',
  'certifi',
  'idna',
  'chardet',
  'packaging',
  'typing-extensions',
  'pydantic',
  'shapely',
  'scikit-learn',
  'statsmodels',
  'seaborn',
  'jinja2',
  'markupsafe',
  'pyparsing',
  'kiwisolver',
  'fonttools',
  'cycler',
  'contourpy',
  'pillow',
]);

// Heavy C-extension / GPU / native binaries known to be unsupported in browser WASM
const KNOWN_UNSUPPORTED_WASM_PACKAGES = new Set([
  'torch',
  'pytorch',
  'torchvision',
  'torchaudio',
  'tensorflow',
  'tf-nightly',
  'cv2',
  'opencv-python',
  'opencv-python-headless',
  'cuda',
  'pycuda',
  'cupy',
  'triton',
  'onnxruntime-gpu',
  'mpi4py',
  'xgboost',
  'lightgbm',
  'catboost',
  'polars',
  'faiss',
  'spacy',
]);

export interface ParsedRequirement {
  readonly name: string;
  readonly specifier?: string;
  readonly isWasmSupported: boolean;
}

/**
 * Parses requirements.txt content, ignoring comments, empty lines, and options.
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
      const isKnownUnsupported = KNOWN_UNSUPPORTED_WASM_PACKAGES.has(name);
      // Pure python packages or known Pyodide packages are supported
      const isWasmSupported = !isKnownUnsupported;
      result.push({ name, specifier, isWasmSupported });
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
        const isKnownUnsupported = KNOWN_UNSUPPORTED_WASM_PACKAGES.has(name);
        result.push({ name, specifier, isWasmSupported: !isKnownUnsupported });
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
        const isKnownUnsupported = KNOWN_UNSUPPORTED_WASM_PACKAGES.has(name);
        result.push({ name, specifier, isWasmSupported: !isKnownUnsupported });
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

  const analysis: PythonDependencyAnalysis = {
    requirements,
    hasUnsupportedCExtensions,
    unsupportedPackages: unsupported,
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
