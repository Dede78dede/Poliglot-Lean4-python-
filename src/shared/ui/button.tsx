import React from 'react';
import { cn } from '../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  className,
  variant = 'secondary',
  size = 'md',
  ref,
  children,
  disabled,
  ...props
}: ButtonProps): React.JSX.Element {
  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-300 dark:bg-blue-600 dark:hover:bg-blue-500',
    secondary:
      'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200',
    ghost:
      'bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white active:bg-slate-700 disabled:opacity-40',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-300',
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-2.5 py-1 text-xs min-h-[32px]',
    md: 'px-4 py-2 text-sm min-h-[40px]',
    lg: 'px-6 py-2.5 text-base min-h-[44px]',
  };

  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-md transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900',
        'disabled:cursor-not-allowed whitespace-nowrap shrink-0',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
