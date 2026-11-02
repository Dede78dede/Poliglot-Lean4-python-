import React from 'react';
import { cn } from '../lib/cn';

export type BadgeVariant = 'neutral' | 'verified' | 'warning' | 'error';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  readonly variant?: BadgeVariant;
  readonly unboxed?: boolean;
}

export function Badge({
  className,
  variant = 'neutral',
  unboxed = false,
  children,
  ...props
}: BadgeProps): React.JSX.Element {
  if (unboxed) {
    const unboxedColors: Record<BadgeVariant, string> = {
      neutral: 'text-slate-400',
      verified: 'text-emerald-400 font-medium',
      warning: 'text-amber-400 font-medium',
      error: 'text-rose-400 font-medium',
    };

    return (
      <span
        className={cn('inline-flex items-center gap-1.5 text-xs', unboxedColors[variant], className)}
        {...props}
      >
        {children}
      </span>
    );
  }

  const boxedColors: Record<BadgeVariant, string> = {
    neutral: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
    verified: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50',
    warning: 'bg-amber-950/40 text-amber-300 border-amber-800/50',
    error: 'bg-rose-950/40 text-rose-300 border-rose-800/50',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-mono rounded border whitespace-nowrap',
        boxedColors[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
