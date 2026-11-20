import js from '@eslint/js';
import globals from 'globals';

// Strict on real mistakes (recommended rules are errors), quiet about style: Prettier owns the formatting.
export default [
  {
    ignores: [
      'node_modules/**',
      'part-2/**',
      'course-project/**',
      'react-app/**',
      'site/dist/**',
      'dist/**',
      '**/generated/**',
      '.claude/**',
      'testing-course/**',
      'coverage/**',
      'docs/**',
    ],
  },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser, ...globals.node } },
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-shadow-restricted-names': 'error',
      'no-throw-literal': 'error',
      'no-implicit-globals': 'error',
      // The sanitizers strip control characters on purpose.
      'no-control-regex': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-return-await': 'error',
    },
  },
  { files: ['**/*.cjs'], languageOptions: { sourceType: 'commonjs' } },
];
