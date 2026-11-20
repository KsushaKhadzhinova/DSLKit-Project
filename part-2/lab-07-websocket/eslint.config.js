const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**', 'coverage/**', 'figures/**', 'figures-live/**', 'shots/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'commonjs', globals: { ...globals.node } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', ignoreRestSiblings: true, caughtErrors: 'none' }], 'no-control-regex': 'off', eqeqeq: 'error', 'no-var': 'error', 'prefer-const': 'error' },
  },
  // The browser scripts of the chat page.
  { files: ['public/**/*.js'], languageOptions: { sourceType: 'script', globals: { ...globals.browser } } },
  { files: ['**/*.mjs'], languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node } } },
];
