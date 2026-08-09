import type { InquiryOption } from '../types/content';
import { INQUIRY_TYPES } from '../types/api';

/*
 * Contact page and form copy.
 *
 * The form asks six things. Every extra field costs submissions, so anything that can
 * be worked out during the first reply is not asked for here.
 */

export const contactContent = {
  heading: 'Tell me about your business',
  intro:
    'Fill this in and I will get back to you directly. If you would rather talk, the phone number is at the top of the page.',

  /** Shown under the submit button. Do not promise a response time that is not agreed. */
  expectation: 'Send your request and I will get back to you directly.',

  privacyNote:
    'Your details are used to reply to this enquiry and nothing else. They are not sold, and there is no mailing list to be added to.',

  success: {
    heading: 'Message sent',
    body: 'Thanks — I have got your details and will be in touch. If it is urgent, calling is faster than waiting for a reply.',
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
  { value: INQUIRY_TYPES[1], label: 'I have a website that needs improvement' },
  { value: INQUIRY_TYPES[2], label: "I don't have a website" },
  { value: INQUIRY_TYPES[3], label: "I'm not sure yet" },
];
