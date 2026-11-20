import js from '@eslint/js';
import globals from 'globals';

// The React plugin is not a dependency of the folder: recommended rules for browser JSX files.
// Components used only in JSX are not seen as "used" without the plugin, so capitalised names are exempt from no-unused-vars.
export default [
  { ignores: ['node_modules/**', 'coverage/**', 'dist/**', 'figures/**', 'shots/**', 'public/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z_]', ignoreRestSiblings: true, caughtErrors: 'none' }],
      'no-control-regex': 'off',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  // Vitest tests use the globals of the runner.
  { files: ['**/*.test.{js,jsx}', 'src/setupTests.js'], languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.vitest } } },
];
