import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // VITE_BASE=/dslkit/ builds the app for a sub-folder of the server, the router then uses it as basename.
  base: process.env.VITE_BASE ?? '/',
  server: { port: 5176 },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    globals: true,
    // report.test.mjs uses node:test, it runs with the second command of npm test.
    exclude: ['**/node_modules/**', 'report.test.mjs', 'report.test.js'],
  },
});
