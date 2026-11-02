import React, { Component, type ReactNode } from 'react';
import { Button } from './button';

export interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallbackTitle?: string;
  readonly onReset?: () => void;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary caught error]', error, errorInfo);
  }

  public handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="p-6 m-4 rounded-lg border border-rose-800 bg-rose-950/30 text-rose-200 flex flex-col gap-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-rose-400 font-mono text-sm font-semibold">
              [COMPONENT_RENDER_FAILED]
            </span>
            <span className="font-medium text-sm text-rose-100">
              {this.props.fallbackTitle ?? 'Component rendering encountered an unexpected failure.'}
            </span>
          </div>
          <p className="text-xs text-rose-300 font-mono break-all">
            {this.state.error?.message ?? 'Unknown error occurred.'}
          </p>
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={this.handleReset}
              className="border-rose-700 bg-rose-900/40 text-rose-200 hover:bg-rose-900/60"
            >
              Retry component
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
