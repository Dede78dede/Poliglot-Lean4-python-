import React, { createContext, useContext } from 'react';
import { usePyodide, type UsePyodideReturn } from '../hooks/usePyodide';

const PyodideContext = createContext<UsePyodideReturn | null>(null);

export interface PyodideProviderProps {
  readonly children: React.ReactNode;
}

export function PyodideProvider({ children }: PyodideProviderProps): React.JSX.Element {
  const pyodide = usePyodide();

  return (
    <PyodideContext value={pyodide}>
      {children}
    </PyodideContext>
  );
}

export function usePyodideContext(): UsePyodideReturn {
  const context = useContext(PyodideContext);
  if (!context) {
    throw new Error('usePyodideContext must be used within a PyodideProvider');
  }
  return context;
}
