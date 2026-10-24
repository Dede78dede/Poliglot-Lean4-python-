import type {
  AllowedPlatformTag,
  WheelArtifactInfo,
} from '../../types/discovery';

export interface PyPiParsedWheel {
  readonly filename: string;
  readonly distribution: string;
  readonly version: string;
  readonly buildTag?: string;
  readonly pythonTag: string;
  readonly abiTag: string;
  readonly platformTag: string;
  readonly isPep783Wasm2026: boolean;
  readonly isPep783Wasm2025: boolean;
  readonly isPurePython: boolean;
}

export interface PyPiReleaseFile {
  readonly filename: string;
  readonly url: string;
  readonly upload_time?: string;
  readonly size: number;
  readonly packagetype: string;
}

export interface PyPiProjectJson {
  readonly info: {
    readonly name: string;
    readonly version: string;
    readonly summary?: string;
  };
  readonly urls: readonly PyPiReleaseFile[];
  readonly releases?: Record<string, readonly PyPiReleaseFile[]>;
}

export interface QueryResult {
  readonly packageName: string;
  readonly version: string;
  readonly files: readonly PyPiParsedWheel[];
  readonly hasWasm2026Wheel: boolean;
  readonly hasWasm2025WheelOnly: boolean;
  readonly hasPurePythonWheel: boolean;
  readonly hasSourceDist: boolean;
  readonly matchedWheel?: WheelArtifactInfo;
  readonly platformTag: AllowedPlatformTag;
  readonly explanation: string;
}

/**
 * Parses a wheel filename per PEP 427 & PEP 783.
 * Format: {distribution}-{version}(-{build})?-{python_tag}-{abi_tag}-{platform_tag}.whl
 */
export function parseWheelFilename(filename: string): PyPiParsedWheel | null {
  if (!filename.endsWith('.whl')) {
    return null;
  }

  const base = filename.slice(0, -4);
  const parts = base.split('-');

  if (parts.length < 5 || parts.length > 6) {
    return null;
  }

  let distribution: string;
  let version: string;
  let buildTag: string | undefined;
  let pythonTag: string;
  let abiTag: string;
  let platformTag: string;

  if (parts.length === 5) {
    [distribution, version, pythonTag, abiTag, platformTag] = parts as [string, string, string, string, string];
  } else {
    [distribution, version, buildTag, pythonTag, abiTag, platformTag] = parts as [string, string, string, string, string, string];
  }

  // Correction C1: Strict 2026 platform tag acceptance
  const isPep783Wasm2026 = platformTag === 'pyemscripten_2026_0_wasm32';
  const isPep783Wasm2025 = platformTag.startsWith('pyemscripten_2025_0');
  const isPurePython = platformTag === 'any' && (pythonTag.startsWith('py3') || pythonTag.startsWith('py2.py3'));

  return {
    filename,
    distribution,
    version,
    buildTag,
    pythonTag,
    abiTag,
    platformTag,
    isPep783Wasm2026,
    isPep783Wasm2025,
    isPurePython,
  };
}

export class PyPiWheelQueryService {
  private readonly cache = new Map<string, { result: QueryResult; timestamp: number }>();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL
  private readonly REQUEST_TIMEOUT_MS = 4000; // 4s timeout

  /**
   * Clears the in-memory cache (primarily for testing and deterministic cache testing).
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Sets a cached query result directly (useful for tests or mocking).
   */
  public setCachedResult(packageName: string, result: QueryResult): void {
    this.cache.set(packageName.toLowerCase(), {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Evaluates an array of PyPI release files for PEP 783 compatibility.
   */
  public evaluateReleaseFiles(packageName: string, version: string, files: readonly PyPiReleaseFile[]): QueryResult {
    const parsedWheels: PyPiParsedWheel[] = [];
    let hasSourceDist = false;

    for (const file of files) {
      if (file.packagetype === 'sdist' || file.filename.endsWith('.tar.gz') || file.filename.endsWith('.zip')) {
        hasSourceDist = true;
      }
      const parsed = parseWheelFilename(file.filename);
      if (parsed) {
        parsedWheels.push(parsed);
      }
    }

    const wasm2026Wheel = parsedWheels.find((w) => w.isPep783Wasm2026);
    const wasm2025Wheel = parsedWheels.find((w) => w.isPep783Wasm2025);
    const purePythonWheel = parsedWheels.find((w) => w.isPurePython);

    // Correction C1: Accept ONLY pyemscripten_2026_0_wasm32.
    // If only pyemscripten_2025_0 is found, explicitly reject as incompatible with specific explanation.
    if (wasm2026Wheel) {
      const rawFile = files.find((f) => f.filename === wasm2026Wheel.filename);
      return {
        packageName,
        version,
        files: parsedWheels,
        hasWasm2026Wheel: true,
        hasWasm2025WheelOnly: false,
        hasPurePythonWheel: Boolean(purePythonWheel),
        hasSourceDist,
        matchedWheel: {
          filename: wasm2026Wheel.filename,
          platformTag: wasm2026Wheel.platformTag,
          pythonTag: wasm2026Wheel.pythonTag,
          abiTag: wasm2026Wheel.abiTag,
          uploadTime: rawFile?.upload_time,
          sizeBytes: rawFile?.size,
          downloadUrl: rawFile?.url,
        },
        platformTag: 'pyemscripten_2026_0_wasm32',
        explanation: 'Published PEP 783 WebAssembly wheel (pyemscripten_2026_0_wasm32) compatible with Pyodide 314 (Python 3.14).',
      };
    }

    if (wasm2025Wheel && !wasm2026Wheel) {
      return {
        packageName,
        version,
        files: parsedWheels,
        hasWasm2026Wheel: false,
        hasWasm2025WheelOnly: true,
        hasPurePythonWheel: Boolean(purePythonWheel),
        hasSourceDist,
        platformTag: 'incompatible',
        explanation: 'Built for Python 3.13 / Pyodide 0.29.x. Rebuild required for Pyodide 314 (Python 3.14).',
      };
    }

    if (purePythonWheel) {
      const rawFile = files.find((f) => f.filename === purePythonWheel.filename);
      return {
        packageName,
        version,
        files: parsedWheels,
        hasWasm2026Wheel: false,
        hasWasm2025WheelOnly: false,
        hasPurePythonWheel: true,
        hasSourceDist,
        matchedWheel: {
          filename: purePythonWheel.filename,
          platformTag: purePythonWheel.platformTag,
          pythonTag: purePythonWheel.pythonTag,
          abiTag: purePythonWheel.abiTag,
          uploadTime: rawFile?.upload_time,
          sizeBytes: rawFile?.size,
          downloadUrl: rawFile?.url,
        },
        platformTag: 'pure-python',
        explanation: 'Universal pure Python wheel (none-any.whl) compatible with Pyodide 314.',
      };
    }

    return {
      packageName,
      version,
      files: parsedWheels,
      hasWasm2026Wheel: false,
      hasWasm2025WheelOnly: false,
      hasPurePythonWheel: false,
      hasSourceDist,
      platformTag: 'incompatible',
      explanation: hasSourceDist
        ? 'No pre-built WASM or pure-Python wheel on PyPI. Source distribution available for compilation.'
        : 'No compatible WebAssembly wheel, pure Python wheel, or source package on PyPI.',
    };
  }

  /**
   * Queries PyPI JSON API for wheel metadata with in-memory caching and timeout.
   */
  public async queryPyPiPackage(packageName: string, timeoutMs?: number): Promise<QueryResult | null> {
    const key = packageName.toLowerCase().trim();
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.result;
    }

    const effectiveTimeout = timeoutMs ?? this.REQUEST_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), effectiveTimeout);

    try {
      const url = `https://pypi.org/pypi/${encodeURIComponent(key)}/json`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'PolyglotCodeStudio/10.1 (Pyodide-PEP783-Resolver)',
        },
      });

      clearTimeout(timer);

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as PyPiProjectJson;
      const latestVersion = data.info?.version ?? 'latest';
      const releaseFiles = data.urls && data.urls.length > 0
        ? data.urls
        : data.releases && data.releases[latestVersion]
          ? data.releases[latestVersion]
          : [];

      const result = this.evaluateReleaseFiles(key, latestVersion, releaseFiles);
      this.cache.set(key, { result, timestamp: Date.now() });
      return result;
    } catch {
      clearTimeout(timer);
      return null;
    }
  }
}

export const pyPiWheelQueryService = new PyPiWheelQueryService();
