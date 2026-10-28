import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { BRAND_NAME } from './src/brand';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Fills %BRAND_NAME% in index.html from src/brand.ts.
      {name: 'brand-name', transformIndexHtml: (html: string) => html.replaceAll('%BRAND_NAME%', BRAND_NAME)},
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
