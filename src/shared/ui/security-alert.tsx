/**
 * Security & Rate Limit Accessible Alert Component (Phase 14 Consolidation)
 *
 * Implements WCAG 2.2 AA compliant live regions with role="alert" and aria-live="assertive"
 * for immediate auditory announcement of rate limit (429) and authorization (401) events.
 */

import React from 'react';
import { Button } from './button';

export interface SecurityAlertProps {
  readonly title: string;
  readonly message: string;
  readonly type?: 'rate_limit' | 'auth_denied' | 'bypass_blocked';
  readonly retryAfterSeconds?: number;
  readonly onDismiss?: () => void;
}

export const SecurityAlert: React.FC<SecurityAlertProps> = ({
  title,
  message,
  type = 'rate_limit',
  retryAfterSeconds,
  onDismiss,
}) => {
  const isRateLimit = type === 'rate_limit';
  const borderClasses = isRateLimit
    ? 'border-amber-500/50 bg-amber-950/40 text-amber-200'
    : 'border-rose-500/50 bg-rose-950/40 text-rose-200';
  const badgeClasses = isRateLimit
    ? 'bg-amber-500/20 text-amber-300 border-amber-600/40'
    : 'bg-rose-500/20 text-rose-300 border-rose-600/40';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`p-4 m-2 rounded-lg border flex flex-col gap-2 ${borderClasses}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${badgeClasses}`}>
            {isRateLimit ? 'HTTP 429' : 'HTTP 401'}
          </span>
          <span className="font-medium text-sm">{title}</span>
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            aria-label="Dismiss security notice"
            className="text-xs text-neutral-400 hover:text-neutral-200"
          >
            Dismiss
          </Button>
        )}
      </div>
      <p className="text-xs opacity-90">{message}</p>
      {retryAfterSeconds !== undefined && retryAfterSeconds > 0 && (
        <div className="text-xs font-mono opacity-75">
          Quota refreshes in: {retryAfterSeconds}s
        </div>
      )}
    </div>
  );
};
