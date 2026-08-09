/*
 * ============================================================================
 * PLACEHOLDER LEGAL PAGES — NOT REVIEWED BY A LAWYER
 * ============================================================================
 *
 * These exist because the contact form collects personal information and a site that
 * does that should say what happens to it. What is written below is a plain-English
 * description of what this application actually does — nothing more.
 *
 * It is NOT a privacy policy, it is NOT legal advice, and it makes no claim that any
 * particular law has been complied with. Have both pages written or reviewed properly
 * before the site handles real enquiries.
 * ============================================================================
 */

export const legalNotice =
  'Placeholder text. These pages describe how the site currently works and have not been reviewed by a lawyer. Replace them before launch.';

export const privacyContent = {
  heading: 'Privacy',
  intro:
    'This page describes what happens to the information you send through this website. It is written in plain English and reflects how the site actually works today.',
  sections: [
    {
      id: 'what',
      heading: 'What is collected',
      body: 'Only what you type into the contact form: your name, your business name, your email address, your phone number, your website address if you give one, what you need help with, and any message you write. Nothing else is collected, and there is no analytics or advertising tracking on this site.',
    },
    {
      id: 'why',
      heading: 'Why it is collected',
      body: 'To reply to your enquiry and, if we end up working together, to carry out that work. It is not used for anything else.',
    },
    {
      id: 'where',
      heading: 'Where it goes',
      body: 'Your submission is stored in a database and emailed to the business owner so it is not lost. It is not sold, rented or shared with anyone else, and there is no mailing list.',
    },
    {
      id: 'how-long',
      heading: 'How long it is kept',
      body: '[DATA_RETENTION_POLICY]',
    },
    {
      id: 'rights',
      heading: 'Asking for a copy or a deletion',
      body: 'Email or call using the details on the contact page and ask. Your enquiry will be sent to you or deleted.',
    },
  ],
} as const;

export const termsContent = {
  heading: 'Terms',
  intro:
    'Placeholder terms of use for this website. Terms for actual project work are agreed separately and in writing before anything starts.',
  sections: [
    {
      id: 'site',
      heading: 'Using this website',
      body: 'The information on this site is provided to describe the services offered. It is not a quote, an offer, or a contract.',
    },
    {
      id: 'examples',
      heading: 'The examples shown',
      body: 'Anything on this site labelled as a demonstration was built to show an approach. Demonstrations are not client work and are not presented as such.',
    },
    {
      id: 'work',
      heading: 'Project work',
      body: '[PROJECT_TERMS] Scope, price, timeline and ownership are agreed in writing before any project begins.',
    },
    {
      id: 'contact',
      heading: 'Questions',
      body: 'Use the contact details on this site.',
    },
  ],
} as const;
