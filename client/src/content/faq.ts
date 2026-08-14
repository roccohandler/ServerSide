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
    /*
     * The parenthetical describing Growth Partner used to read "hosting, upkeep, monitoring
     * and ongoing improvement" — upkeep first, in the most-read answer on the site, which is
     * the same inversion the plan's own scope had. It leads with the report now, like
     * everything else.
     */
    answer: `The build is one published price: ${prices.launch} at founding-client pricing, against a standard project price of ${prices.launchStandard}. Half (${prices.deposit}) to begin, half on the day it goes live, and nothing else is owed on the build. After launch, Growth Partner — the monthly report on what the website produced, the improvement work that comes out of it, and the hosting and upkeep underneath — is a separate, optional ${prices.managementDisplay}. So the first year in full is either ${prices.launch} once, or ${prices.yearOne} with Growth Partner kept for all twelve months. Every figure is in writing before any work starts, and none of them moves unless you ask for something different.`,
  },
  {
    id: 'why-not-monthly',
    question: `Why isn't the website just ${prices.management} a month?`,
    answer:
      'Because the website itself is a custom project: strategy, design, development, content structure, technical setup and launch work that happens once. The monthly service is what happens after the site is live — hosting, security updates, monitoring, changes and ongoing improvement. Pricing them separately keeps both honest: you can see exactly what each payment buys, and you can decline the monthly service without losing the website. A build hidden inside a monthly fee is a build you keep paying for forever.',
  },
  {
    id: 'management-optional',
    question: 'Can I just buy the website?',
    answer:
      'Yes. The build is a one-time purchase and Growth Partner is optional — never a condition of the project. The domain, hosting and content are set up in your name during launch, so running it yourself afterwards means paying your hosting and domain providers directly and making your own changes; you get the logins and a walkthrough. If you would rather one person stayed responsible for all of that, Growth Partner exists — but we would rather you chose it than felt signed up for it.',
  },
  {
    id: 'founding-price',
    question: 'Why is the price lower than the standard price?',
    answer: `Because this is a new company and it needs published work more than it needs full margin on the first projects. Founding-client pricing is available on a limited number of projects in exchange for permission to document the work as a case study — the before, the reasoning, and what changed after launch. That is the whole trade. The standard price is what the work is priced at outside that offer; it is not a price anybody paid in the past, and there is no deadline attached to any of this. When the founding projects are taken, the standard price is simply the price.`,
  },
  {
    id: 'launch-includes',
    question: 'What is actually included in the build?',
    answer:
      'Research before design starts — your competitors, and how someone actually decides who to call. Then a custom, mobile-first website built around the services you sell, with a page for each one, written for what people search. Quote requests designed as a funnel rather than a form. Proof placed where the decision happens. The technical search foundation, analytics and conversion tracking configured and verified, launch on your own domain in your own name, and QA against the published Launch Standard. Larger scope — several service areas, integration with the software you run the business on, a booking system — is quoted in writing before anything starts. Not a template with your logo dropped into it.',
  },
  {
    id: 'management-includes',
    question: `What is included in the ${prices.managementDisplay} after launch?`,
    /*
     * Reordered to match the plan itself: the report first, the work it produces second,
     * upkeep named as the floor. The previous answer opened on hosting and certificates and
     * closed on "measurement explained in plain English", which described the same service
     * and sold a different one.
     */
    answer:
      'It starts with the Website Performance Report, every month: what the website produced — calls and quote requests, counted as real events — whether that moved against the month before and against the baseline recorded at launch, every change we made and why, and what we are looking at next. Then the work that comes out of it: conversion and user-experience improvements on the pages that bring in the most work, A/B testing where your traffic supports a meaningful result, and a considered improvement — called that — where it does not. Then keeping it current: content, service and photo changes when you ask, four seasonal refreshes a year, up to one campaign landing page and two campaign copy alignments a month. And underneath all of it, the floor: hosting, certificates, backups, security updates, uptime and form-delivery monitoring, and bug fixes, with hosting and domain renewals inside that number rather than billed separately. Plus the 24-hour response guarantee. All of it optional — the build stands on its own.',
  },
  {
    id: 'monthly-report',
    question: 'What does the monthly report actually tell me?',
    answer:
      'Four things, in plain English, on the same schedule every month. What the website produced — the number of calls and quote requests, counted as real events rather than estimated. Whether it moved, against last month and against the figure recorded on launch day. Every change we made and the reason for each one. And what we are looking at next, so the following month is not a surprise to either of us. What it will not tell you is that the number always goes up: some months it falls, and when it does you get the number and our reading of why. A report you can only trust in a good month is not a report.',
  },
  {
    id: 'conversion-fix',
    question: 'What if my website mostly works and just is not getting enough calls?',
    answer:
      'Then a rebuild is probably the wrong purchase, and there is a smaller one. A Conversion Fix is targeted corrective work on the site you already own: we go through it against the same twenty checks the website score uses, fix the things actually costing you enquiries — the contact paths, the clarity, the trust gaps, the speed and mobile problems within your existing design — set up and verify the conversion tracking, and record a baseline so you can see what changed. What it is not is a redesign, new pages, or a platform move; if the honest answer is that you need one of those, we will say so rather than sell you the smaller thing twice. The scope is fixed and published; the figure is scoped from the free website assessment and agreed in writing before anything starts.',
  },
  {
    id: 'contract',
    question: 'Is there a contract?',
    answer: `There is a written agreement, which is different from being locked in. Growth Partner has a three-month minimum, because ninety days is roughly what it takes to launch, watch what visitors actually do, and start fixing the parts that are losing you work. After that it is month-to-month and you can stop with 30 days' notice. No annual contract, and nothing that renews itself while you are not looking.`,
  },
  {
    id: 'payment',
    question: 'How does payment work?',
    answer: `Half the project fee to start and half on the day it goes live — ${prices.deposit} and ${prices.deposit} at founding-client pricing. Payments are handled securely through Stripe: each half arrives as an emailed payment link after the scope is agreed in writing, never before, and Stripe sends you the receipt. If you choose Growth Partner, it is billed monthly through Stripe and begins on launch day rather than before, so you are never paying to look after a website that does not exist yet.`,
  },
  {
    id: 'after-deposit',
    question: 'What happens after I pay the deposit?',
    answer:
      'You land on a page that says exactly what happens next, with a short onboarding form: your services, your service area, your photos, and the accounts we will need access to. The two-to-four-week clock starts when those arrive. Then the build runs week by week — strategy and design, build, your review, launch — and nothing else is owed until launch day.',
  },
  {
    id: 'delays',
    question: 'What happens if the project is delayed, or I am slow getting you materials?',
    answer:
      'The timeline moves with you, and the price does not. The two-to-four-week window is measured from when your materials, access and approvals are in our hands — if they arrive later, launch is later, and the build picks up where it left off. The second half of the payment is due on the day the site actually goes live, whenever that is, so a delay never turns into a surprise invoice.',
  },
  {
    id: 'after-launch',
    question: 'What happens after my website launches?',
    answer:
      'You choose. Run it yourself: the domain, hosting and content are already in your name, you get the logins and a walkthrough, and you pay the hosting and domain providers directly. Or take Growth Partner, and it becomes our job rather than yours — hosting, certificates, backups, security updates, monitoring and bug fixes handled, the site kept current as your business changes, and ongoing work on the pages and calls to action that bring in enquiries. Most website projects end with a login and a goodbye; here the ending is a decision you actually get to make.',
  },
  {
    id: 'self-hosting',
    question: `What do I pay for hosting if I do not take Growth Partner?`,
    answer:
      'You pay the hosting and domain providers directly, at their own standard rates — the accounts are set up in your name during launch, so there is nothing to transfer and no charge from us. With Growth Partner, those costs are inside the monthly fee and we manage the accounts on your behalf. Either way the accounts are yours, which is what makes the choice a real one.',
  },

  /* ------------------------------------------------- the comparison people actually make */

  /*
   * The three questions a business owner asks their spouse rather than the supplier, and
   * the site answered none of them.
   *
   * Naming the platforms here is deliberate and it is not a comparison claim: these are the
   * words the reader arrives with, and refusing to use them would read as evasion. What the
   * answers must not do — and do not — is assert anything unmeasured about how those
   * products perform. The factual claim is narrow and defensible: a builder gives you a
   * website, and nobody is accountable for what it produces afterwards. The comparison table
   * on the pricing block stays generic for the same reason, because a table cell cannot
   * carry this reasoning.
   */
  {
    id: 'why-not-builder',
    question: 'Why not just use Wix, Squarespace or WordPress?',
    answer:
      'You can, and for some businesses that is genuinely the right answer — if money is tight and you have the patience, a builder plus a weekend is better than nothing and better than a bad agency. What you are buying here is different in one specific way: those tools give you a website, and nobody is responsible for what it produces. Nobody decides which six services deserve a page, or writes them the way your customers search, or works out why people reach the quote form and abandon it, or tells you next month what the number did. That is not a criticism of the software — it is a description of what software cannot do for you. If your problem is that you have no website, a builder solves it. If your problem is that people are arriving and not calling, it does not.',
  },
  {
    id: 'why-not-cheaper',
    /*
     * Deliberately no figure in the question. The launch price is the founding-client price,
     * and the site's own rule is that a conditional number printed without its condition
     * reads as the price — see the note above `pricing` in `content/offer.ts`. The `cost`
     * answer above states both figures properly; this one is about value, not the number.
     */
    question: 'Why does this cost what it costs when my nephew would do it for a few hundred?',
    answer:
      'Because you are buying different things, and the cheap version is often a perfectly good purchase. A few hundred dollars of somebody’s weekend gets you a website that exists. What it does not get you is research into how your customers decide before design starts, a page per service written for what people actually search, a quote flow built as a funnel, tap-to-call on every screen, conversion tracking configured and verified with real submissions, a published eight-check standard the site has to pass before it launches, redirects so you keep what you have already earned, and a written baseline on launch day so you can tell whether any of it worked. It also does not get you somebody who answers in a year when the form silently stops delivering. If your nephew will do all of that, hire your nephew — genuinely. The question worth asking is not the price, it is who is accountable for the enquiries in month six.',
  },
  {
    id: 'refund',
    question: 'What happens if I pay the deposit and then want to stop?',
    answer:
      'Tell us and we stop. Work already done is not refunded and work not yet done is not charged, so where that leaves the deposit depends on how far in we are — and we will show you what has been done rather than asserting a figure. Nothing about the arrangement is designed to trap you: there is no minimum term on the build, the domain and hosting accounts are in your name from the start, and anything already built is yours. The written agreement is where this is set out in full, and it is worth reading before you pay rather than after. If you want the exact position stated before you commit, ask and we will put it in writing.',
  },

  /* ---------------------------------------------------------------- timing */

  {
    id: 'timeline',
    question: 'How long does the website take?',
    answer:
      'Two to four weeks from the point we have what we need from you — your service list, your business details, and photos of your own finished work. The build is rarely the slow part; waiting on those three things usually is. We will tell you exactly what we need up front so it does not stall halfway through.',
  },

  /* ---------------------------------------------------------------- existing site */

  {
    id: 'existing-site',
    question: 'What happens if I already have a website?',
    answer:
      'Often you do not need a new one. Plenty of sites need a faster load, a visible phone number and a contact form that actually delivers rather than a rebuild — and if yours is one of them we will tell you, because it is cheaper for you and it is the job that is actually needed. A fix like that is quoted per site rather than at the launch price — and then the same choice as everybody else: run it yourself, or have Growth Partner run it.',
  },
  {
    id: 'manage-existing',
    question: 'Can you manage a website you did not build?',
    answer:
      'Yes. It starts with a one-time onboarding — we audit what is there, fix what needs fixing and get it to a standard we are willing to stand behind, which is quoted once we have seen it. After that it joins the monthly service on the same terms as anything we built ourselves, response guarantee included. What we will not do is take over a site, charge you monthly and quietly hope nothing breaks.',
  },
  {
    id: 'domain',
    question: 'Can you work with my existing domain?',
    answer:
      'Yes, and you should keep it. Changing domains throws away whatever search history and recognition the old one has. We point the existing domain at the new site and set up redirects from the old pages, so existing links, directory listings and anything Google already knows about keep working.',
  },

  /* ---------------------------------------------------------------- ownership */

  {
    id: 'ownership',
    question: 'Do I own my website?',
    answer:
      'Yes. The domain, the hosting account and the content are registered in your name from the start, not transferred to you later if you ask nicely. We pay those bills while we are managing it and we are the ones logging in — but managed by us does not mean owned by us, and it never has.',
  },
  {
    id: 'cancel',
    question: 'What happens if I cancel?',
    answer: `You keep the website, the domain, the content and your access — they were always in your name, so there is nothing to hand back. Cancelling stops the ongoing service: hosting and domain renewals, which Growth Partner was covering, become yours to pay directly, and the accounts stay exactly where they are — only the payment method changes. Landing pages built for your campaigns stay part of your website. Any running A/B test gets closed out with the winning version left live, so you never inherit a site quietly serving two versions of itself. If you prepaid a year, the unused months are refunded at the ${prices.management} monthly rate.`,
  },
  {
    id: 'knowledge',
    question: 'Do I need to know anything about websites?',
    answer:
      'No. We handle the technical work — hosting, security, updates, tracking, all of it. What we need from you is the information and the decisions only you can give: what you do, where you work, how you charge, and photos of your own finished jobs.',
  },

  /* ---------------------------------------------------------------- what we will not promise */

  {
    id: 'what-guaranteed',
    question: 'What exactly do you guarantee?',
    answer:
      'The work and the technical delivery — the things we directly control. Five specific promises: the website is built to the requirements we agreed in writing, and we keep working until it is. It does not launch until it passes the published Launch Standard — eight checks you could verify yourself on launch day. You will always know what it produced: calls and quote requests are measured, the starting figure is written down on launch day, and you get a written account at day 30. If a change we make breaks something, we fix it at no charge. And on Growth Partner, you get a real reply within 24 business hours or that month is free, applied without you asking. What we do not guarantee is leads, rankings or revenue — those depend on your market, your pricing and your phone being answered, and the answers below explain why nobody honest guarantees them.',
  },
  {
    id: 'ads',
    question: 'Do you manage Google Ads?',
    answer:
      'No. We do not run your ads, set your budgets or manage your bidding, and we will not pretend otherwise to win the work. What we do is make the page your advert points at say what the advert promised — same offer, same words, same next step — which is the part most people paying for clicks are quietly losing money on.',
  },
  {
    id: 'more-leads',
    question: 'Do you guarantee leads?',
    answer:
      'No. That is the goal and it is not something anybody can promise you. What we promise is the work: making your website better at turning the people who already find you into calls and quote requests. How many people search for your trade, what your competitors do, what you charge and whether somebody is ready to buy today are outside our control and outside everybody else’s. Any provider who guarantees you a number is either guessing or selling.',
  },
  {
    id: 'rankings',
    question: 'Do you guarantee Google rankings?',
    answer:
      'No, and nobody honest can — Google does not sell positions and does not publish its algorithm. Search visibility depends on plenty of things that have nothing to do with your website. What we build is the foundation that helps search engines understand your business: clean structure, a page per service, service-area information, sensible titles and descriptions, a sitemap, indexing and local-business markup. For most local trades a well-kept Google Business Profile matters more than anything on the website, and we will tell you what to fix there too.',
  },

  /* ---------------------------------------------------------------- the guarantee */

  {
    id: 'response-guarantee',
    question: 'What does the 24-hour guarantee mean?',
    answer: `If you have active management and you raise something through the support form or the business email address, you get a real reply within 24 business hours. If we miss it, that month's ${prices.management} management fee is waived — the whole fee, and we apply it ourselves rather than waiting for you to notice. The clock runs Monday to Friday, 8am to 6pm Pacific; weekends and US federal holidays pause it rather than count against it.`,
  },
  {
    id: 'qualifying-response',
    question: 'What counts as a response?',
    answer:
      'Us telling you we have seen it, and either answering it, telling you the next step, or telling you what we need from you to get one. An automated acknowledgement does not count. Completing the work does not have to happen inside 24 hours — some things take ten minutes and some depend on a hosting company answering their own phone. What is guaranteed is that you are never left wondering whether anybody saw it.',
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
      'Then we do not run one, and we say so. Most local service businesses will not have the visitor numbers for a statistically useful test in a given month, and running one anyway would mean presenting noise to you as a finding. In those months the work is evidence-based improvement instead: what the analytics show people doing, where they stop, known usability principles, page speed, and what your phone is telling you. It gets called what it is rather than dressed up as a test result.',
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
      'We agree what is being built before anything starts, so there are no surprises about scope. During the build we send you a link, you look at it on your own phone, and you send us everything you want changed in one go — that is a revision round, and two are included. New pages, new functionality or a change of direction after sign-off is new scope and gets quoted, so nobody ends up resentful halfway through.',
  },

  /* ---------------------------------------------------------------- practicalities */

  {
    id: 'free-review',
    question: 'What is the free website assessment, exactly?',
    answer:
      'You send us your website address. We go through it the way a customer would, on a phone, and write back with a short list of what is likely costing you calls and what we would change first. Speed, mobile, unclear messaging, weak calls to action, form friction, trust gaps, service pages, local relevance, message match, whether anything is measured at all. It is free, it takes us about half an hour, and there is no obligation to buy anything. If you would rather see the shape of it before asking for one, the teardown page sets out the six sections it comes back with.',
  },
  {
    id: 'area',
    question: 'Do you work outside Greater Seattle?',
    answer:
      'Greater Seattle is the focus, and knowing the area genuinely helps when a site has to talk about which towns you cover. But the work — the website, the analytics, the search foundation, the ongoing optimisation — is all done remotely, so a service business elsewhere can absolutely be a fit. What we do not do is claim to turn up on site.',
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
      'We draft the structure and the wording based on what you tell us about the work, and you correct it — you know your trade and your customers better than we do. Photographs of your own finished jobs work far better than stock images, and phone photos are usually fine.',
  },
  {
    id: 'playbook',
    question: 'Can I get the PlayBook?',
    answer: `Yes, and you do not have to give us anything for it. The whole Service Business Website PlayBook is published on this site — ${principleCount} improvements, what goes wrong with each one, and what to do about it. There is a workbook version with the audit sheets and worksheets in it, and that one is sent by email. Reading the free version and never contacting us is a completely acceptable outcome.`,
  },
  /*
   * The audit is the site's primary conversion path and sits in the main navigation, and
   * the FAQ — which exists to answer what stops somebody acting — did not mention it at
   * all. The two questions people actually have about a free diagnostic are "what does it
   * cost me" and "what happens to what I typed", so those are the two this answers.
   */
  /*
   * The catch-all "can it do X" question.
   *
   * Owners ask about online booking, card payments, text alerts and job-software connections
   * constantly, and a separate FAQ answer for each would be four near-identical paragraphs
   * that all end "it depends". One answer pointing at the library is better, because the
   * library gives the specific status per capability — including "no, and here is why" for
   * the two things this business has decided against.
   */
  {
    id: 'capabilities',
    question: 'Can the website do online booking, take payments, or connect to my job software?',
    answer:
      'Some of it yes, some of it as extra scope we quote before starting, and two of the things people ask about most we deliberately do not offer. Rather than answer that vaguely: there is a page listing every capability a site like this can have, and each one is labelled as part of the build, part of the monthly service, extra scope, intended but not built, or not offered with the reasoning. Booking and card deposits are real and quoted separately. Text alerts and job-software connections are stated directions with no date. Pick your trade on that page and the recommendations change.',
  },
  {
    id: 'audit',
    question: 'What is the Website Score?',
    answer: `A free self-assessment of your own website against the same ${principleCount} checks the PlayBook explains. You score it, it takes about five minutes, and it comes back with the five categories costing you the most — written as what a customer does when they hit each one, rather than as the name of a design problem. You do not have to give an email address to see any of that. Your answers stay in your own browser while you work, and nothing is sent anywhere unless you decide at the end that you want us to look at the site properly.`,
  },
];
