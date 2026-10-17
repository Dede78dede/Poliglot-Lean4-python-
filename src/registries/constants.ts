export const APP_CONSTANTS = Object.freeze({
  APP_NAME: 'Polyglot Code Studio',
  MAX_CODE_LENGTH: 100_000,
  DEFAULT_TIMEOUT_MS: 10_000,
  MIN_TIMEOUT_MS: 1_000,
  MAX_TIMEOUT_MS: 30_000,
  PYODIDE_CDN_VERSION: '0.27.3',
  PYODIDE_CDN_BASE: 'https://cdn.jsdelivr.net/pyodide/v0.27.3/full/',
  API_BASE_PATH: '/api/v1',
  LOCAL_STORAGE_CODE_KEY_PREFIX: 'polyglot.code.',
  LOCAL_STORAGE_LAYOUT_KEY: 'polyglot.workspace.layout',
  LOCAL_STORAGE_LANGUAGE_KEY: 'polyglot.active_language',
  KIMINA_DEFAULT_BASE_URL: 'http://localhost:8000',
});
