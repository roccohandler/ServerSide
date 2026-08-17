/**
 * The demonstration entry point.
 *
 * Named `promo` on the client and `demo` on the server, deliberately:
 * `features/public/demo` is already the five marketing demonstration *sites*, and two things
 * called demo in one bundle is how a reader learns to check both every time.
 *
 * The tester names, the tour and the four endpoint wrappers are **not** here. They live in
 * `config/demo.ts` and `lib/demoApi.ts`, because the demo layer inside the application is a
 * component and `components/` may never import `features/` — ESLint fails the build on it.
 * Putting shared things in a shared root rather than reaching across is the rule that
 * boundary exists to enforce, and `session/` is its worked example.
 */
export { PromoPage } from './PromoPage';
