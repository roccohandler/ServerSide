import { defineConfig } from 'vitest/config';

/**
 * Root test runner. The two workspaces need different environments (node vs. jsdom),
 * so each owns its own config and this file just runs both together.
 */
export default defineConfig({
  test: {
    projects: ['client/vitest.config.ts', 'server/vitest.config.ts'],
  },
});
