import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5177 },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    globals: true,
    // report.test.mjs uses node:test, it runs with the second command of npm test.
    testTimeout: 30000,
    exclude: ['**/node_modules/**', 'report.test.mjs', 'report.test.js'],
  },
});
