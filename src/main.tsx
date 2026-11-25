/**
 * React 19 Application Mount Entry Point
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// Prevent benign Chromium ResizeObserver loop warnings from third-party widgets (e.g. Monaco internal sub-widgets)
// from triggering spurious uncaught global error notifications.
if (typeof window !== 'undefined') {
  window.addEventListener(
    'error',
    (event: ErrorEvent) => {
      if (
        event.message === 'ResizeObserver loop completed with undelivered notifications.' ||
        event.message === 'ResizeObserver loop limit exceeded'
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    },
    true
  );
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found in DOM.');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
