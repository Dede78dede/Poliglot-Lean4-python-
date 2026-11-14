export const KIMINA_MODES = ['real', 'simulator', 'auto'] as const;
export type KiminaMode = (typeof KIMINA_MODES)[number];

interface KiminaConfigBase {
  readonly mode: KiminaMode;
  readonly timeoutMs: number;
  readonly authToken?: string;
}

export interface KiminaRealConfig extends KiminaConfigBase {
  readonly mode: 'real';
  readonly baseUrl: string;
}

export interface KiminaSimulatorConfig extends KiminaConfigBase {
  readonly mode: 'simulator';
}

export interface KiminaAutoConfig extends KiminaConfigBase {
  readonly mode: 'auto';
  readonly baseUrl: string;
}

export type KiminaConfig =
  | KiminaRealConfig
  | KiminaSimulatorConfig
  | KiminaAutoConfig;

/**
 * Resolves Kimina configuration from environment variables.
 *
 * Rules:
 * - In production: ONLY `real` is permitted. Startup throws otherwise (Fail-Fast).
 * - In `real` mode: `KIMINA_BASE_URL` (or `KIMINA_URL`) is required.
 * - In `auto` mode: `KIMINA_BASE_URL` (or `KIMINA_URL`) is used for primary attempt (defaults to http://localhost:8000).
 * - Default mode: `real` in production, `auto` in development/test.
 *
 * @throws {Error} If configuration is invalid for the current environment.
 */
export function resolveKiminaConfig(env: Record<string, string | undefined> = process.env): KiminaConfig {
  const isProduction = env['NODE_ENV'] === 'production';
  const defaultMode: KiminaMode = isProduction ? 'real' : 'auto';
  const rawMode = (env['KIMINA_MODE'] ?? defaultMode) as KiminaMode;

  if (!KIMINA_MODES.includes(rawMode)) {
    throw new Error(
      `Invalid KIMINA_MODE="${rawMode}". Allowed modes are: ${KIMINA_MODES.join(', ')}`,
    );
  }

  // Production guard: Never allow simulator or auto in production
  if (isProduction && rawMode !== 'real') {
    throw new Error(
      `CRITICAL SECURITY VIOLATION: KIMINA_MODE="${rawMode}" is strictly forbidden in production. ` +
        `Set KIMINA_MODE=real and configure KIMINA_BASE_URL pointing to the Kimina container.`,
    );
  }

  const resolvedUrl = env['KIMINA_BASE_URL'] ?? env['KIMINA_URL'];
  const baseUrl = resolvedUrl ?? (rawMode === 'simulator' ? undefined : 'http://localhost:8000');
  const timeoutMs = Number(env['KIMINA_TIMEOUT_MS'] ?? 30_000);
  const authToken = env['KIMINA_AUTH_TOKEN']?.trim() || undefined;

  if (Number.isNaN(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Invalid KIMINA_TIMEOUT_MS="${env['KIMINA_TIMEOUT_MS']}". Must be a positive integer.`);
  }

  if (rawMode === 'real' && !baseUrl) {
    throw new Error(`KIMINA_MODE="real" requires KIMINA_BASE_URL (or KIMINA_URL) to be set.`);
  }

  switch (rawMode) {
    case 'real':
      return { mode: 'real', baseUrl: baseUrl!, timeoutMs, authToken };
    case 'simulator':
      return { mode: 'simulator', timeoutMs, authToken };
    case 'auto':
      return { mode: 'auto', baseUrl: baseUrl ?? 'http://localhost:8000', timeoutMs, authToken };
  }
}
