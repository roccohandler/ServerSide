import { env } from '../config/env';

/*
 * ============================================================================
 * CONVERSION EVENTS — NO PROVIDER, NO TRACKING, ON PURPOSE
 * ============================================================================
 *
 * There is no analytics product installed on this site, and this file does not install
 * one. What it adds is the *seam*: the handful of moments in the funnel worth counting,
 * named once, called from the components where they happen.
 *
 * Why bother before a provider exists? Because the alternative is finding the call
 * sites later, by hand, in a form that has since been rewritten. The events are the
 * expensive part to get right; the transport is ten lines.
 *
 * ## What happens today
 *
 * In production: nothing. `track()` looks for a sink, finds none, and returns.
 * In development: a `console.debug` so the funnel can be watched while working on it.
 *
 * ## Turning it on
 *
 * Set `window.dataLayer = window.dataLayer || []` from a tag manager snippet in
 * `index.html` and every event below starts arriving. That is a deliberate choice for
 * whoever owns the business, not something this file does on their behalf — and when
 * they make it, `content/legal.ts` has to be updated too, because the privacy page
 * currently states that this site does no analytics tracking. It is true today.
 * ============================================================================
 */

/**
 * The funnel, in order. Adding a name here is cheap; renaming one is not, because the
 * name is what a report is grouped by six months from now.
 */
export type AnalyticsEvent =
  /** A call-to-action link was clicked. `location` says which one. */
  | 'cta_clicked'
  /** The visitor typed into the hero form for the first time. */
  | 'hero_form_started'
  /** Step one validated and the visitor moved to the qualification step. */
  | 'hero_form_step_completed'
  /**
   * A lead request was sent to the API. `source` says which form.
   *
   * The doc comment used to claim this fired "for the hero and the contact page". It did
   * not — `useContactForm` had no instrumentation at all, so the main contact form was the
   * one surface in the funnel that reported nothing. The comment was the only thing
   * asserting parity, and a comment is not a mechanism. Both now fire it with a `source`.
   */
  | 'lead_form_submitted'
  /** The API accepted the submission. This is the conversion. */
  | 'website_review_requested'
  /** The API rejected it, or could not be reached. `reason` carries the error code. */
  | 'lead_form_failed'
  /** The offer stack was reached. Pairs with `pricing_viewed` to show where readers stop. */
  | 'offer_viewed'
  /** The pricing block was scrolled into view — how far down the page people get. */
  | 'pricing_viewed'
  /**
   * Growth Partner was reached, separately from the project prices.
   *
   * Worth its own event: the plan sits below the build price, so the gap between this and
   * `pricing_viewed` is the share of readers who see a price and stop before learning what
   * happens after launch. If that gap is large the plan is too far down the page.
   *
   * **Renamed from `care_plans_viewed`.** The product is Growth Partner in every
   * customer-facing string, and an event name carrying the old vocabulary is how the old
   * vocabulary survives a rename — it becomes the column heading in a report and then
   * somebody writes copy to match the column. Renaming cost nothing: `track()` has no sink
   * configured, so no report exists to be regrouped. Do not rename it again once one does.
   */
  | 'growth_partner_viewed'
  /**
   * A product's call to action was clicked. `tier` carries which product, `from` the surface.
   *
   * The point is learning which product people actually reach for, and that is unanswerable
   * from a single `cta_clicked`. `tier` takes an offer id, so a new product is a new value
   * rather than a new event.
   *
   * ## `'conversion-fix'` was a value here and no longer is
   *
   * The product was withdrawn — see the header of `config/pricing.ts`. The **event name stays
   * exactly as it is**, and this note is why: event vocabulary outlives the code that fires
   * it. Any historical rows carrying `tier: 'conversion-fix'` are still real observations of
   * what a reader reached for on a day that product was on the page, and renaming or removing
   * the event would silently reinterpret them as something else. What changed is the set of
   * values in flight, which is exactly the kind of change a value-carrying event is shaped to
   * absorb without a schema migration.
   *
   * Today the only value fired is `'flagship'`. The audit's middle branch fires a plain
   * `cta_clicked` from `audit_fix` instead, because what it now offers is a free review and a
   * review is not a tier.
   */
  | 'pricing_tier_selected'
  /**
   * The Growth Partner call to action was clicked. `from` carries the surface.
   *
   * ## Why this is back
   *
   * `care_plan_selected` was declared here once, never fired, and deleted — correctly, and
   * for a reason recorded at the time: *"there is no recurring-plan call to action to fire
   * it… the card deliberately has no button of its own — a fourth identical 'get my free
   * assessment' on the same screen buys nothing."*
   *
   * That reasoning held while the plan's card had no action. The redesign gives it one, and
   * the button is deliberately not a fourth identical assessment CTA — it asks about Growth
   * Partner specifically and carries `?intent=partner` into the form, so the prospect never
   * has to re-explain what they want. The premise changed, so the event comes back.
   *
   * It comes back under the **product's** name rather than the old one. See the note on
   * `growth_partner_viewed`.
   */
  | 'growth_partner_selected'
  /**
   * The risk-reversal block was reached. Worth separating from `pricing_viewed`: if
   * readers see the price and never reach the guarantee, the guarantee is not the reason
   * they did or did not buy, and moving it up the page is the experiment to run.
   */
  | 'guarantee_viewed'
  /** A before/after demonstration was switched to its "after" state. */
  | 'demo_viewed'
  /** The PlayBook page was opened. The free resource's own top-of-funnel. */
  | 'playbook_viewed'
  /**
   * One of the six stages was reached. `stage` carries which.
   *
   * Per stage rather than per improvement: six rows tell you how far people read, and
   * twenty near-identical rows tell you the same thing while making the report worse.
   */
  | 'playbook_stage_viewed'
  /** The first category of the self-assessment was scored. */
  | 'assessment_started'
  /** All twenty were scored. `score` carries the total out of 40. */
  | 'assessment_completed'
  /**
   * The Website Revenue Audit funnel, which is the site's primary conversion path.
   *
   * Separate names from the PlayBook's `assessment_*` pair on purpose: they measure two
   * different surfaces with two different intents. Somebody scoring their site inside a
   * free guide is reading; somebody doing it on `/audit` is diagnosing. Merging them
   * would make the only number that matters — how many audits become enquiries —
   * impossible to read.
   */
  | 'audit_started'
  /** A trade was chosen. `trade` carries the slug, which is the personalisation signal. */
  | 'audit_trade_selected'
  /** All twenty categories were scored. `score` carries the total out of 40. */
  | 'audit_scored'
  /** The diagnosis was reached — the point the audit stops being a form and starts being useful. */
  | 'audit_diagnosis_viewed'
  /** At least one funnel figure was entered. The share who go this far is the qualifying signal. */
  | 'audit_funnel_entered'
  /** The audit was submitted as a lead. `trade` and `score` carry the context. */
  | 'audit_submitted'
  /**
   * An industry page was opened. `trade` carries the slug.
   *
   * The one number these five pages exist to produce: whether a page written for a single
   * trade converts better than the general homepage. Without this event the answer is
   * unknowable, because both funnels end at the same audit and the same form.
   */
  | 'industry_page_viewed'
  /**
   * `/get-my-assessment` was reached — the first screen of the account-first funnel.
   *
   * The denominator every number below is read against. DECISION 028 moved the primary
   * call to action here on the argument that a first commitment of one field beats one of
   * seven, and the only way to find out whether that was right is to watch this against
   * `assessment_account_created`.
   */
  | 'assessment_signup_viewed'
  /**
   * An account came into existence from that page. **The capture.**
   *
   * This is the number the whole change exists to create: before it, somebody who stopped
   * partway through the contact form produced no event and no record at all, so the site
   * could not distinguish "nobody wanted an assessment" from "everybody gave up on the
   * form". The gap between this and `website_review_requested` is the cost of the second
   * step, stated in people rather than in guesses.
   */
  | 'assessment_account_created'
  /** A new client submitted the onboarding form on /welcome. */
  | 'onboarding_submitted'
  /**
   * A collapsed answer was opened. `id` carries which question.
   *
   * One event for every `<details>` on the site rather than one per surface: what it
   * answers is "which objection do people actually go looking for", and that question is
   * about the question, not about the page it was on.
   */
  | 'faq_opened'
  /**
   * Somebody began an authentication attempt. `mode` is `signin` or `signup`; `method` is
   * `password` or `google`.
   *
   * **One event with two fields rather than four events.** The brief asked for
   * `auth_started`, `sign_in_selected`, `account_creation_selected` and `account_created`.
   * The first three are one moment described three ways, and the server cannot even tell
   * signup from signin on the Google path — so three names would promise a distinction the
   * system does not make. Fields answer the same questions and stay countable together.
   *
   * `account_created` is deliberately **not** here: the authoritative record is the server's
   * `account.created` activity entry, and a browser-side duplicate of a server truth is the
   * kind of event that disagrees with the database six months later.
   */
  | 'auth_started'
  /*
   * ==========================================================================
   * THE CAPABILITY EXPLORER — THREE EVENTS, NOT SEVEN
   * ==========================================================================
   *
   * The surface has four interactive controls (trade, category, availability toggle, and an
   * expander per capability) and the obvious instrumentation is one event each plus a page
   * view. That would be five names for two questions, and the two questions are the only
   * reason to instrument this page at all:
   *
   *   1. **Which capabilities do owners actually go looking for?** Answered by
   *      `capability_opened`, keyed by id. This is the valuable one: a library of forty
   *      entries is also a survey of what the market wants, and the answer should decide
   *      what gets built next.
   *   2. **Does reading this page make somebody more likely to ask for an assessment?**
   *      Answered by `capabilities_viewed` plus the existing `cta_clicked` locations, with
   *      no new event needed.
   *
   * `capability_filtered` collapses the three filter controls into one event with a
   * `control` field, for the same reason `auth_started` collapses three: they are one
   * behaviour — narrowing the list — and splitting them would make "how many people filter
   * at all" a sum across three names instead of a count of one.
   * ==========================================================================
   */
  /** The explorer was scrolled into view. `trade` carries a preselection if one arrived. */
  | 'capabilities_viewed'
  /**
   * One capability was expanded. `id` carries which, `tier` and `availability` carry what
   * kind of thing it was — so "are people opening the things they cannot buy" is answerable
   * without a second event.
   */
  | 'capability_opened'
  /**
   * A filter was changed. `control` is `trade`, `category` or `available`; `value` is what
   * it was set to.
   */
  | 'capability_filtered'
  /** Somebody asked for the complete PlayBook workbook by email. */
  | 'playbook_download_requested'
  /** The subscribe request failed. `reason` carries the error code. */
  | 'playbook_download_failed'
  /**
   * A tap-to-call. Worth its own event: the visitor leaves for the dialler and never
   * submits anything, so without this the phone looks like it produces nothing at all.
   */
  | 'phone_clicked'
  | 'email_clicked';

export type AnalyticsProperties = Readonly<Record<string, string | number | boolean>>;

interface DataLayerWindow {
  dataLayer?: unknown[];
}

/**
 * Records a funnel event.
 *
 * Never throws and never blocks: a broken analytics tag must not be able to stop
 * somebody submitting the form. Every call site treats this as fire-and-forget.
 *
 * The `cta_clicked` overload is what makes `CtaLocation` mean anything. Without it the
 * union was documentation: seven values were declared, fourteen were in use, and nothing
 * anywhere noticed — which is precisely the mess this file's opening comment warns about,
 * since `location` is the key a report is grouped by.
 */
export function track(event: 'cta_clicked', properties: { readonly location: CtaLocation }): void;
/*
 * `Exclude` rather than `AnalyticsEvent`, and it is load-bearing.
 *
 * With the general signature accepting every event, a `cta_clicked` call carrying an
 * unknown location simply failed the first overload and matched the second, which takes any
 * string record — so the constraint compiled away to nothing. Overload resolution takes the
 * first signature that fits, which means the permissive one has to stop fitting.
 */
export function track(
  event: Exclude<AnalyticsEvent, 'cta_clicked'>,
  properties?: AnalyticsProperties,
): void;
export function track(event: AnalyticsEvent, properties?: AnalyticsProperties): void {
  try {
    const sink = (window as DataLayerWindow).dataLayer;

    if (Array.isArray(sink)) {
      sink.push({ event, ...properties });
      return;
    }

    if (env.isDevelopment) {
      console.debug('[analytics]', event, properties ?? {});
    }
  } catch {
    // An analytics failure is never worth an interrupted conversion.
  }
}

/**
 * Where a call to action was clicked, so the same event can serve every placement.
 *
 * This is a controlled vocabulary rather than a free-text field, and it is enforced by the
 * `track` overload above. The alternative is a report with fourteen slightly different
 * spellings of the same button, discovered six months after the data starts arriving.
 *
 * The industry entries are template types because there is one of each per trade, and
 * `config/trades.ts` is where trades are added — not here.
 */
export type CtaLocation =
  | 'nav'
  | 'nav_mobile'
  /*
   * ==========================================================================
   * THE SECOND DOOR IN THE HEADER
   * ==========================================================================
   *
   * `nav` and `nav_mobile` are the ember button — the offer. These two are the quiet
   * "Create an account" link beside `Sign in` in the utility strip and in the collapsed
   * menu, which lands on `/signup` rather than `/get-my-assessment`.
   *
   * They are here rather than folded into `nav` because the question they answer only
   * exists if they are separate: **does a door with no offer painted on it produce
   * accounts the offer button was not producing?** DECISION 028's bet was that framing
   * the account as the assessment converts better; DECISION 031's is that some people
   * want an account and read an offer button as not for them. Both can be true, and the
   * only way to find out how much is to count them apart.
   *
   * Underscored to match `nav`/`nav_mobile` rather than hyphenated to match
   * `demo-finished`. This file has both spellings, which is not ideal — but the nav
   * family is the one a report will group these with, and matching the neighbours you
   * will be summed against beats matching a global convention that does not exist.
   * ==========================================================================
   */
  | 'nav_signup'
  | 'nav_signup_mobile'
  | 'hero'
  | 'pricing'
  | 'services-pricing'
  | 'review'
  | 'review-sample'
  | 'demo'
  /* The bridge under the before/after mocks: "the finished version exists" → examples. */
  | 'demo-finished'
  | 'final'
  | 'playbook'
  | 'playbook-success'
  | 'teardown-review'
  | 'qualification-exception'
  | 'qualification-playbook'
  /* The teardown's third beat: "these principles, fully built" → the hvac demo. */
  | 'teardown-built'
  /*
   * The secondary action on the "which situation are you in" chooser, for a reader who
   * cannot place themselves in any of the three and would rather be told which they are.
   * Separate from `review` because the question it answers is different: `review` is
   * somebody accepting a free diagnosis, this is somebody declining to self-diagnose.
   */
  | 'paths-unsure'
  /*
   * ==========================================================================
   * THE TWO SURFACES THAT USED TO REPORT A PRODUCT AND NOW REPORT A STEP
   * ==========================================================================
   *
   * The chooser's middle card and the audit's middle branch both used to fire
   * `pricing_tier_selected` with `tier: 'conversion-fix'` — correctly, while there was a
   * product to name. It is withdrawn (see `config/pricing.ts`), and what both now offer is a
   * free review of the real site, which is a step rather than a tier.
   *
   * They stay **two values rather than one**, for the reason they were two before: the
   * reader arriving at each has told us something different. `paths-review` is somebody who
   * placed themselves in "my site is losing people" from a homepage card. `audit-fix` is
   * somebody who scored their own website against twenty checks and landed in the 65–85%
   * band. The second is enormously better qualified, and collapsing them would hide exactly
   * that difference.
   *
   * Hyphenated, matching `audit-keep` and `paths-unsure` beside them.
   * ==========================================================================
   */
  | 'paths-review'
  | 'audit-fix'
  /*
   * The audit's "leave it alone" branch. The one CTA on the site attached to a
   * recommendation not to buy anything, which makes it the one worth watching: if nobody
   * clicks it the branch is decoration, and the honest recommendation is not landing.
   */
  | 'audit-keep'
  /*
   * The capability explorer's two exits.
   *
   * `capabilities-close` is the section that says a list cannot tell you which ones you
   * need. `capabilities-generic` is narrower and more interesting: it is the CTA a reader
   * sees only when the library has nothing written for their kind of business, so clicks on
   * it are a direct signal about which trade to write for next.
   */
  | 'capabilities-close'
  | 'capabilities-generic'
  | `industry-${string}-hero`
  | `industry-${string}-offer`
  | `industry-${string}-close`
  /*
   * The demonstration sites. `-back` is somebody leaving, `-cta` is somebody converting
   * from inside one, and the trade is in the string because which trade's demo produces
   * enquiries is the only question five of them exist to answer.
   */
  | `demo-${string}-back`
  | `demo-${string}-cta`;
