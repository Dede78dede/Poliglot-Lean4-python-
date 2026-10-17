/**
 * Tier 4 to Tier 5 Lifecycle & Promotion Policy.
 *
 * Policy: Hybrid Lifecycle Strategy
 * - Inactivity Auto-Promotion threshold: N = 48 hours of inactivity.
 * - TTL Warning threshold: 80% of TTL = 57.6 hours (TTL is 72 hours).
 * - Exemption: Sessions with `isPinned: true` are exempt from auto-promotion and TTL eviction.
 * - Manual Promotion: Always available at any time via 1-click Archive.
 */

export const TIER4_TTL_HOURS = 72;
export const AUTO_PROMOTION_INACTIVITY_HOURS = 48;
export const TTL_WARNING_THRESHOLD_HOURS = TIER4_TTL_HOURS * 0.8; // 57.6 hours

export type LifecycleActionStatus =
  | 'active'
  | 'warning_ttl_threshold'
  | 'auto_promote_triggered'
  | 'exempt_pinned'
  | 'already_promoted';

export interface LifecycleEvaluationInput {
  readonly sessionId: string;
  readonly projectName: string;
  readonly sessionAgeHours?: number;
  readonly lastActivityHoursAgo: number;
  readonly isPinned: boolean;
  readonly isArchived: boolean;
}

export interface LifecycleEvaluationResult {
  readonly status: LifecycleActionStatus;
  readonly shouldAutoPromote: boolean;
  readonly emitWarning: boolean;
  readonly warningMessage?: string;
  readonly reason: string;
}

/**
 * Pure evaluation function assessing whether a Tier 4 workspace requires
 * TTL warning emission or automated Tier 5 cold storage promotion.
 */
export function evaluateSessionLifecycle(
  input: LifecycleEvaluationInput,
): LifecycleEvaluationResult {
  const { sessionId, projectName, sessionAgeHours, lastActivityHoursAgo, isPinned, isArchived } = input;

  if (isPinned) {
    return {
      status: 'exempt_pinned',
      shouldAutoPromote: false,
      emitWarning: false,
      reason: `Session ${sessionId} ("${projectName}") is pinned: exempt from auto-promotion and TTL expiry.`,
    };
  }

  if (isArchived) {
    return {
      status: 'already_promoted',
      shouldAutoPromote: false,
      emitWarning: false,
      reason: `Session ${sessionId} ("${projectName}") is already archived in Tier 5.`,
    };
  }

  const age = sessionAgeHours ?? lastActivityHoursAgo;
  const emitWarning = age >= TTL_WARNING_THRESHOLD_HOURS;
  const shouldAutoPromote = lastActivityHoursAgo >= AUTO_PROMOTION_INACTIVITY_HOURS;

  if (shouldAutoPromote) {
    return {
      status: 'auto_promote_triggered',
      shouldAutoPromote: true,
      emitWarning,
      warningMessage: emitWarning
        ? `Attenzione: La sessione "${projectName}" ha superato l'80% del TTL (57.6h). Archiviazione in corso.`
        : undefined,
      reason: `Inactivity period (${lastActivityHoursAgo}h) reached auto-promotion threshold (${AUTO_PROMOTION_INACTIVITY_HOURS}h).`,
    };
  }

  if (emitWarning) {
    return {
      status: 'warning_ttl_threshold',
      shouldAutoPromote: false,
      emitWarning: true,
      warningMessage: `Avviso di ciclo vitale: La sessione "${projectName}" ha raggiunto l'80% del TTL (57.6h). Il progetto verrà archiviato a breve.`,
      reason: `Workspace activity reached 80% TTL threshold (${age}h >= ${TTL_WARNING_THRESHOLD_HOURS}h).`,
    };
  }

  return {
    status: 'active',
    shouldAutoPromote: false,
    emitWarning: false,
    reason: `Session active within standard window (${lastActivityHoursAgo}h < ${AUTO_PROMOTION_INACTIVITY_HOURS}h).`,
  };
}
