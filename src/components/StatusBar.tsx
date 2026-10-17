import React, { useEffect } from 'react';
import type { SupportedLanguage } from '../types/language';
import type { PyodideReadyStatus } from '../hooks/usePyodide';
import { StatusBar as NavigationStatusBar } from './navigation/StatusBar';
import { contextUpdaters } from '../services/context/context-updaters';

export interface StatusBarProps {
  readonly language?: SupportedLanguage;
  readonly line?: number;
  readonly col?: number;
  readonly charCount?: number;
  readonly pyodideStatus?: PyodideReadyStatus;
  readonly isKiminaSimulated?: boolean;
  readonly lastDurationMs?: number;
}

export function StatusBar({
  language,
  line,
  col,
  pyodideStatus,
  isKiminaSimulated,
}: StatusBarProps): React.JSX.Element {
  useEffect(() => {
    if (language !== undefined || line !== undefined || col !== undefined) {
      contextUpdaters.setEditorContext({
        langId: language,
        line,
        column: col,
      });
    }
  }, [language, line, col]);

  useEffect(() => {
    if (pyodideStatus !== undefined || isKiminaSimulated !== undefined) {
      contextUpdaters.setRuntimeContext({
        pyodideReady: pyodideStatus === 'ready',
        kiminaReady: isKiminaSimulated !== undefined ? !isKiminaSimulated : undefined,
      });
    }
  }, [pyodideStatus, isKiminaSimulated]);

  return <NavigationStatusBar />;
}
