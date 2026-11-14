import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react({
        compiler: {
          compilationMode: 'annotation',
        },
      }),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
        'monaco-editor/esm/vs/editor/editor.api.js': path.resolve(
          import.meta.dirname,
          './src/services/collaboration/monaco-api-shim.ts'
        ),
        'monaco-editor': path.resolve(
          import.meta.dirname,
          './src/services/collaboration/monaco-api-shim.ts'
        ),
      },
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      global: 'globalThis',
    },
    build: {
      chunkSizeWarningLimit: 600,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'react-vendor',
                test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                priority: 30,
              },
              {
                name: 'aria-vendor',
                test: /[\\/]node_modules[\\/](react-aria|react-aria-components|@react-aria)[\\/]/,
                priority: 20,
              },
              {
                name: 'zod-vendor',
                test: /[\\/]node_modules[\\/]zod[\\/]/,
                priority: 15,
              },
              {
                name: 'monaco-vendor',
                test: /[\\/]node_modules[\\/](monaco-editor|@monaco-editor)[\\/]/,
                priority: 10,
              },
              {
                name: 'icons-vendor',
                test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
                priority: 5,
              },
            ],
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
