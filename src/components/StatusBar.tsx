import React from 'react';
import type { SupportedLanguage } from '../types/language';
import type { PyodideReadyStatus } from '../hooks/usePyodide';
import { StatusBar as NavigationStatusBar } from './navigation/StatusBar';

export interface StatusBarProps {
  readonly language?: SupportedLanguage;
  readonly line?: number;
  readonly col?: number;
  readonly charCount?: number;
  readonly pyodideStatus?: PyodideReadyStatus;
  readonly isKiminaSimulated?: boolean;
  readonly lastDurationMs?: number;
}

export function StatusBar(_props: StatusBarProps): React.JSX.Element {
  return <NavigationStatusBar />;
}
