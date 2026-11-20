import js from '@eslint/js';
import globals from 'globals';

// Lab 8 has no application code of its own (Dockerfiles and compose): only the smoke script and the tests are linted.
export default [
  { ignores: ['node_modules/**', 'coverage/**', 'figures/**', 'figures-rerun/**', 'shots/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', ignoreRestSiblings: true, caughtErrors: 'none' }], eqeqeq: 'error', 'no-var': 'error', 'prefer-const': 'error' },
  },
];
