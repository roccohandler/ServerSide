import { prices } from './offer';
import type { FaqItem } from '../types/content';

/*
 * How many improvements the PlayBook contains.
 *
 * This was `playbook.principles.length`, which cannot go stale — and which imported the
 * entire PlayBook, roughly a thousand lines of copy, into the eager bundle for the sake of
 * one integer. `faq.ts` is rendered on the homepage; `/playbook` is a lazy route. One
 * convenience undid the code splitting for every visitor who never opens it.
 *
 * So it is a literal again, and `content.test.ts` asserts it equals
 * `playbook.principles.length`. Tests are not bundled, so the guard is free — and it is
 * exactly as strong as the import was: the number cannot drift without failing the build.
 * That is the general rule for this layer, written up in `content/industryMeta.ts`.
 */
const principleCount = 20;

/*
 * The objections a service-business owner raises before making contact, answered in the
 * order they tend to come up.
 *
 * Three rules:
 *
 *   1. Every number here comes from `prices` in `content/offer.ts`. Nothing states a
 *      figure of its own — an FAQ answer written six months from now with a hand-typed
 *      price in it is exactly the contradiction `content.test.ts` exists to catch.
 *   2. No answer promises a ranking, a lead volume or a result. The honest answer to
 *      "do you guarantee Google rankings" is the most persuasive thing on this list,
 *      which is why it is on it.
 *   3. Where the answer is unflattering, it is still the answer. "Often you do not need
 *      a new website" costs a sale occasionally and buys the credibility that makes the
 *      other nineteen answers worth reading.
 */
export const faqItems: readonly FaqItem[] = [
  /* ---------------------------------------------------------------- money */

  {
    id: 'cost',
    question: 'What does it cost?',
    answer: `The project starts at ${prices.from} and most businesses need the middle tier, which is ${prices.launch} at founding-client pricing against a standard price of ${prices.launchStandard}. Which one you need depends on how much of the work your current site already does — that is what the free assessment is for. After launch, keeping it maintained and improving is ${prices.managementDisplay}, and it is a separate decision you make afterwards rather than a condition of the project. Every figure is in writing before any work starts, and none of them moves unless you ask for something different.`,
  },
  {
    id: 'founding-price',
    question: 'Why is the price lower than the standard price?',
    answer: `Because this is a new practice and it needs published work more than it needs full margin on the first projects. Founding-client pricing is available on a limited number of projects in exchange for permission to document the work as a case study — the before, the reasoning, and what changed after launch. That is the whole trade. The standard price is what the work is priced at outside that offer; it is not a price anybody paid in the past, and there is no deadline attached to any of this. When the founding projects are taken, the standard price is simply the price.`,
  },
  {
    id: 'launch-includes',
    question: 'What is actually included in the project?',
    answer:
      'Research before design starts — your competitors, and how someone actually decides who to call. Then a custom, mobile-first website built around the services you sell, with a page for each one, written for what people search. Quote requests designed as a funnel rather than a form. Proof placed where the decision happens. The technical search foundation, analytics and conversion tracking configured properly, and launch QA against a published standard. The larger tiers add service-area pages, multi-step funnels and integration with the tools you already run the business on. Not a template with your logo dropped into it.',
  },
  {
    id: 'management-includes',
    question: `What is included in the ${prices.managementDisplay} after launch?`,
    answer:
      'Hosting, certificates, backups, security updates, uptime and form-delivery monitoring, and bug fixes — the floor. On top of that: content, service and photo changes when you ask, four seasonal refreshes a year, up to one campaign landing page and two campaign copy alignments a month, ongoing conversion and user-experience improvements, A/B testing where your traffic supports a meaningful result, measurement explained in plain English, and the 24-hour response guarantee. Hosting and domain renewals are inside that number, not billed separately.',
  },
  {
    id: 'contract',
    question: 'Is there a contract?',
    answer: `There is a written agreement, which is different from being locked in. Management has a three-month minimum, because ninety days is roughly what it takes to launch, watch what visitors actually do, and start fixing the parts that are losing you work. After that it is month-to-month and you can stop with 30 days' notice. No annual contract, and nothing that renews itself while you are not looking.`,
  },
  {
    id: 'payment',
    question: 'How does payment work?',
    answer: `Half the project fee to start and half on the day it goes live — on the middle tier that is ${prices.deposit} and ${prices.deposit}. If you take the ongoing plan, it begins on launch day rather than before, so you are never paying to look after a website that does not exist yet.`,
  },
  {
    id: 'after-launch',
    question: 'What happens after my website launches?',
    answer:
      'It becomes my job rather than yours. Hosting, certificates, backups, security updates, monitoring and bug fixes are handled, the site gets kept current as your business changes, and I keep working on the pages and calls to action that bring in enquiries. You do not get handed a login and left to it, which is what happens at the end of most website projects and is the single biggest reason websites stop earning.',
  },
  {
    id: 'management-optional',
    question: 'Do I have to take the monthly management?',
    answer:
      'It is how this is designed to work, and it is not something I will force on you. The launch and the management are sold as one system because a website that nobody looks after starts losing to one that somebody does, usually within a year. If you would genuinely rather take the site and run it yourself, say so up front and we will scope it that way — I would rather be told than have you sign up to something you did not want.',
  },

  /* ---------------------------------------------------------------- timing */

  {
    id: 'timeline',
    question: 'How long does the website take?',
    answer:
      'Two to four weeks from the point I have what I need from you — your service list, your business details, and photos of your own finished work. The build is rarely the slow part; waiting on those three things usually is. I will tell you exactly what I need up front so it does not stall halfway through.',
  },

  /* ---------------------------------------------------------------- existing site */

  {
    id: 'existing-site',
    question: 'What happens if I already have a website?',
    answer:
      'Often you do not need a new one. Plenty of sites need a faster load, a visible phone number and a contact form that actually delivers rather than a rebuild — and if yours is one of them I will tell you, because it is cheaper for you and it is the job that is actually needed. A fix like that is quoted per site rather than at the launch price, and then it joins the monthly service like anything else.',
  },
  {
    id: 'manage-existing',
    question: 'Can you manage a website you did not build?',
    answer:
      'Yes. It starts with a one-time onboarding — I audit what is there, fix what needs fixing and get it to a standard I am willing to stand behind, which is quoted once I have seen it. After that it joins the monthly service on the same terms as anything I built myself, response guarantee included. What I will not do is take over a site, charge you monthly and quietly hope nothing breaks.',
  },
  {
    id: 'domain',
    question: 'Can you work with my existing domain?',
    answer:
      'Yes, and you should keep it. Changing domains throws away whatever search history and recognition the old one has. I point the existing domain at the new site and set up redirects from the old pages, so existing links, directory listings and anything Google already knows about keep working.',
  },

  /* ---------------------------------------------------------------- ownership */

  {
    id: 'ownership',
    question: 'Do I own my website?',
    answer:
      'Yes. The domain, the hosting account and the content are registered in your name from the start, not transferred to you later if you ask nicely. I pay those bills while I am managing it and I am the one who logs in — but managed by me does not mean owned by me, and it never has.',
  },
  {
    id: 'cancel',
    question: 'What happens if I cancel?',
    answer: `You keep the website. The domain, hosting and content are already yours, so there is nothing to hand back — the payment method on those accounts moves to you and the site carries on. Landing pages built for your campaigns stay part of your website. Any running A/B test gets closed out with the winning version left live, so you never inherit a site quietly serving two versions of itself. If you prepaid a year, the unused months are refunded at the ${prices.management} monthly rate.`,
  },
  {
    id: 'knowledge',
    question: 'Do I need to know anything about websites?',
    answer:
      'No. I handle the technical work — hosting, security, updates, tracking, all of it. What I need from you is the information and the decisions only you can give: what you do, where you work, how you charge, and photos of your own finished jobs.',
  },

  /* ---------------------------------------------------------------- what I will not promise */

  {
    id: 'ads',
    question: 'Do you manage Google Ads?',
    answer:
      'No. I do not run your ads, set your budgets or manage your bidding, and I will not pretend otherwise to win the work. What I do is make the page your advert points at say what the advert promised — same offer, same words, same next step — which is the part most people paying for clicks are quietly losing money on.',
  },
  {
    id: 'more-leads',
    question: 'Do you guarantee leads?',
    answer:
      'No. That is the goal and it is not something anybody can promise you. What I promise is the work: making your website better at turning the people who already find you into calls and quote requests. How many people search for your trade, what your competitors do, what you charge and whether somebody is ready to buy today are outside my control and outside everybody else’s. Any provider who guarantees you a number is either guessing or selling.',
  },
  {
    id: 'rankings',
    question: 'Do you guarantee Google rankings?',
    answer:
      'No, and nobody honest can — Google does not sell positions and does not publish its algorithm. Search visibility depends on plenty of things that have nothing to do with your website. What I build is the foundation that helps search engines understand your business: clean structure, a page per service, service-area information, sensible titles and descriptions, a sitemap, indexing and local-business markup. For most local trades a well-kept Google Business Profile matters more than anything on the website, and I will tell you what to fix there too.',
  },

  /* ---------------------------------------------------------------- the guarantee */

  {
    id: 'response-guarantee',
    question: 'What does the 24-hour guarantee mean?',
    answer: `If you have active management and you raise something through the support form or the business email address, you get a real reply within 24 business hours. If I miss it, that month's ${prices.management} management fee is waived — the whole fee, and I apply it myself rather than waiting for you to notice. The clock runs Monday to Friday, 8am to 6pm Pacific; weekends and US federal holidays pause it rather than count against it.`,
  },
  {
    id: 'qualifying-response',
    question: 'What counts as a response?',
    answer:
      'Me telling you I have seen it, and either answering it, telling you the next step, or telling you what I need from you to get one. An automated acknowledgement does not count. Completing the work does not have to happen inside 24 hours — some things take ten minutes and some depend on a hosting company answering their own phone. What is guaranteed is that you are never left wondering whether anybody saw it.',
  },

  /* ---------------------------------------------------------------- the ongoing work */

  {
    id: 'ab-testing',
    question: 'How does A/B testing work?',
    answer:
      'Two versions of a page go live at once, half the visitors see each, nothing else changes between them, and one visitor action gets counted — form starts, quote requests, calls. Whichever version does better stays. One test runs at a time, because two overlapping tests on local traffic do not give you two answers, they give you one you cannot read.',
  },
  {
    id: 'low-traffic',
    question: 'What if my website does not get enough traffic for A/B testing?',
    answer:
      'Then we do not run one, and I say so. Most local service businesses will not have the visitor numbers for a statistically useful test in a given month, and running one anyway would mean presenting noise to you as a finding. In those months the work is evidence-based improvement instead: what the analytics show people doing, where they stop, known usability principles, page speed, and what your phone is telling you. It gets called what it is rather than dressed up as a test result.',
  },
  {
    id: 'refresh',
    question: 'How often do you refresh my website?',
    answer:
      'Four seasonal refreshes a year, roughly one a quarter, timed to when your work actually changes rather than to the calendar — a roofer’s year and a landscaper’s year turn at different points. A refresh is the service your customers need right now moved to the front, with the messaging and the call to action that go with it. Not a redesign, and not four redesigns a year.',
  },
  {
    id: 'landing-pages',
    question: 'Can you create campaign landing pages?',
    answer:
      'Yes — up to one a month, plus two campaign copy alignments on existing pages. The point is that somebody who clicked an advert promising same-day service lands on a page about same-day service, rather than on a homepage that says "welcome to our website". Anything beyond that in a busy month is quoted before it is built, not added to your bill afterwards.',
  },
  {
    id: 'changes',
    question: 'Can you make changes after launch?',
    answer:
      'Yes — that is most of what the monthly service is. New services, updated hours, seasonal changes, fresh photos, new reviews, a price change: you send a message and it gets done, by the person who built the thing. Larger pieces of work are quoted separately so a big project never arrives as a surprise line on your bill.',
  },
  {
    id: 'revisions',
    question: 'What if I do not like the website?',
    answer:
      'We agree what is being built before anything starts, so there are no surprises about scope. During the build I send you a link, you look at it on your own phone, and you send me everything you want changed in one go — that is a revision round, and two are included. New pages, new functionality or a change of direction after sign-off is new scope and gets quoted, so nobody ends up resentful halfway through.',
  },

  /* ---------------------------------------------------------------- practicalities */

  {
    id: 'free-review',
    question: 'What is the free website assessment, exactly?',
    answer:
      'You send me your website address. I go through it the way a customer would, on a phone, and write back with a short list of what is likely costing you calls and what I would change first. Speed, mobile, unclear messaging, weak calls to action, form friction, trust gaps, service pages, local relevance, message match, whether anything is measured at all. It is free, it takes me about half an hour, and there is no obligation to buy anything. If you would rather see the shape of it before asking for one, the teardown page sets out the six sections it comes back with.',
  },
  {
    id: 'area',
    question: 'Do you work outside Greater Seattle?',
    answer:
      'Greater Seattle is the focus, and knowing the area genuinely helps when a site has to talk about which towns you cover. But the work — the website, the analytics, the search foundation, the ongoing optimisation — is all done remotely, so a service business elsewhere can absolutely be a fit. What I do not do is claim to turn up on site.',
  },
  {
    id: 'industries',
    question: 'What businesses do you work with?',
    answer:
      'Local service businesses that get hired in their own area: HVAC, plumbing, electrical, roofing, landscaping, painting, cleaning, pest control, remodelling, general contracting. The pattern is the same for any business a customer finds locally and then calls — and it works best where one extra customer is worth considerably more than the monthly fee. The examples on this site cover several trades for that reason.',
  },
  {
    id: 'content',
    question: 'Who writes the words and provides the photos?',
    answer:
      'I draft the structure and the wording based on what you tell me about the work, and you correct it — you know your trade and your customers better than I do. Photographs of your own finished jobs work far better than stock images, and phone photos are usually fine.',
  },
  {
    id: 'playbook',
    question: 'Can I get the PlayBook?',
    answer: `Yes, and you do not have to give me anything for it. The whole Service Business Website PlayBook is published on this site — ${principleCount} improvements, what goes wrong with each one, and what to do about it. There is a workbook version with the audit sheets and worksheets in it, and that one is sent by email. Reading the free version and never contacting me is a completely acceptable outcome.`,
  },
  /*
   * The audit is the site's primary conversion path and sits in the main navigation, and
   * the FAQ — which exists to answer what stops somebody acting — did not mention it at
   * all. The two questions people actually have about a free diagnostic are "what does it
   * cost me" and "what happens to what I typed", so those are the two this answers.
   */
  {
    id: 'audit',
    question: 'What is the Website Revenue Audit?',
    answer: `A free self-assessment of your own website against the same ${principleCount} checks the PlayBook explains. You score it, it takes about five minutes, and it comes back with the five categories costing you the most — written as what a customer does when they hit each one, rather than as the name of a design problem. You do not have to give an email address to see any of that. Your answers stay in your own browser while you work, and nothing is sent anywhere unless you decide at the end that you want me to look at the site properly.`,
  },
];
