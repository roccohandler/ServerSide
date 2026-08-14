import { createApp } from '@jobforge/server';

/*
 * Vercel serverless entry point.
 *
 * This is the only file in the repository that knows the application is deployed to
 * Vercel, and it contains no business logic whatsoever — it builds the same Express app
 * that `npm run dev` and `npm start` use, and hands it over as the request handler.
 *
 * That is what keeps the backend portable: moving to Railway, Render or a plain VPS
 * means running `server/dist/server.js` and deleting this file. Nothing else changes.
 *
 * The app is created once per cold start and reused across invocations. Nothing here
 * opens a database connection — the lead repository connects lazily and caches the
 * connection, which is the right behaviour for a function that may never be called.
 *
 * `vercel.json` rewrites every `/api/*` request here, so Express sees the original path
 * and its own router does the matching.
 */
export default createApp();
