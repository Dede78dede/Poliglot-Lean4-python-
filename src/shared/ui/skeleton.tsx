import React from 'react';
import { cn } from '../lib/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly width?: number | string;
  readonly height?: number | string;
}

export function Skeleton({
  className,
  width,
  height,
  style,
  ...props
}: SkeletonProps): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded bg-slate-800/80',
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
}
