import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_|^next$|^req$|^res$', caughtErrorsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['node_modules/', 'scripts/'],
  },
];
