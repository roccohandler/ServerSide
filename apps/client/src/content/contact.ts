import type { InquiryOption } from '../types/content';
import { INQUIRY_TYPES } from '@jobforge/shared';

/*
 * Contact page and form copy.
 *
 * The form asks seven things, two of them optional. Every extra field costs submissions,
 * so anything that can be worked out during the first reply is not asked for here.
 *
 * (`heroForm` below asks six — it drops the free-text message, because somebody filling in
 * a form on the first screen has not yet decided what they want to say.)
 */

export const contactContent = {
  heading: 'Tell us about your business',
  intro:
    'Send this and we will look at what you have now, then come back with what we would change first — free, and with no obligation. If you would rather talk it through, the phone number is at the top of the page.',

  /** Shown under the submit button. Do not promise a response time that is not agreed. */
  expectation: 'Send your request and we will get back to you directly.',

  privacyNote:
    'Your details are used to reply to this enquiry and nothing else. They are not sold, and there is no mailing list to be added to.',

  success: {
    heading: 'Message sent',
    body: 'Thanks — we have got your details and will be in touch. If it is urgent, calling is faster than waiting for a reply.',
  },

  failure: {
    heading: 'That did not send',
    body: 'Something went wrong on our end and your message was not delivered. Please try again in a moment, or use the phone number or email address below — those always work.',
  },

  errorSummary: {
    heading: 'Please check the following before sending',
  },

  fields: {
    name: { label: 'Your name', autoComplete: 'name' },
    businessName: { label: 'Business name', autoComplete: 'organization' },
    email: { label: 'Email', autoComplete: 'email' },
    phone: { label: 'Phone', autoComplete: 'tel', hint: 'The best number to reach you on.' },
    website: {
      label: 'Current website',
      optionalLabel: 'optional',
      autoComplete: 'url',
      hint: 'If you have one. Leave blank if you do not.',
      placeholder: 'example.com',
    },
    inquiryType: { label: 'What do you need help with?' },
    message: {
      label: 'Anything else',
      optionalLabel: 'optional',
      hint: 'What is prompting this, or what you would like the site to do.',
    },
  },

  submit: {
    idle: 'Send request',
    pending: 'Sending…',
  },
} as const;

/*
 * Option labels can be reworded freely. The `value` slugs are the API contract and must
 * stay in sync with INQUIRY_TYPES — `contact.content.test.ts` asserts exactly that.
 */
export const inquiryOptions: readonly InquiryOption[] = [
  { value: INQUIRY_TYPES[0], label: 'I need a new website' },
  { value: INQUIRY_TYPES[1], label: 'My website is outdated or not bringing in work' },
  { value: INQUIRY_TYPES[2], label: 'I need someone to manage the website I have' },
  { value: INQUIRY_TYPES[3], label: "I don't have a website yet" },
  { value: INQUIRY_TYPES[4], label: "I'm not sure what needs fixing" },
];

/*
 * The hero form.
 *
 * Two steps, six questions, and the second step is where all but three of them live.
 * The split is the whole point: a visitor who already knows they want the assessment should
 * be able to start it in the time it takes to read the headline, and answer the useful
 * questions once they are already committed.
 *
 * Nothing here promises a response time. The business has not set one, and a made-up
 * "within 24 hours" is a promise somebody has to keep at 11pm on a Sunday.
 */
export const heroForm = {
  heading: "Let's see where your website can improve",
  intro: 'Three details to start. No obligation.',

  stepLabels: ['About you', 'About your website'],
  /** Rendered as "Step 1 of 2" — announced to screen readers when the step changes. */
  stepCounter: (current: number, total: number) => `Step ${current} of ${total}`,

  fields: {
    firstName: { label: 'First name', autoComplete: 'given-name' },
    businessName: {
      label: 'Business name',
      autoComplete: 'organization',
      placeholder: 'e.g. Cascade Heating & Air',
    },
    email: { label: 'Email', autoComplete: 'email', hint: 'Where we will send the assessment.' },
    phone: {
      label: 'Phone',
      autoComplete: 'tel',
      hint: 'In case it is quicker to talk it through.',
    },
    website: {
      label: 'Your website',
      optionalLabel: 'optional',
      autoComplete: 'url',
      placeholder: 'example.com',
      hint: 'Leave this blank if you do not have one yet.',
    },
    inquiryType: { label: 'What is the biggest problem with your website right now?' },
  },

  next: 'Continue',
  back: 'Back',
  submit: { idle: 'Get my free website assessment', pending: 'Sending…' },

  reassurance:
    'No obligation. We will look at your website the way a customer would and show you the biggest opportunities we see.',

  errorSummary: { heading: 'Please check the following' },

  success: {
    heading: "You're in.",
    body: 'We will review what you sent and follow up using the contact details you gave us. If it is urgent, calling is faster than waiting for a reply.',
    actionLabel: 'See how the service works',
  },

  failure: {
    heading: 'That did not send',
    body: 'Your request has not been submitted yet, and nothing you typed has been lost. Try again, or use the phone number or email address below — those always work.',
  },
} as const;
