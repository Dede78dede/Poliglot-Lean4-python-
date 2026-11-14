export const LEAN_RUNNER_MODES = ['real', 'auto', 'simulator'] as const;
export type LeanRunnerMode = (typeof LEAN_RUNNER_MODES)[number];

export const AVAILABLE_LEAN_TOOLCHAINS = Object.freeze([
  'v4.28.0',
  'v4.31.0',
  'v4.31.0-rc2',
  'v4.32.2',
  'v4.33.1',
  'v4.34.1',
  'v4.35.0-rc4',
  'v4.35.0',
] as const);

export type AvailableLeanToolchain = (typeof AVAILABLE_LEAN_TOOLCHAINS)[number];

export const DEFAULT_LEAN_TOOLCHAIN: AvailableLeanToolchain = 'v4.35.0-rc4';

export interface LeanRunnerConfig {
  readonly mode: LeanRunnerMode;
  readonly runnerUrl: string;
  readonly timeoutMs: number;
  readonly authToken?: string;
}

export function resolveLeanRunnerConfig(
  env: Record<string, string | undefined> = process.env,
): LeanRunnerConfig {
  const isProduction = env['NODE_ENV'] === 'production';
  const defaultMode: LeanRunnerMode = isProduction ? 'real' : 'auto';
  const rawMode = (env['LEAN_RUNNER_MODE'] ?? defaultMode) as LeanRunnerMode;

  if (!LEAN_RUNNER_MODES.includes(rawMode)) {
    throw new Error(
      `Invalid LEAN_RUNNER_MODE="${rawMode}". Allowed modes are: ${LEAN_RUNNER_MODES.join(', ')}`,
    );
  }

  // Fail-fast production guard: in production, only 'real' is allowed
  if (isProduction && rawMode !== 'real') {
    throw new Error(
      `CRITICAL PRODUCTION GUARD: LEAN_RUNNER_MODE="${rawMode}" is strictly forbidden in production. ` +
        `Set LEAN_RUNNER_MODE=real and configure LEAN_RUNNER_URL.`,
    );
  }

  const runnerUrl = env['LEAN_RUNNER_URL'] ?? 'http://lean-runner:8080';
  const timeoutMs = Number(env['LEAN_BUILD_TIMEOUT_MS'] ?? 300_000); // 5 minutes default
  const authToken = env['LEAN_RUNNER_AUTH_TOKEN']?.trim() || undefined;

  if (Number.isNaN(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Invalid LEAN_BUILD_TIMEOUT_MS="${env['LEAN_BUILD_TIMEOUT_MS']}".`);
  }

  if (rawMode === 'real' && !runnerUrl) {
    throw new Error(`LEAN_RUNNER_MODE="real" requires LEAN_RUNNER_URL to be set.`);
  }

  return {
    mode: rawMode,
    runnerUrl,
    timeoutMs,
    authToken,
  };
}
