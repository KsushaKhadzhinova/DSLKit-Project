import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

// The first visit to a lazy page loads its module, which is slow on a busy machine.
configure({ asyncUtilTimeout: 8000 });

afterEach(() => {
  cleanup();
  localStorage.clear();
});
