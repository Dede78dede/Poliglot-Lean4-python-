import React from 'react';
import {
  ModalOverlay,
  Modal,
  Dialog as AriaDialog,
  Heading,
} from 'react-aria-components';
import { cn } from '../lib/cn';
import { Button } from './button';

export interface DialogProps {
  readonly isOpen: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly title: string;
  readonly description?: string;
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function Dialog({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  className,
}: DialogProps): React.JSX.Element | null {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className={({ isEntering, isExiting }) =>
        cn(
          'fixed inset-0 z-50 flex min-h-full items-center justify-center p-4 bg-black/60 backdrop-blur-xs',
          isEntering && 'animate-in fade-in duration-150',
          isExiting && 'animate-out fade-out duration-100'
        )
      }
    >
      <Modal
        className={({ isEntering, isExiting }) =>
          cn(
            'w-full max-w-lg rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl text-slate-100',
            isEntering && 'animate-in zoom-in-95 duration-150',
            isExiting && 'animate-out zoom-out-95 duration-100',
            className
          )
        }
      >
        <AriaDialog className="outline-hidden flex flex-col gap-4">
          {({ close }) => (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <Heading slot="title" className="text-base font-semibold text-slate-100">
                    {title}
                  </Heading>
                  {description && (
                    <p className="mt-1 text-xs text-slate-400">{description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Close dialog"
                  onClick={close}
                  className="text-slate-400 hover:text-slate-100 p-1 min-h-0"
                >
                  ✕
                </Button>
              </div>

              <div className="text-sm text-slate-300">{children}</div>
            </>
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
}
