import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/*
 * The design system is consumed as source, not as a build artefact — both applications
 * bundle it themselves. This config exists only so the package's own tests run with the
 * same JSX transform and CSS-Modules resolution its consumers use.
 */
export default defineConfig({
  plugins: [react()],
});
