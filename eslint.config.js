import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';

/*
 * Linting here is intentionally *not* type-aware. `npm run typecheck` already runs the
 * compiler in strict mode over every project, so duplicating that work inside ESLint
 * would cost build time without catching anything new.
 */
export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '.vercel/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      // Underscore prefix is the documented escape hatch for deliberately unused bindings.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // `any` defeats the point of the strict tsconfig; require an explicit, reviewed opt-out.
      '@typescript-eslint/no-explicit-any': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': 'off',
    },
  },

  /* ---------------------------------------------------------------- server (node) */
  {
    files: ['server/**/*.ts', 'api/**/*.ts', 'client/scripts/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },

  /* ---------------------------------------------------------------- client (browser) */
  {
    files: ['client/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['client/src/**/*.tsx'],
    ...jsxA11y.flatConfigs.recommended,
  },

  /* ---------------------------------------------------------------- tests */
  {
    files: ['**/*.test.{ts,tsx}', '**/testing/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },

  /* ---------------------------------------------------------------- config files */
  {
    files: ['*.js', '*.ts', '**/vite.config.ts', '**/vitest.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
);
