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
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      /*
       * `role="region"` is added to the roles that may carry `tabIndex`, and the reason is a
       * genuine accessibility requirement rather than a lint annoyance.
       *
       * The two comparison tables scroll horizontally inside `overflow-x: auto` containers.
       * That container is reachable with a pointer and, without `tabIndex`, completely
       * unreachable with a keyboard: a sighted keyboard user on a narrow window can see the
       * table is cut off and has no way to move it. The fix WCAG 2.1.1 asks for is exactly a
       * focusable scroll container with an accessible name — `tabIndex={0}` plus
       * `role="region"` plus `aria-label` — which is what both of them now are.
       *
       * The rule's default allowance is `['tabpanel']` only. Widening it to `region` keeps the
       * rule doing its real job (catching `tabIndex` sprinkled on decorative divs) while
       * permitting the one pattern that is required rather than optional.
       */
      'jsx-a11y/no-noninteractive-tabindex': ['error', { roles: ['tabpanel', 'region'] }],
    },
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
