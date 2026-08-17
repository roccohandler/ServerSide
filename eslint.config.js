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
    files: ['apps/server/**/*.ts', 'api/**/*.ts', 'apps/*/scripts/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },

  /* ---------------------------------------------------------------- client (browser) */
  {
    files: ['apps/*/src/**/*.{ts,tsx}'],
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
    /*
     * The route groups export route *elements*, not components, and they have to.
     *
     * `<Routes>` reads its children with react-router's `createRoutesFromChildren`, which
     * understands `<Route>` and `<Fragment>` and throws on anything else — so wrapping a
     * group in a `<MarketingRoutes />` component fails at render. Each module therefore
     * exports a JSX value, which is exactly the shape this rule warns about.
     *
     * Turning it off here costs nothing real: Fast Refresh of a route table means
     * re-running the module that declares the `lazy()` boundaries, and a full reload is
     * the correct behaviour for that. The rule stays on everywhere else.
     */
    files: ['apps/*/src/app/routes/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['apps/*/src/**/*.tsx'],
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

  /*
   * ---------------------------------------------------------------- boundaries
   *
   * The architecture, made enforceable. Everything below was true by convention and
   * therefore true only until somebody was in a hurry — the restructure that prompted these
   * rules had already produced fifteen imports reaching into another feature's internals.
   *
   * Three rules, each stating a direction:
   *
   *   1. **A feature is entered through its front door.** `features/x/index.ts` is the public
   *      API; everything else in `features/x/` is private. This is what makes a feature
   *      something you can read, move or delete as a unit.
   *
   *   2. **The design system does not know about features.** `components/` is shared UI. A
   *      shared component importing a business capability means nobody can use the component
   *      without the capability coming with it.
   *
   *   3. **`admin` and `private` do not see each other.** This is DECISION 021 option A: the
   *      customer portal and the owner console stay separable without paying for two builds.
   *      If they are ever split into two applications, this rule is what guarantees the split
   *      is a move rather than an untangling.
   *
   * Dynamic `import()` is deliberately NOT covered. `App.tsx` code-splits by reaching a
   * concrete module — routing a `lazy()` through a barrel merges chunks that
   * `scripts/check-budget.ts` exists to keep apart.
   */
  {
    files: ['apps/*/src/**/*.{ts,tsx}'],
    ignores: ['apps/*/src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              /*
               * `features/<boundary>/<feature>` is the index and is allowed; anything deeper
               * is that feature's private interior. A `*` does not cross a `/`, so this
               * matches exactly one segment too many and nothing else.
               */
              group: ['**/features/*/*/*'],
              message:
                'Import a feature through its index.ts, not its internals. If what you need is not exported there, decide whether it should be part of that feature’s public API.',
            },
            {
              /* The same rule for the boundary-level features, reached relatively. */
              group: [
                '../auth/*',
                '../../auth/*',
                '../../../auth/*',
                '../assessment/*',
                '../../assessment/*',
                '../../../assessment/*',
                '../admin/*',
                '../../admin/*',
                '../../../admin/*',
              ],
              message: 'Import this feature through its index.ts, not its internals.',
            },
          ],
        },
      ],
    },
  },
  {
    /* The design system may not import business capabilities. */
    files: ['apps/*/src/components/**/*.{ts,tsx}'],
    ignores: ['apps/*/src/components/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/features/**'],
              message:
                'Shared UI must not import feature code — that inverts the dependency direction. Take what you need as a prop, or move the shared state to a shared root (see apps/*/src/session/).',
            },
          ],
        },
      ],
    },
  },
  {
    /* The owner console and the customer portal stay separable. */
    files: ['apps/*/src/features/admin/**/*.{ts,tsx}'],
    ignores: ['apps/*/src/features/admin/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/features/private/**',
                '**/features/public/**',
                /* Reached relatively, which is how a sibling boundary is actually spelled. */
                '../private',
                '../private/**',
                '../../private',
                '../../private/**',
                '../public',
                '../public/**',
                '../../public',
                '../../public/**',
              ],
              message:
                'The admin console must not import customer-surface code (DECISION 021). Anything genuinely shared belongs in components/patterns/, components/ui/ or a shared root.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/*/src/features/private/**/*.{ts,tsx}'],
    ignores: ['apps/*/src/features/private/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/features/admin/**',
                '../admin',
                '../admin/**',
                '../../admin',
                '../../admin/**',
              ],
              message: 'The customer portal must not import owner-console code (DECISION 021).',
            },
          ],
        },
      ],
    },
  },

  {
    /*
     * ------------------------------------------------------------ the two frontends
     *
     * `apps/client` and `apps/admin` are two interfaces onto one system, and neither may
     * import the other. This is what makes them separately deployable to separate
     * origins, and it is the enforceable half of a security argument: two browser bundles
     * cannot trust each other, so anything one needs from the other has to travel through
     * `apps/server`, where it can actually be authorised.
     *
     * They share exactly two things, and both are packages: `@jobforge/ui` for how they
     * look and `@jobforge/shared` for what they say to the API.
     *
     * This supersedes the `admin ↔ private` rule below, which drew the same line inside a
     * single application (DECISION 021 option A). That rule stays — `apps/client` still
     * contains the customer portal, and nothing in it should reach for owner-console code
     * that no longer lives there.
     */
    files: ['apps/*/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/client/**', '**/apps/admin/**', '../../client/**', '../../admin/**'],
              message:
                'The two frontends must not import each other. Anything shared belongs in packages/ui or packages/shared; anything that needs authorising belongs behind an API route.',
            },
          ],
        },
      ],
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
