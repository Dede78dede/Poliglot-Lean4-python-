// src/types/phase-10.9-baseline.ts

export interface BaselineContainer {
  readonly id: string;
  readonly port: number;
  readonly memoryLimitMb: number | null;
  readonly toolchains: readonly string[];
  readonly healthPath: string;
  readonly disabledByDefault: boolean;
  readonly healthCheckIntervalS: number;
  readonly restartPolicy: 'always' | 'unless-stopped' | 'no';
  readonly dependsOn: readonly string[];
}

export interface BaselineFeatureFlag {
  readonly name: string;
  readonly defaultValue: boolean;
  readonly prefix: 'ENABLE_' | 'PIPELINE_';
  readonly phaseIntroduced: string;
  readonly category: 'runtime' | 'tooling' | 'experiment' | 'policy';
}

export interface BaselineBridgeService {
  readonly id: string;
  readonly filePath: string;
  readonly errorCodes: readonly string[];
  readonly timeoutMs: number;
  readonly retryPolicy: 'none' | 'fixed' | 'exponential';
  readonly containerDependency: string | null;
}

export interface BaselineExternalStore {
  readonly id: string;
  readonly filePath: string;
  readonly getSnapshotSignature: string;
  readonly multiTabSync: boolean;
}

export interface BaselineIndexedDb {
  readonly name: string;
  readonly version: number;
  readonly objectStores: readonly string[];
}

export interface BaselineZipConstants {
  readonly MAX_TOTAL_UNCOMPRESSED_BYTES_GITHUB: number;
  readonly MAX_TOTAL_UNCOMPRESSED_BYTES_MANUAL: number;
  readonly MAX_FILE_UNCOMPRESSED_BYTES: number;
  readonly MAX_FILES: number;
  readonly MAX_COMPRESSION_RATIO: number;
  readonly MAX_PATH_DEPTH: number;
}

export interface BaselineBundleSizes {
  readonly mainChunkKb: number;
  readonly lazyChunksKb: Readonly<Record<string, number>>;
  readonly totalGzippedKb: number;
}

export interface Phase109Baseline {
  readonly capturedAt: string;       // ISO 8601
  readonly containers: readonly BaselineContainer[];
  readonly featureFlags: readonly BaselineFeatureFlag[];
  readonly bridgeServices: readonly BaselineBridgeService[];
  readonly externalStores: readonly BaselineExternalStore[];
  readonly indexedDbDatabases: readonly BaselineIndexedDb[];
  readonly leanToolchains: readonly string[];
  readonly zipConstants: BaselineZipConstants;
  readonly bundleSizes: BaselineBundleSizes;
}
