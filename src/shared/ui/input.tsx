import React from 'react';
import { cn } from '../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  readonly ref?: React.Ref<HTMLInputElement>;
  readonly hasError?: boolean;
}

export function Input({
  className,
  type = 'text',
  hasError = false,
  ref,
  disabled,
  ...props
}: InputProps): React.JSX.Element {
  return (
    <input
      type={type}
      ref={ref}
      disabled={disabled}
      aria-invalid={hasError ? 'true' : undefined}
      className={cn(
        'w-full px-3 py-2 text-sm rounded-md border bg-slate-900 text-slate-100 placeholder:text-slate-500',
        'border-slate-700 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        hasError && 'border-rose-500 focus-visible:ring-rose-500 focus-visible:border-rose-500',
        className
      )}
      {...props}
    />
  );
}
