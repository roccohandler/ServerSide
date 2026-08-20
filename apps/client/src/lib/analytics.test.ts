import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyticsEnabled } from '../config/env';
import { privacyContent } from '../content/legal';
import { loadAnalytics, track } from './analytics';

/*
 * ============================================================================
 * ANALYTICS IS OFF UNLESS IT IS CONFIGURED, AND THE PRIVACY PAGE AGREES EITHER WAY
 * ============================================================================
 *
 * DECISION 039. Two properties, and the second is the one that actually needed a test.
 *
 *   1. **Unconfigured means nothing happens.** No script tag, no request, no events. Under
 *      Vitest neither environment variable is set, so this suite runs in the unconfigured
 *      state — which is the state every developer machine and every unconfigured deploy is
 *      in, and therefore the one worth pinning.
 *   2. **The privacy page describes the build it is part of.** That was a promise made by a
 *      comment for as long as this file has existed: "the moment a provider is wired in, this
 *      page has to change in the same commit". A comment is not a mechanism. The section is
 *      generated from `analyticsEnabled()` now, and this asserts the two cannot disagree — in
 *      whichever direction the configuration happens to be.
 *
 * The second property is not a nicety. The privacy page is what the signup form links to as
 * the notice being agreed to, so a page describing analytics that are not running — or, far
 * worse, denying analytics that are — is a false statement of fact rather than stale copy.
 * ============================================================================
 */

afterEach(() => {
  vi.restoreAllMocks();
  document.head.querySelectorAll('script[data-analytics]').forEach((node) => node.remove());
  delete (window as { plausible?: unknown }).plausible;
  delete (window as { dataLayer?: unknown }).dataLayer;
});

describe('the analytics seam', () => {
  it('is off under test, which is what the rest of this file assumes', () => {
    expect(analyticsEnabled()).toBe(false);
  });

  it('injects no script when no provider is configured', () => {
    loadAnalytics();
    expect(document.head.querySelector('script[data-analytics]')).toBeNull();
  });

  /*
   * The whole point of the seam: a broken or absent analytics product must never be able to
   * stop somebody submitting a form. `track` swallows everything, and every call site treats
   * it as fire-and-forget.
   */
  it('never throws, whatever it is given and whatever is missing', () => {
    expect(() => track('audit_started')).not.toThrow();
    expect(() => track('cta_clicked', { location: 'hero' })).not.toThrow();
  });

  /*
   * The `dataLayer` branch is kept rather than replaced. A tag manager is still a legitimate
   * thing for the owner to add later, and it is what the events fired into for the whole
   * period before a provider existed.
   */
  it('still feeds a dataLayer when something else has created one', () => {
    const layer: unknown[] = [];
    (window as { dataLayer?: unknown[] }).dataLayer = layer;

    track('pricing_viewed', { location: 'pricing-page' });

    expect(layer).toEqual([{ event: 'pricing_viewed', location: 'pricing-page' }]);
  });

  /*
   * ==========================================================================
   * THE PAGE AND THE BUILD SAY THE SAME THING
   * ==========================================================================
   *
   * Asserted in both directions rather than against the current state, so this test is
   * still meaningful on the day somebody sets the environment variables — which is precisely
   * the day the old, comment-based arrangement would have failed.
   * ==========================================================================
   */
  it('publishes the privacy paragraph that matches the build', () => {
    const tracking = privacyContent.sections.find((section) => section.id === 'tracking');
    expect(tracking, 'the privacy page no longer has a tracking section').toBeDefined();

    const body = tracking?.body ?? '';

    if (analyticsEnabled()) {
      expect(body, 'analytics are running and the page still denies them').not.toMatch(
        /^There is none\./,
      );
      // Naming the absence of cookies is the specific claim being made, so it is the one pinned.
      expect(body.toLowerCase()).toContain('sets no cookies');
    } else {
      expect(body, 'no analytics are configured and the page describes some').toMatch(
        /^There is none\./,
      );
    }
  });

  /*
   * The `what is collected` section makes the same claim from the other end, and it is the
   * one most likely to be missed: it ends with a sentence about whether anything watches
   * which pages you look at. Both halves of the page have to move together or the page
   * contradicts itself in two paragraphs.
   */
  it('keeps the collection summary in step with the tracking section', () => {
    const what = privacyContent.sections.find((section) => section.id === 'what');
    const body = what?.body ?? '';

    if (analyticsEnabled()) {
      expect(body).not.toContain('nothing watches which pages you look at');
    } else {
      expect(body).toContain('nothing watches which pages you look at');
    }
  });
});
