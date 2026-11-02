import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';
import { BRAND_NAME } from './src/brand.ts';

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
        '@': import.meta.dirname,
      },
    },
    server: {
      // DISABLE_HMR=true turns off hot reload and file watching (useful when an editor rewrites files often).
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
