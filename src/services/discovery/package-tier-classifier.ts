import type {
  AllowedPlatformTag,
  PackageClassification,
  WasmCompatibilityTier,
  WheelArtifactInfo,
} from '../../types/discovery';
import { pyPiWheelQueryService } from './pypi-wheel-query';
import { localSnapshotRegistry } from './pypi-snapshot-registry';

export class PackageTierClassifier {
  /**
   * Evaluates package synchronously using the local snapshot registry.
   * Guarantees deterministic, instant evaluation without network calls.
   */
  public classifySynchronous(packageName: string, versionConstraint?: string): PackageClassification {
    const norm = packageName.toLowerCase().trim();
    const snapshot = localSnapshotRegistry.lookup(norm);

    if (snapshot) {
      return {
        packageName: snapshot.name,
        version: versionConstraint ?? snapshot.version,
        tier: snapshot.tier,
        platformTag: snapshot.platformTag,
        isWasmSupported: snapshot.isWasmSupported,
        pyodideCompatible: snapshot.isWasmSupported,
        requiresBuild: snapshot.requiresBuild,
        sourceOrigin: 'snapshot-fallback',
        explanation: snapshot.explanation,
      };
    }

    // Default heuristic for packages not in top 360 snapshot:
    // If not known to be incompatible, assume pure Python until live PyPI query resolves.
    return {
      packageName: norm,
      version: versionConstraint ?? 'latest',
      tier: 'pure-python',
      platformTag: 'pure-python',
      isWasmSupported: true,
      pyodideCompatible: true,
      requiresBuild: false,
      sourceOrigin: 'snapshot-fallback',
      explanation: 'Unindexed package: assuming universal pure Python wheel until verified via PyPI query.',
    };
  }

  /**
   * Evaluates package asynchronously by combining live PyPI metadata with local snapshot fallback.
   */
  public async classifyAsync(
    packageName: string,
    versionConstraint?: string,
    queryTimeoutMs?: number,
  ): Promise<PackageClassification> {
    const norm = packageName.toLowerCase().trim();

    // 1. Check local snapshot first
    const snapshot = localSnapshotRegistry.lookup(norm);

    // 2. Query live PyPI
    const pypiResult = await pyPiWheelQueryService.queryPyPiPackage(norm, queryTimeoutMs);

    if (!pypiResult) {
      // Offline fallback to snapshot
      return this.classifySynchronous(norm, versionConstraint);
    }

    // 3. Correction C1: Strict 2026 tag evaluation
    if (pypiResult.hasWasm2026Wheel) {
      return {
        packageName: pypiResult.packageName,
        version: pypiResult.version,
        tier: 'wheel-available',
        platformTag: 'pyemscripten_2026_0_wasm32',
        matchedWheel: pypiResult.matchedWheel,
        isWasmSupported: true,
        pyodideCompatible: true,
        requiresBuild: false,
        sourceOrigin: 'live-pypi',
        explanation: pypiResult.explanation,
      };
    }

    // Correction C1: 2025 ABI wheels explicitly rejected with specific explanation
    if (pypiResult.hasWasm2025WheelOnly) {
      return {
        packageName: pypiResult.packageName,
        version: pypiResult.version,
        tier: 'incompatible',
        platformTag: 'incompatible',
        isWasmSupported: false,
        pyodideCompatible: false,
        requiresBuild: false,
        sourceOrigin: 'live-pypi',
        explanation: 'Built for Python 3.13 / Pyodide 0.29.x. Rebuild required for Pyodide 314 (Python 3.14).',
      };
    }

    // Check if package is in pyodide-recipes (Blue)
    if (snapshot && snapshot.tier === 'pyodide-recipe') {
      return {
        packageName: snapshot.name,
        version: snapshot.version,
        tier: 'pyodide-recipe',
        platformTag: 'pure-python',
        isWasmSupported: true,
        pyodideCompatible: true,
        requiresBuild: false,
        sourceOrigin: 'snapshot-fallback',
        explanation: snapshot.explanation,
      };
    }

    // Check if package is in Purple category (recipe-patched-pure-python)
    if (snapshot && snapshot.tier === 'recipe-patched-pure-python') {
      return {
        packageName: snapshot.name,
        version: snapshot.version,
        tier: 'recipe-patched-pure-python',
        platformTag: 'pure-python',
        isWasmSupported: true,
        pyodideCompatible: true,
        requiresBuild: false,
        sourceOrigin: 'snapshot-fallback',
        explanation: snapshot.explanation,
      };
    }

    // Pure Python wheel on PyPI (Cyan)
    if (pypiResult.hasPurePythonWheel) {
      return {
        packageName: pypiResult.packageName,
        version: pypiResult.version,
        tier: 'pure-python',
        platformTag: 'pure-python',
        matchedWheel: pypiResult.matchedWheel,
        isWasmSupported: true,
        pyodideCompatible: true,
        requiresBuild: false,
        sourceOrigin: 'live-pypi',
        explanation: pypiResult.explanation,
      };
    }

    // Source dist available but no WASM/pure wheel (Yellow - Build Required)
    if (pypiResult.hasSourceDist) {
      return {
        packageName: pypiResult.packageName,
        version: pypiResult.version,
        tier: 'build-required',
        platformTag: 'incompatible',
        isWasmSupported: false,
        pyodideCompatible: false,
        requiresBuild: true,
        sourceOrigin: 'live-pypi',
        explanation: 'No pre-built WASM wheel on PyPI. Source distribution available for compilation via pyodide-build.',
      };
    }

    // Incompatible / unbuildable
    return {
      packageName: pypiResult.packageName,
      version: pypiResult.version,
      tier: 'incompatible',
      platformTag: 'incompatible',
      isWasmSupported: false,
      pyodideCompatible: false,
      requiresBuild: false,
      sourceOrigin: 'live-pypi',
      explanation: snapshot?.explanation ?? pypiResult.explanation,
    };
  }

  /**
   * Generates formatted UI badge text and style for a tier.
   * Adheres to zero-pill discipline (monospace tabular text, no colored capsule pills).
   */
  public getTierBadgeInfo(tier: WasmCompatibilityTier, platformTag: AllowedPlatformTag): {
    readonly label: string;
    readonly colorClass: string;
    readonly borderClass: string;
    readonly description: string;
  } {
    switch (tier) {
      case 'wheel-available':
        return {
          label: `[${platformTag} · WASM Wheel]`,
          colorClass: 'text-emerald-400',
          borderClass: 'border-emerald-800/40 bg-emerald-950/20',
          description: 'Native PEP 783 WebAssembly wheel published on PyPI for Python 3.14.',
        };
      case 'pyodide-recipe':
        return {
          label: '[pyodide-recipe · Built-in]',
          colorClass: 'text-sky-400',
          borderClass: 'border-sky-800/40 bg-sky-950/20',
          description: 'Optimized package built into the Pyodide distribution.',
        };
      case 'recipe-patched-pure-python':
        return {
          label: '[recipe-patched · Pure Python + Patch]',
          colorClass: 'text-purple-400',
          borderClass: 'border-purple-800/40 bg-purple-950/20',
          description: 'Pure Python package patched by pyodide-recipes for browser execution.',
        };
      case 'pure-python':
        return {
          label: '[pure-python · Universal]',
          colorClass: 'text-cyan-400',
          borderClass: 'border-cyan-800/40 bg-cyan-950/20',
          description: 'Universal pure Python wheel running directly via micropip.',
        };
      case 'build-required':
        return {
          label: '[build-required · Source Available]',
          colorClass: 'text-amber-400',
          borderClass: 'border-amber-800/40 bg-amber-950/20',
          description: 'Source distribution available. Requires compilation with pyodide-build.',
        };
      case 'incompatible':
      default:
        return {
          label: '[incompatible · ABI/Native Mismatch]',
          colorClass: 'text-rose-400',
          borderClass: 'border-rose-800/40 bg-rose-950/20',
          description: 'Unsupported native binary, GPU/CUDA binding, or obsolete 2025 ABI wheel.',
        };
    }
  }
}

export const packageTierClassifier = new PackageTierClassifier();
