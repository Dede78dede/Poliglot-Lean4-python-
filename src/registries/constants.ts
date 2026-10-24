export const APP_CONSTANTS = Object.freeze({
  APP_NAME: 'Polyglot Code Studio',
  MAX_CODE_LENGTH: 100_000,
  DEFAULT_TIMEOUT_MS: 10_000,
  MIN_TIMEOUT_MS: 1_000,
  MAX_TIMEOUT_MS: 30_000,
  PYODIDE_CDN_VERSION: '314.0.7',
  PYODIDE_CDN_BASE: 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/',
  API_BASE_PATH: '/api/v1',
  LOCAL_STORAGE_CODE_KEY_PREFIX: 'polyglot.code.',
  LOCAL_STORAGE_LAYOUT_KEY: 'polyglot.workspace.layout',
  LOCAL_STORAGE_LANGUAGE_KEY: 'polyglot.active_language',
  KIMINA_DEFAULT_BASE_URL: 'http://localhost:8000',
});

export const ZIP_LIMITS = Object.freeze({
  MAX_TOTAL_UNCOMPRESSED_BYTES_GITHUB: 209_715_200,   // 200 MiB
  MAX_TOTAL_UNCOMPRESSED_BYTES_MANUAL: 52_428_800,    // 50 MiB
  MAX_FILE_UNCOMPRESSED_BYTES: 5_242_880,             // 5 MiB
  MAX_FILES: 500,
  MAX_COMPRESSION_RATIO: 100,
  MAX_PATH_DEPTH: 20,
  MAX_SYMLINKS: 0,
  MAX_NESTED_DEPTH: 1,                                 // ZIP inside ZIP: reject
  ALLOWED_EXTENSIONS: Object.freeze([
    '.py',
    '.lean',
    '.toml',
    '.json',
    '.md',
    '.txt',
    '.lakefile',
    '.leanfile',
    '.tex',
    '.bib',
    '.pdf',
    '.yml',
    '.yaml',
  ]),
} as const);

export type ZipLimits = typeof ZIP_LIMITS;
