import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server runs on :3000 so it lines up with the screenshot workflow in
// CLAUDE.md (node screenshot.mjs http://localhost:3000).
export default defineConfig({
  plugins: [react()],
  publicDir: 'images',
server: { port: 3000, host: true, strictPort: true },
  preview: { port: 3000 },
});
