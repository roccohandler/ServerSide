import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

/*
 * Test configuration, kept out of `vite.config.ts` so that the production build never
 * has to resolve `vitest`. It reuses the build config so tests run against the same
 * plugins and resolution rules the real bundle uses.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      name: 'client',
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      /*
       * Vitest defaults to 5 seconds, which is not enough for this suite.
       *
       * Both scoring instruments — the PlayBook's self-assessment and the audit — are
       * driven the way a person drives them, by clicking twenty radio groups in sequence
       * through `userEvent`. Each click is a real event with real focus handling in jsdom,
       * and twenty of them takes several seconds on their own; a test that then reads the
       * resulting diagnosis is comfortably past the default.
       *
       * These were passing by a margin of milliseconds before the audit was added, which
       * is not a margin worth defending. Raising the ceiling is the honest fix — the
       * alternative is reaching into the hooks to set scores directly, which would stop
       * the tests proving the thing they exist to prove: that the instrument is operable.
       */
      testTimeout: 30_000,
    },
  }),
);
