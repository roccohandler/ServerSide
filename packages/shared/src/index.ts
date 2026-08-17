/*
 * ============================================================================
 * THE CONTRACT BOTH FRONTENDS SPEAK
 * ============================================================================
 *
 * `apps/client` and `apps/admin` are two interfaces onto one system, and neither talks to
 * the other. They talk to `apps/server`, and this package is the vocabulary that
 * conversation uses: request and response shapes, the enums a route will accept, and the
 * capability strings authorisation is expressed in.
 *
 * ## What belongs here
 *
 * Anything **both** applications need in order to speak to the API, and nothing else.
 * That is a deliberately narrow bar. This package is not a dumping ground for "things that
 * felt shared" — a type only the customer portal uses lives in the customer portal, where
 * deleting it is somebody's ordinary Tuesday rather than a cross-package change.
 *
 * ## What must never belong here
 *
 * **No secrets, and no enforcement.** Everything in this package is compiled into two
 * browser bundles and is readable by anybody who opens dev tools. The capability strings
 * below let a frontend decide *what to render*; they decide nothing about what is
 * *allowed*. The server checks the same capabilities again, from the session, on every
 * request — and that second check is the only one that is load-bearing. A frontend that
 * hides a button has improved the UI; a frontend that "prevents" an action has done
 * nothing at all.
 *
 * ## Why it is source rather than a build artefact
 *
 * `main` points at TypeScript. Both consumers are bundled by Vite and the server is
 * compiled by tsc, so every consumer already has a TypeScript toolchain — shipping a
 * `dist/` here would add a build step, a stale-output failure mode and nothing else.
 * ============================================================================
 */

export * from './api.js';
