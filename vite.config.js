import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The version shown in the website footer comes from package.json (the single source of truth).
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// The frontend runs on 5173 and forwards /api calls to the backend on 5000.
export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: { port: 5173, proxy: { '/api': 'http://localhost:5000' } },
});
