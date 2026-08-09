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
    },
  }),
);
