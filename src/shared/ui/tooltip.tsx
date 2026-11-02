import React from 'react';
import {
  TooltipTrigger,
  Tooltip as AriaTooltip,
} from 'react-aria-components';
import { cn } from '../lib/cn';

export interface TooltipProps {
  readonly content: React.ReactNode;
  readonly children: React.ReactElement;
  readonly delay?: number;
  readonly className?: string;
}

export function Tooltip({
  content,
  children,
  delay = 400,
  className,
}: TooltipProps): React.JSX.Element {
  return (
    <TooltipTrigger delay={delay}>
      {children}
      <AriaTooltip
        className={({ isEntering, isExiting }) =>
          cn(
            'z-50 rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200 border border-slate-700 shadow-md',
            isEntering && 'animate-in fade-in duration-100',
            isExiting && 'animate-out fade-out duration-75',
            className
          )
        }
      >
        {content}
      </AriaTooltip>
    </TooltipTrigger>
  );
}
