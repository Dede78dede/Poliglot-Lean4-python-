// Polyglot Code Studio - Client Main Entry
// Global environment safeguards for mobile browsers and WebView contexts
if (typeof window !== 'undefined') {
  const win = window as unknown as Record<string, unknown>;
  if (!win['process']) {
    win['process'] = { env: {} };
  }
  if (!win['global']) {
    win['global'] = window;
  }
}

import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
} else {
  console.error('[Polyglot Studio] Root DOM element #root not found.');
}
