import type { Testimonial } from '../types/content';

/*
 * ============================================================================
 * REAL CUSTOMER WORDS ONLY — THE LIST IS EMPTY ON PURPOSE
 * ============================================================================
 *
 * This is a new business with no customers yet, so there are no testimonials. The array
 * below is empty rather than filled with invented quotes, and the section that renders
 * it disappears entirely while it stays empty. `content/trust.ts` says so out loud on
 * the page, which is the only version of this that survives a customer asking around.
 *
 * When there is a real one, add it here with the customer's permission and their actual
 * words. Do not paraphrase a compliment into a quote, do not invent an initial and a
 * town, and do not attribute anything to "a Seattle HVAC company" that did not say it.
 * ============================================================================
 */
export const testimonials: readonly Testimonial[] = [];

export const testimonialsSection = {
  eyebrow: 'In their words',
  heading: 'What customers say',
} as const;
