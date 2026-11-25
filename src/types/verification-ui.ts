/**
 * Shared Verification UI & Transport Protocol Constants
 *
 * Centralizes epistemic badge identifiers, runtime modes, container paths,
 * and RFC 6455 WebSocket close codes to eliminate magic strings.
 */

export const EPISTEMIC_BADGES = Object.freeze({
  SEAL_KERNEL_VERIFIED: 'SEAL_KERNEL_VERIFIED_TIER5',
  UNVERIFIED: 'UNVERIFIED',
  SIMULATED_NON_CERTIFYING: '⚠ SIMULATED — NON-CERTIFYING',
  SYNTACTIC_CANDIDATE_ONLY: 'SYNTACTIC_CANDIDATE_ONLY',
} as const);

export type EpistemicBadge = (typeof EPISTEMIC_BADGES)[keyof typeof EPISTEMIC_BADGES];

export const ENGINE_MODES = Object.freeze({
  REAL: 'real',
  AUTO: 'auto',
  SIMULATOR: 'simulator',
} as const);

export type EngineMode = (typeof ENGINE_MODES)[keyof typeof ENGINE_MODES];

/**
 * RFC 6455 WebSocket Close Codes.
 * 1008 = Policy Violation (authentication / authorization rejection).
 * 1003 = Unsupported Data (malformed frame / non-binary Yjs payload).
 */
export const WS_CLOSE_CODES = Object.freeze({
  NORMAL: 1000,
  UNSUPPORTED_DATA: 1003,
  POLICY_VIOLATION: 1008,
  MESSAGE_TOO_BIG: 1009,
} as const);

export type WsCloseCode = (typeof WS_CLOSE_CODES)[keyof typeof WS_CLOSE_CODES];

export const CONTAINER_PROJECT_STORE_ROOT = '/workspace/projects';
