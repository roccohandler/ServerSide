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
  /** A lead request was sent to the API. Fires for the hero and the contact page. */
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
   * The recurring plan was reached, separately from the project prices.
   *
   * Worth its own event: the plan sits below the project tiers, so the gap between this
   * and `pricing_viewed` is the share of readers who see a price and stop before learning
   * what happens after launch. If that gap is large the plan is too far down the page.
   */
  | 'care_plans_viewed'
  /**
   * A project tier's call to action was clicked. `tier` carries which one.
   *
   * The whole point of three tiers is learning which one people actually reach for, and
   * that is unanswerable from a single `cta_clicked`. If nobody ever clicks Foundation it
   * is not an entry point, it is an anchor — and that is a pricing decision, not a copy
   * one.
   */
  | 'pricing_tier_selected'
  /*
   * `care_plan_selected` was declared here and never fired, because there is no
   * recurring-plan call to action to fire it: the plan is not separately purchasable, it
   * starts after launch, and the card deliberately has no button of its own — a fourth
   * identical "get my free assessment" on the same screen buys nothing.
   *
   * Deleted rather than kept "for later". A declared event nothing emits looks exactly like
   * an event nobody triggers once a provider is connected, which is the worst of both. What
   * the plan actually needs measuring is whether readers reach it, and `care_plans_viewed`
   * carries a `location` so the homepage and the services page stay separable.
   */
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
  | 'hero'
  | 'pricing'
  | 'services-pricing'
  | 'review'
  | 'review-sample'
  | 'demo'
  | 'final'
  | 'playbook'
  | 'playbook-success'
  | 'teardown-review'
  | 'qualification-playbook'
  | 'qualification-exception'
  | `industry-${string}-hero`
  | `industry-${string}-offer`
  | `industry-${string}-close`;
