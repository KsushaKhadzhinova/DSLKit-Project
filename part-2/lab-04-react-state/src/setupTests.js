import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { loadConfig } from './hooks/useServerLoad';

// The 1 s simulated server load is switched off here; hooks.test.js and App.load.test.jsx turn it on.
loadConfig.delay = 0;

afterEach(() => {
  cleanup();
  localStorage.clear();
  loadConfig.delay = 0;
});
