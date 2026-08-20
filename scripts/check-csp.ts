import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/*
 * ============================================================================
 * THE INLINE SCRIPT AND THE POLICY THAT ALLOWS IT AGREE
 * ============================================================================
 *
 * Both applications ship one inline `<script>`: six lines that read the reader's saved
 * theme and stamp it on `<html>` before the first paint. It has to be inline — an external
 * file is a blocking request ahead of first paint, which is worse than the flash it would
 * prevent — and both `vercel.json` policies say `script-src 'self'`, which blocks inline
 * scripts outright.
 *
 * The way through is a `'sha256-…'` source expression: the browser runs an inline script
 * whose digest the policy names, and continues to block every other one. That keeps the
 * mitigation and buys the paint.
 *
 * ## Why this file exists
 *
 * Because the digest is over the script's *exact bytes*, and nothing else in the toolchain
 * knows the two are related. Reindent the script, change a variable name, let Prettier
 * reflow a comment inside it — and the hash in `vercel.json` stops matching. What happens
 * then is the worst shape of failure this repository has a name for:
 *
 *   - Every test passes. Every build passes. `npm run verify` is green.
 *   - Locally, `vite dev` serves no CSP header at all, so the theme works perfectly.
 *   - In production the browser refuses the script, silently, and the *only* symptom is
 *     that a reader who chose a theme sees the other one for one frame — or, on a light
 *     system with dark chosen, sees light until React boots.
 *   - The violation is reported to a `report-uri` this project does not have, and appears
 *     in a console nobody is looking at.
 *
 * So the digest is recomputed here, from the built HTML that is actually served, and
 * compared against the policy that is actually deployed. It runs after `build` in
 * `npm run verify`.
 *
 * ## It also asserts the two applications carry the same script
 *
 * They do today, deliberately: one script, one digest, one thing to get right. If they ever
 * genuinely need to differ, this check is where that decision gets made explicitly rather
 * than by one of them drifting.
 * ============================================================================
 */

const root = resolve(import.meta.dirname, '..');

interface Target {
  readonly name: string;
  readonly html: string;
  readonly policy: string;
}

const TARGETS: readonly Target[] = [
  { name: 'customer application', html: 'apps/client/dist/index.html', policy: 'vercel.json' },
  { name: 'owner console', html: 'apps/admin/dist/index.html', policy: 'apps/admin/vercel.json' },
];

/**
 * Inline scripts the browser will actually execute.
 *
 * `src=` is excluded because an external script is covered by `'self'`, and any `type=` is
 * excluded because the only one in these documents is `application/ld+json` — structured
 * data, which is inert, is not script, and is not hashed by any CSP implementation. A
 * regex rather than an HTML parser, for the reason `check-budget.ts` gives at greater
 * length: this reads output generated from a template in this repository, and a parser
 * dependency would be a strange thing to add to a script that guards against surprises.
 */
function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*\btype=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(([, body]) => body ?? '')
    .filter((body) => body.trim().length > 0);
}

const digest = (body: string) =>
  `sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}`;

const failures: string[] = [];
const digests = new Set<string>();

for (const target of TARGETS) {
  let html: string;
  try {
    html = readFileSync(resolve(root, target.html), 'utf8');
  } catch {
    failures.push(
      `${target.name}: ${target.html} is missing. This check runs after a build — ` +
        `run \`npm run build\` first.`,
    );
    continue;
  }

  const scripts = inlineScripts(html);

  if (scripts.length !== 1) {
    failures.push(
      `${target.name}: expected exactly one executable inline script in ${target.html}, ` +
        `found ${scripts.length}. Every one of them needs its own hash in the policy, and ` +
        `this check only knows how to reason about one.`,
    );
    continue;
  }

  const expected = digest(scripts[0] ?? '');
  digests.add(expected);

  const policy = readFileSync(resolve(root, target.policy), 'utf8');
  const scriptSrc = policy.match(/script-src ([^;"]+)/)?.[1] ?? '';

  if (!scriptSrc.includes(`'${expected}'`)) {
    failures.push(
      `${target.name}: ${target.policy} does not allow the inline theme bootstrap.\n` +
        `  script-src is: ${scriptSrc.trim()}\n` +
        `  it needs:      '${expected}'\n` +
        `  The script in index.html changed; paste that hash into script-src.`,
    );
  }
}

if (digests.size > 1) {
  failures.push(
    `The two applications ship different inline bootstraps (${digests.size} distinct ` +
      `digests). They are meant to be byte-identical — see the note at the top of this file.`,
  );
}

/*
 * ============================================================================
 * THE ANALYTICS HOST AND THE POLICY THAT ALLOWS IT
 * ============================================================================
 *
 * The second pair in this repository that nothing but a guard knows about, and it fails in
 * the same shape as the first: `VITE_ANALYTICS_SRC` names a host, `vercel.json` allows a
 * host, and if the two stop agreeing the browser refuses the script silently.
 *
 * Every test passes, every build passes, `vite dev` serves no CSP at all so it works
 * perfectly locally — and in production the analytics simply record nothing. Which is
 * indistinguishable, from a dashboard, from a site nobody visited. That is a considerably
 * worse failure than the theme one: a flash of the wrong palette is visible to anybody who
 * looks, and an empty analytics dashboard looks exactly like a correct analytics dashboard on
 * a quiet week.
 *
 * Only checked when a provider is configured. A build with no analytics has nothing to
 * disagree about, and demanding a host in the policy for a script that will never load would
 * be widening the policy to satisfy a guard.
 * ============================================================================
 */
const analyticsSrc = process.env['VITE_ANALYTICS_SRC']?.trim();

if (analyticsSrc) {
  let origin: string | undefined;
  try {
    origin = new URL(analyticsSrc).origin;
  } catch {
    failures.push(
      `VITE_ANALYTICS_SRC is not a URL: ${analyticsSrc}. It has to be the full URL of the ` +
        `provider's script, because the CSP is matched on its origin.`,
    );
  }

  if (origin) {
    const policy = readFileSync(resolve(root, 'vercel.json'), 'utf8');
    const directives = ['script-src', 'connect-src'];

    for (const directive of directives) {
      const value = policy.match(new RegExp(`${directive} ([^;"]+)`))?.[1] ?? '';
      if (!value.includes(origin)) {
        failures.push(
          `vercel.json: ${directive} does not allow ${origin}.\n` +
            `  ${directive} is: ${value.trim()}\n` +
            `  Analytics is configured to load from ${analyticsSrc}, so the browser would ` +
            `refuse it — and the only symptom is a dashboard that stays empty.`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`\n[csp] ${failures.length} problem(s):\n`);
  for (const failure of failures) console.error(`  - ${failure}\n`);
  process.exit(1);
}

console.log(`[csp] inline theme bootstrap allowed by both policies (${[...digests][0]})`);
