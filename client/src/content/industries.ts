import type { TradeSlug } from '../config/trades';
import { findIndustryMeta } from './industryMeta';
import type { IndustryPageContent } from '../types/content';

/*
 * ============================================================================
 * THE FIVE INDUSTRY PAGES
 * ============================================================================
 *
 * The instruction these were written against was specific: *do not simply replace the
 * word "HVAC" in a generic template — the content architecture should actually change.*
 * So what follows is not one page rendered five times. The five differ on every axis
 * where the trades genuinely differ:
 *
 *   - **how long the decision takes.** An hour for a failed furnace, weeks for a roof.
 *     Everything else on a page follows from that one fact.
 *   - **how the customer arrives.** Four beats for an emergency, six for a considered
 *     purchase with three competing quotes and an insurance company in the middle.
 *   - **what stops them.** A missing service area costs an HVAC business the call. It
 *     costs a roofer almost nothing, because they were never going to call today anyway.
 *   - **which pages the business needs.** Panel upgrades, EV chargers and a dead socket
 *     are three searches. Emergency repair and a bathroom remodel are two customers.
 *   - **what the published advertising data says about the category** — which ranges from
 *     3.70% to 9.08% across these five, and the spread is a fact about how each trade is
 *     bought rather than a scoreboard.
 *
 * What is deliberately *not* per-trade: the offer, the prices, the guarantee, the terms
 * and the process. Those are identical whoever is reading, and five near-copies of them
 * would be five places for the published commitments to drift apart. Each page links to
 * the one canonical version instead.
 *
 * ## The rule on the benchmark figures
 *
 * Every one of the five numbers below is a **search advertising** conversion rate, taken
 * from LocaliQ's published 2025 home-services benchmark report and reproduced verbatim,
 * under the source's own category names. They are labelled with one exact sentence,
 * defined once as `ADVERTISING_BENCHMARK_LABEL` and asserted by `content.test.ts`, because
 * the confusion they invite — reading an advertising conversion rate as a website
 * conversion rate — is the specific dishonest move this site exists to be the opposite of.
 *
 * LocaliQ publishes cost-per-lead figures alongside them. None of those appear here. The
 * currency guard would fail the build on them, and inviting a reader to set a monthly fee
 * against a cost per lead nobody controls is an argument that helps nobody.
 * ============================================================================
 */

/**
 * The sentence that travels with every advertising figure on this site.
 *
 * Defined once and pinned by a test, so it cannot be softened, shortened or dropped in a
 * copy edit. If a benchmark ever appears without it, the build fails.
 */
export const ADVERTISING_BENCHMARK_LABEL =
  'Search advertising benchmark — not a website conversion benchmark.';

const LOCALIQ_SOURCE = 'LocaliQ, 2025 Search Ad Benchmarks for Home Services';
const LOCALIQ_URL = 'https://localiq.com/blog/home-services-search-advertising-benchmarks/';
const LOCALIQ_DATASET =
  '3,211 US search advertising campaigns across sixteen home-services subcategories, covering the twelve months to March 2025.';

/*
 * The shared half of every limitation: the denominator problem, stated the same way each
 * time because it is the same problem each time. The trade-specific half is appended per
 * page, so no two read identically and none of them can lose the part that matters.
 */
const DENOMINATOR_CAVEAT =
  'This counts paid search clicks that produced a tracked action. A website is visited by everybody who arrived by any route — a search result nobody paid for, a van, a neighbour — so the two numbers have different denominators and are not comparable. It is also somebody else’s campaigns, not yours, and it says nothing about what your site does today.';

/*
 * The path, title and description come back from `content/industryMeta.ts`.
 *
 * They live there rather than here because `content/pages.ts` needs them and is reachable
 * from the eager bundle — mapping `pages.ts` over *this* file put all five industry pages'
 * copy into the chunk every visitor downloads. Reading them back keeps each title written
 * exactly once, which is the property that mattered in the first place.
 *
 * Throws rather than falling back: a trade in this list with no metadata entry is a page
 * with no title and no route, and failing at module load is a far better way to find that
 * out than a blank `<title>` in production.
 */
function meta(slug: TradeSlug) {
  const entry = findIndustryMeta(slug);
  if (!entry) throw new Error(`No industry metadata for "${slug}" — see content/industryMeta.ts`);

  const { path, metaTitle, metaDescription, navLabel } = entry;
  return { path, metaTitle, metaDescription, eyebrow: navLabel };
}

export const industries: readonly IndustryPageContent[] = [
  /* ------------------------------------------------------------------------ HVAC */
  {
    slug: 'hvac',
    ...meta('hvac'),
    heading: 'Websites for heating and cooling companies',
    lede: 'A failed furnace is not a research project. This is about what that does to a website: which parts get read, which parts are never reached, and what has to be on the first screen for the call to happen at all.',
    decisionWindow:
      'From the heat going out to somebody dialling is usually under an hour — and most of that hour is not spent on your website.',

    journey: {
      heading: 'How a heating and cooling customer actually arrives',
      lede: 'Not one of these beats involves reading about your company. That is not a criticism of your company — it is the condition the decision gets made in.',
      steps: [
        {
          id: 'trigger',
          moment: 'Something stopped working',
          detail:
            'Nobody set out this morning to choose an HVAC company. The search starts because the house is now uncomfortable and somebody has decided to deal with it today rather than at the weekend.',
        },
        {
          id: 'phone',
          moment: 'On a phone, standing up',
          detail:
            'They search from a phone, in a room they do not want to sit down in, often on mobile data rather than wi-fi. Whatever your site does slowly, it is doing slowly right now to somebody with no patience left.',
        },
        {
          id: 'shortlist',
          moment: 'Three tabs, about thirty seconds',
          detail:
            'They open the first few results and give each one roughly the time it takes to find a phone number and a service area. Anything below the fold has not been read, because there was no scroll.',
        },
        {
          id: 'call',
          moment: 'Whoever answers',
          detail:
            'They call the business that made calling easiest. If nobody picks up they call the next one, and the job goes to whoever was reachable rather than to whoever had the better website.',
        },
      ],
    },

    friction: {
      heading: 'Where heating and cooling sites lose the call',
      lede: 'Four things, in the order a customer meets them. None of them is a design problem. Each one is a sentence the customer needed and did not get.',
      items: [
        {
          id: 'availability',
          title: 'Nobody says whether you can come out today',
          whatHappens:
            'The site lists services, describes the area and mentions how long the business has been going. The one question the visitor actually has — can somebody be here today — is answered nowhere.',
          whatItCosts:
            'Some of them call to find out. More of them call the business that already told them, because that is one unknown fewer at a moment when they have no appetite for unknowns.',
          whatIdChange:
            'Put availability next to the phone number, in whatever words are true: same-day where you can take it, and the honest version where you cannot. An accurate "next available is tomorrow morning" outperforms silence.',
        },
        {
          id: 'first-screen',
          title: 'The first screen is about the company rather than the problem',
          whatHappens:
            'A photograph of a van, a line about comfort, and a paragraph about being family-owned since a year that is not relevant to anybody standing in a cold house.',
          whatItCosts:
            'They scroll looking for the part that is about them, and a share of them do not bother. You never learn how many — a visitor who leaves in four seconds leaves nothing behind to count.',
          whatIdChange:
            'Lead with the failure they arrived with, in the words they would use: no heat, no cool air, the unit is running but nothing is coming out. Company history moves further down, where the people who want it will still find it.',
        },
        {
          id: 'area',
          title: 'The service area is a paragraph on another page',
          whatHappens:
            'The towns you cover are on an About page, or in the footer at ten pixels, or nowhere at all.',
          whatItCosts:
            'A customer who cannot tell whether you come out to them treats that as a no. It costs nothing to check the next result, and checking is easier than asking.',
          whatIdChange:
            'The area on the first screen of every page, named as towns rather than as a radius from an address nobody knows, plus a real page for each town the work is genuinely worth having.',
        },
        {
          id: 'call-path',
          title: 'The phone number is text rather than a button',
          whatHappens:
            'The number sits in the header as plain text. Tapping it selects it instead of dialling, and it scrolls away the moment they start reading.',
          whatItCosts:
            'On a phone, in a cold house, that is enough to send somebody back to the results page. It is the cheapest loss on the entire site and the easiest to fix.',
          whatIdChange:
            'A tap-to-call button that stays on screen while they scroll, and a short form beside it for the ones who would rather not talk to anybody yet.',
        },
      ],
    },

    pages: {
      heading: 'The pages a heating and cooling business actually needs',
      lede: 'Not one services page with a bulleted list on it. Each of these answers a different search, and a visitor who lands on the specific page is more convinced than one who lands on the general one — because a page about their exact job is evidence you do their exact job.',
      items: [
        {
          name: 'Emergency and same-day repair',
          why: 'The highest-intent search in the trade, and the one most often answered by a general services page that mentions repair somewhere among nine other things.',
        },
        {
          name: 'Furnace repair and replacement',
          why: 'Two customers on one subject: one wants it working tonight, one is deciding whether to replace a unit before winter. Both need to see the word furnace, and they need different next steps.',
        },
        {
          name: 'Air conditioning and heat pumps',
          why: 'Seasonal, and increasingly a decision of its own — heat pumps get bought for reasons that have nothing to do with anything having broken.',
        },
        {
          name: 'Maintenance plans',
          why: 'The repeat work in this trade, and it sells on a page of its own rather than as a line in a list. A plan is something somebody chooses deliberately, not while their heat is out.',
        },
        {
          name: 'Service area pages',
          why: 'One page per town where the work is genuinely worth having. Not fifty near-identical pages with the town name swapped, which is a tactic search engines were built to catch.',
        },
      ],
      note: 'Which of these you need is part of what the free assessment works out. A business with one van does not need the page count of a company running six, and being told otherwise is how people end up paying for pages nobody reads.',
    },

    benchmark: {
      category: 'HVAC (Heating & Furnaces)',
      conversionRate: '7.48%',
      source: LOCALIQ_SOURCE,
      sourceUrl: LOCALIQ_URL,
      dataset: LOCALIQ_DATASET,
      label: ADVERTISING_BENCHMARK_LABEL,
      whyItMatters:
        'Worth knowing before you measure yourself against anybody: even paid clicks from somebody actively searching for this trade convert in single figures. A quiet month is not automatically evidence that something is broken.',
      limitation: `${DENOMINATOR_CAVEAT} What it is useful for here is scale — if you are running search ads, it is a reference point for what those clicks do in your category, and nothing more.`,
    },

    evidenceIds: ['invoca-answer-rate'],
    demoId: 'hvac',

    cta: {
      heading: 'What is your own site doing to somebody with no heat?',
      body: 'Score it against twenty checks and find out — five minutes, no email address needed to see the result, and the diagnosis is written for an HVAC customer rather than in general terms.',
      auditLabel: 'Audit my HVAC website',
    },
  },

  /* -------------------------------------------------------------------- Plumbing */
  {
    slug: 'plumbing',
    ...meta('plumbing'),
    heading: 'Websites for plumbing companies',
    lede: 'Plumbing is two businesses sharing a phone number. A burst pipe at seven in the morning and a bathroom being planned for the spring are different customers with different questions, and most plumbing websites are built for neither of them in particular.',
    decisionWindow:
      'The emergency decides in minutes. The remodel decides over weeks, and comes back to your site more than once before it does.',

    journey: {
      heading: 'Two customers, two journeys',
      lede: 'The reason a single "Contact us" button underperforms here is not that it is badly worded. It is that it is being asked to serve two people who want opposite things.',
      steps: [
        {
          id: 'emergency-trigger',
          moment: 'The emergency: water where it should not be',
          detail:
            'Something is leaking, blocked, or refusing to produce hot water. There is a bucket involved. The search is short, urgent and almost entirely about who can get here soonest.',
        },
        {
          id: 'emergency-cost',
          moment: 'The emergency: what is this going to cost me',
          detail:
            'They have heard the stories about call-out charges. A site that says nothing about how pricing works reads as expensive, and expensive at short notice reads as being taken advantage of.',
        },
        {
          id: 'emergency-call',
          moment: 'The emergency: the first business that picks up',
          detail:
            'They are not comparing three quotes. They are calling down a list until somebody answers, and everything after the first answered call is irrelevant.',
        },
        {
          id: 'planned-research',
          moment: 'The remodel: looking at other people’s bathrooms',
          detail:
            'This one starts weeks earlier and is mostly visual. They are working out what they want before they work out who does it, and your site is being judged on whether the finished work looks like the work they are imagining.',
        },
        {
          id: 'planned-shortlist',
          moment: 'The remodel: three names, several visits',
          detail:
            'They shortlist, ask around, and come back to each site more than once — often on a laptop in the evening after finding you on a phone at lunchtime. A site that only works in the urgent case has nothing for them on the second visit.',
        },
      ],
    },

    friction: {
      heading: 'Where plumbing sites lose both of them at once',
      lede: 'The failures below are what happens when one page is asked to do two jobs. Each one costs a different customer.',
      items: [
        {
          id: 'undivided',
          title: 'The emergency and the project share one path',
          whatHappens:
            'One hero, one button, one form, and a services list where drain clearing sits next to bathroom design as though those were the same kind of purchase.',
          whatItCosts:
            'The urgent caller has to read past a kitchen renovation to find you. The remodel customer sees a site built around burst pipes and quietly concludes you are a repair outfit.',
          whatIdChange:
            'Split them in the first screen: one path that is a phone number, one path that is a quote request. Two obvious doors beat one door with a longer sign on it.',
        },
        {
          id: 'pricing-silence',
          title: 'Nothing on the site explains how pricing works',
          whatHappens:
            'No call-out charge, no hourly figure, no explanation of whether the first visit is chargeable — usually because the honest answer is "it depends".',
          whatItCosts:
            '"It depends" is a fine answer. Saying nothing is a different answer, and the one a nervous customer hears is that they are about to be surprised.',
          whatIdChange:
            'Explain the shape of it without publishing a number you cannot stand behind: what the call-out covers, what changes the figure, and when they will know the total. Certainty about the process is worth almost as much as certainty about the price.',
        },
        {
          id: 'no-proof',
          title: 'No photographs of finished work',
          whatHappens:
            'Stock images of pipes, a smiling person in overalls who does not work there, and nothing that was taken on an actual job.',
          whatItCosts:
            'The repair customer barely notices. The remodel customer, who is choosing largely on whether your finished work looks right, has nothing to look at and goes to the site that had photographs.',
          whatIdChange:
            'Real photographs of completed jobs, captioned with what the job was. Six honest ones taken on a phone beat a gallery of stock photography, because the customer can tell the difference.',
        },
        {
          id: 'form-length',
          title: 'The quote form asks like a supplier rather than a plumber',
          whatHappens:
            'Address, budget range, preferred contact time, how they heard about you — before anybody has agreed to anything.',
          whatItCosts:
            'The emergency caller abandons it because they needed a phone. The remodel customer abandons it because it feels like an application, and they were only trying to start a conversation.',
          whatIdChange:
            'Ask for the fewest fields that let you call back usefully, and put the rest of the questions in the call where they belong.',
        },
      ],
    },

    pages: {
      heading: 'The pages a plumbing business actually needs',
      lede: 'The split runs all the way through the site, not just the homepage. These are two page families, and a customer should be able to tell within a second which one they are in.',
      items: [
        {
          name: 'Emergency plumbing',
          why: 'Its own page, with the phone number as the whole point of it and an honest line about response times. This is where the highest-intent searches land.',
        },
        {
          name: 'Drains and blockages',
          why: 'A specific, common, unglamorous search with high intent behind it. Almost always buried in a general list, where it competes with nothing and wins nothing.',
        },
        {
          name: 'Water heaters',
          why: 'Both a repair and a replacement decision, which makes it the one subject where the urgent and the considered customer meet. It needs both next steps on the same page.',
        },
        {
          name: 'Bathroom and kitchen work',
          why: 'The considered half of the business, and the one that lives or dies on photographs. This is the page somebody sends to their partner.',
        },
        {
          name: 'Service area pages',
          why: 'For the emergency half especially — somebody with water coming through a ceiling wants to see their own town written down, not a radius.',
        },
      ],
      note: 'If your business is genuinely only one of the two, the site should say so plainly and stop trying to be both. Half a site aimed at customers you do not want is worse than a smaller one aimed at the ones you do.',
    },

    benchmark: {
      category: 'Plumbing',
      conversionRate: '7.63%',
      source: LOCALIQ_SOURCE,
      sourceUrl: LOCALIQ_URL,
      dataset: LOCALIQ_DATASET,
      label: ADVERTISING_BENCHMARK_LABEL,
      whyItMatters:
        'Plumbing and heating land within a fraction of a percent of each other in this dataset, which fits how both are bought: an urgent problem, a short list, a phone call. It is a reference point for paid clicks in the category — nothing about any particular website.',
      limitation: `${DENOMINATOR_CAVEAT} It also averages the emergency half of the trade together with the planned half, which are the two things this page has just spent several hundred words arguing are not the same.`,
    },

    evidenceIds: ['invoca-answer-rate'],
    demoId: 'plumbing',

    cta: {
      heading: 'Does your site work for both of your customers?',
      body: 'Twenty checks, about five minutes, and the diagnosis comes back written for a plumbing customer — including whether the urgent and the planned job are actually being separated.',
      auditLabel: 'Audit my plumbing website',
    },
  },

  /* --------------------------------------------------------------------- Roofing */
  {
    slug: 'roofing',
    ...meta('roofing'),
    heading: 'Websites for roofing contractors',
    lede: 'Nobody books a roof from a phone in a hurry. This is a large, infrequent purchase the customer cannot evaluate, compared across three or four contractors over weeks — which makes a roofing website a completely different instrument from an emergency plumber’s.',
    decisionWindow:
      'Days to weeks, across several contractors, with at least one return visit to your site before anybody signs anything.',

    journey: {
      heading: 'How a roofing customer actually decides',
      lede: 'Six beats, and only the first one looks like the urgent trades. The rest is a comparison the customer is not equipped to make, which is the whole opportunity.',
      steps: [
        {
          id: 'trigger',
          moment: 'A stain on the ceiling, or a neighbour’s new roof',
          detail:
            'The trigger is either a small failure that suggests a large one, or somebody else on the street having work done. Either way it starts as a question rather than an emergency.',
        },
        {
          id: 'is-it-serious',
          moment: 'Is this a repair or a replacement',
          detail:
            'They do not know, and they know they do not know. This is the most anxious point of the whole process, and almost no roofing website addresses it directly.',
        },
        {
          id: 'insurance',
          moment: 'Will insurance cover it',
          detail:
            'After storm damage this question comes before choosing a contractor at all, and the business that explains the claim process becomes the one they trust to handle it.',
        },
        {
          id: 'shortlist',
          moment: 'Three or four names',
          detail:
            'They collect recommendations and search results into a shortlist, then start booking inspections. Being on the list is a different job from winning it, and your site has to do both.',
        },
        {
          id: 'compare',
          moment: 'Three quotes that do not compare',
          detail:
            'The quotes arrive in different formats with different scopes and a wide spread of numbers, and the customer has no way to judge which is right. What they fall back on is who seemed most credible.',
        },
        {
          id: 'return',
          moment: 'Back to your site, on a laptop, in the evening',
          detail:
            'Before they commit they go back and look you up properly — licence, insurance, finished work, how long you have been at it. This visit is unhurried and thorough, and it is the one most roofing sites are not built for.',
        },
      ],
    },

    friction: {
      heading: 'Where roofing sites lose a customer they had already convinced',
      lede: 'These are losses that happen late, after the site has done the hard part. Each one is a thing the customer went looking for and could not find.',
      items: [
        {
          id: 'credentials',
          title: 'The licence and insurance details are not on the page',
          whatHappens:
            'The site says "licensed, bonded and insured" as a phrase in a footer, with no numbers, no carrier and nothing anybody could check.',
          whatItCosts:
            'A phrase everybody uses carries no information. The customer who went looking for the detail found the same sentence they found everywhere else, and has no reason to prefer you.',
          whatIdChange:
            'Publish the licence number, the state it is registered in, and who the work is insured with. Verifiable beats reassuring, and it costs nothing that is not already true.',
        },
        {
          id: 'repair-or-replace',
          title: 'Nothing helps them work out how bad it is',
          whatHappens:
            'The site sells replacement, mentions repair, and leaves the customer to guess which conversation they are about to have.',
          whatItCosts:
            'People delay decisions they do not understand. A customer who cannot tell whether they need a patch or a new roof books nothing at all for another month, and calls whoever helped them understand it first.',
          whatIdChange:
            'A plain-English page about what the warning signs usually mean and what an inspection actually looks at. It answers the question and demonstrates competence in the same move.',
        },
        {
          id: 'insurance-silence',
          title: 'Storm and insurance work goes unmentioned',
          whatHappens:
            'The site treats every job as a straightforward purchase, when a large share of them start with a claim the customer has never made before.',
          whatItCosts:
            'They pick the contractor whose site talked them through the claim, because that contractor looked like the one who had done it before.',
          whatIdChange:
            'A page on how the claim process works, what an adjuster looks for, and what you do and do not handle. Be exact about the boundary — overstating it is how a contractor ends up in an argument they cannot win.',
        },
        {
          id: 'wrong-action',
          title: 'The call to action is "get in touch"',
          whatHappens:
            'A general contact form, with the same wording as every other page, asking somebody to start an open-ended conversation about the largest home purchase they will make this decade.',
          whatItCosts:
            'The ones who were ready wanted a specific, low-commitment next step. A vague invitation converts the people who were going to call anyway and nobody else.',
          whatIdChange:
            'Ask for the thing they actually want: a roof inspection or a written estimate, with the timescale stated and whether it costs anything answered before they click.',
        },
      ],
    },

    pages: {
      heading: 'The pages a roofing contractor actually needs',
      lede: 'This trade rewards depth more than any other on this site. The customer is doing weeks of research whether or not you help them, and the contractor whose pages answered the questions is the one who gets shortlisted.',
      items: [
        {
          name: 'Roof replacement',
          why: 'The largest job and the longest decision. It needs process, materials, timescale and what happens to the garden — the practical questions that come up on the second visit.',
        },
        {
          name: 'Roof repair',
          why: 'Where most enquiries start, including a good share that turn into replacements once somebody has been up there and looked.',
        },
        {
          name: 'Storm damage and insurance claims',
          why: 'A seasonal, high-urgency search inside an otherwise slow trade, and the one page where being the business that explains the process is worth the most.',
        },
        {
          name: 'Inspections',
          why: 'The low-commitment first step this trade needs and often does not offer as its own destination. It converts the researcher who is not ready to talk about money.',
        },
        {
          name: 'Finished work, with locations',
          why: 'Photographs of roofs near them, in the weather they get. This is the evidence page, and in a considered purchase evidence is the product.',
        },
      ],
      note: 'A roofing site is read twice: once quickly, once carefully. The pages above are for the careful read, and that is the one that decides it.',
    },

    benchmark: {
      category: 'Roofing & Gutters',
      conversionRate: '3.70%',
      source: LOCALIQ_SOURCE,
      sourceUrl: LOCALIQ_URL,
      dataset: LOCALIQ_DATASET,
      label: ADVERTISING_BENCHMARK_LABEL,
      whyItMatters:
        'The lowest of the five trades on this site, and roughly half the rate of the urgent ones. The likeliest reason is the sale rather than the marketing: a roof is compared across several contractors over weeks, so any single click is far less likely to be the one that ends in a signature. Read that as an argument for a site built to be returned to, not for a site built to close.',
      limitation: `${DENOMINATOR_CAVEAT} And a lower number here is not evidence that roofing marketing is worse — it is what you would expect from a purchase with a long comparison period, where the click that eventually converts is often not the click that was paid for.`,
    },

    evidenceIds: ['google-web-vitals'],
    demoId: 'roofing',

    cta: {
      heading: 'Would your site survive the careful second read?',
      body: 'Twenty checks against the things a roofing customer goes looking for before they commit — licence detail, finished work, and whether the next step is specific enough to take.',
      auditLabel: 'Audit my roofing website',
    },
  },

  /* ----------------------------------------------------------------- Landscaping */
  {
    slug: 'landscaping',
    ...meta('landscaping'),
    heading: 'Websites for landscaping and yard care businesses',
    lede: 'This is the one trade on this site where the photographs are the argument and the writing is the caption. It is also split down the middle between one-off projects and work that repeats every week — two businesses with different economics, usually sold from the same page.',
    decisionWindow:
      'A design project takes weeks and starts with pictures. A regular round is decided in one visit, and is worth many times a single job over a year.',

    journey: {
      heading: 'How a landscaping customer actually arrives',
      lede: 'Two routes in, and they behave nothing alike. One is browsing; the other has already decided and is only choosing who.',
      steps: [
        {
          id: 'project-imagining',
          moment: 'The project: looking at gardens that are not theirs',
          detail:
            'It starts as an idea rather than a search for a contractor. They are collecting images of what they want, and your finished work is being judged against a picture in their head before a single word of your site is read.',
        },
        {
          id: 'project-feasible',
          moment: 'The project: is this even possible on my plot',
          detail:
            'Slope, drainage, access for a machine, a fence that has to come down. They cannot answer any of it, and they are looking for somebody who can come and look.',
        },
        {
          id: 'project-visit',
          moment: 'The project: somebody comes and looks at it',
          detail:
            'The next step they want is a site visit, not a general enquiry. Nothing meaningful gets decided until somebody has stood in the garden.',
        },
        {
          id: 'round-trigger',
          moment: 'The round: the grass got away from them',
          detail:
            'A completely different customer. They have decided to stop doing it themselves, they want to know whether you cover their street and roughly what it costs a visit, and they will book with whoever answers both.',
        },
        {
          id: 'round-reliability',
          moment: 'The round: will they actually turn up',
          detail:
            'The whole decision, in one question. Everybody in this trade has a story about somebody who came twice and vanished, and the site that reads as organised wins on that alone.',
        },
      ],
    },

    friction: {
      heading: 'Where landscaping sites lose the work',
      lede: 'The failures here are unusually visual, and unusually cheap to fix — most of what is missing is already on somebody’s phone.',
      items: [
        {
          id: 'no-photographs',
          title: 'The photographs are stock, small, or absent',
          whatHappens:
            'A hero image of a garden nobody at the business has ever been to, and finished work shown as thumbnails in a row near the bottom.',
          whatItCosts:
            'This is the one trade where the decision is largely made on images. Weak photography does not just fail to help — it is read as evidence that the finished work is not worth showing.',
          whatIdChange:
            'Large, real photographs of completed work, ideally the same garden before and after. Taken on a phone in decent light, which is a free afternoon rather than a budget item.',
        },
        {
          id: 'undivided',
          title: 'Project work and regular visits share one list',
          whatHappens:
            'A single services page where garden design sits alongside hedge trimming, priced and presented the same way.',
          whatItCosts:
            'The design customer thinks you are a mowing outfit. The weekly customer thinks you are too grand for their front garden. Both go elsewhere, and neither tells you why.',
          whatIdChange:
            'Two clearly separate paths with their own pages and their own next steps — a site visit for one, a quick quote for the other.',
        },
        {
          id: 'area-vagueness',
          title: 'The area covered is vague',
          whatHappens: 'Something like "serving the greater area", or a radius, or nothing at all.',
          whatItCosts:
            'A regular round only works if the route is tight, and the customer knows that too. Vagueness costs you the nearby customers you want and buys you enquiries from thirty miles away that you will turn down.',
          whatIdChange:
            'Name the towns and neighbourhoods you actually want the work in. Turning away the wrong enquiries earlier is worth as much as attracting more of the right ones.',
        },
        {
          id: 'seasonal-drift',
          title: 'The site says the same thing in February as in July',
          whatHappens:
            'A page written once, describing a full year of services with no sense of what is being booked right now.',
          whatItCosts:
            'This trade’s demand moves through the year more sharply than any other on this site. A site that is silent about the season is competing with one that is currently talking about exactly what the visitor was thinking about.',
          whatIdChange:
            'Change what leads the page as the year turns — clean-ups, planting, irrigation, leaf clearing. It is a small edit a few times a year and it is the difference between a current business and a dormant one.',
        },
      ],
    },

    pages: {
      heading: 'The pages a landscaping business actually needs',
      lede: 'Two families again, and the split is sharper here than anywhere else on this site, because one of them is a project and the other is a subscription in everything but name.',
      items: [
        {
          name: 'Garden and landscape design',
          why: 'The project half. Image-led, generous with space, and ending in a site visit rather than a form asking for a budget.',
        },
        {
          name: 'Regular yard care',
          why: 'The repeating half. What is included, how often, what happens in winter, and how to start — the practical questions, answered plainly.',
        },
        {
          name: 'Hard landscaping',
          why: 'Patios, paths, walls and drainage are searched for by name and are among the highest-value jobs in the trade. They rarely get a page.',
        },
        {
          name: 'Seasonal work',
          why: 'Spring clean-ups, planting, irrigation, leaf clearing. This is what makes the site look like a business that is currently working rather than one that built a website once.',
        },
        {
          name: 'Finished gardens, with locations',
          why: 'The portfolio is the sales pitch. Grouped by the kind of job and captioned with what was actually done, so a visitor can find the one that looks like theirs.',
        },
      ],
      note: 'If the repeating work is the part of the business you want to grow, the site should be built around it rather than treating it as the thing you do between projects.',
    },

    benchmark: {
      category: 'Landscaping',
      conversionRate: '6.42%',
      source: LOCALIQ_SOURCE,
      sourceUrl: LOCALIQ_URL,
      dataset: LOCALIQ_DATASET,
      label: ADVERTISING_BENCHMARK_LABEL,
      whyItMatters:
        'Between the urgent trades and roofing, which is roughly where a trade that is part impulse and part project would be expected to land. It is context for paid clicks in the category and nothing more.',
      limitation: `${DENOMINATOR_CAVEAT} It also flattens the two halves of this trade into one figure, and a one-off design job and a weekly round are worth very different amounts over a year — so even within the advertising context, one conversion is not comparable to another.`,
    },

    evidenceIds: ['google-web-vitals'],
    demoId: 'landscaping',

    cta: {
      heading: 'Is your finished work doing any selling?',
      body: 'Twenty checks, five minutes, and a diagnosis written for a landscaping customer — including whether the project half and the repeating half are actually being separated.',
      auditLabel: 'Audit my landscaping website',
    },
  },

  /* ------------------------------------------------------------------ Electrical */
  {
    slug: 'electrical',
    ...meta('electrical'),
    heading: 'Websites for electrical contractors',
    lede: 'Electrical work is the one trade where the customer’s first concern is not price or speed but whether you are allowed to do this. That changes what has to be on the page, and it changes what the page can safely leave out.',
    decisionWindow:
      'A fault that keeps tripping is decided the same day. A panel upgrade or a charger installation is planned, quoted and permitted, and takes weeks.',

    journey: {
      heading: 'How an electrical customer actually arrives',
      lede: 'The searches in this trade are unusually specific, which is an advantage: somebody typing "panel upgrade" has already told you exactly which page they need.',
      steps: [
        {
          id: 'urgent',
          moment: 'The urgent one: something is tripping, sparking or dead',
          detail:
            'Half the socket ring is out, or a breaker will not stay in. It is not quite an emergency and it is not something anybody is willing to leave. They want somebody today or tomorrow.',
        },
        {
          id: 'safety',
          moment: 'Is this dangerous',
          detail:
            'The question underneath almost every electrical search, and it is rarely asked out loud. A site that answers it plainly, without either alarming them or brushing it off, has already earned the call.',
        },
        {
          id: 'licence',
          moment: 'Are you actually licensed',
          detail:
            'In no other trade on this site is the credential this close to being the whole decision. They are checking, and "licensed and insured" as a phrase in a footer is not checking-proof.',
        },
        {
          id: 'planned',
          moment: 'The planned one: a specific, named job',
          detail:
            'A panel upgrade, an EV charger, recessed lighting, a circuit for a hot tub. They know what they want and are searching for it by name — and they land on whichever site has a page about that exact thing.',
        },
        {
          id: 'permit',
          moment: 'What happens with permits and inspections',
          detail:
            'A real question with a real answer, and one that turns a small job into a project in the customer’s head if nobody explains it. Being the business that explained it is most of the advantage.',
        },
      ],
    },

    friction: {
      heading: 'Where electrical sites lose the job',
      lede: 'Four failures, and the first one is close to unique to this trade — everywhere else, credentials are reassurance. Here they are the question.',
      items: [
        {
          id: 'unverifiable-licence',
          title: 'The licence cannot be checked',
          whatHappens:
            '"Licensed and insured" appears somewhere on the site with no number, no state and nothing anybody could look up.',
          whatItCosts:
            'The customer who cared enough to look found a phrase every competitor also uses. You spent the credibility and got none of it back.',
          whatIdChange:
            'Publish the licence number and the state it is held in, on the page rather than in an image. It is already true, it is already public, and printing it is the single highest-value line on an electrician’s website.',
        },
        {
          id: 'one-button',
          title: 'One button for a dead socket and a panel upgrade',
          whatHappens:
            'A single "contact us" serving a customer who wants somebody today and a customer who wants a written quote for a four-figure job.',
          whatItCosts:
            'The urgent one is not served at all — they wanted a phone number. The planned one gets a form that treats a considered purchase like a quick question.',
          whatIdChange:
            'Two actions, visibly different: call for faults, request a quote for planned work. The wording of each should make it obvious which customer it is for.',
        },
        {
          id: 'generic-services',
          title: 'The services page is a list of nouns',
          whatHappens:
            'Wiring, lighting, panels, outlets, EV charging — twelve items in a bulleted list, each one a phrase rather than a page.',
          whatItCosts:
            'Every one of those is a search somebody is performing by name, and a list item cannot rank for, or convince anybody of, anything. The specific searches go to whoever built the specific page.',
          whatIdChange:
            'A real page for each job worth having, written as what the job involves, what it usually costs to find out, and what happens on the day.',
        },
        {
          id: 'permit-silence',
          title: 'Nothing explains permits or inspections',
          whatHappens:
            'The site quotes work as though the paperwork does not exist, then the subject comes up on the phone.',
          whatItCosts:
            'A customer who first hears about a permit during the call revises their estimate of what else has not been mentioned. It is a trust cost, not an information cost.',
          whatIdChange:
            'Say up front which jobs need a permit, who pulls it, whether an inspection is involved and what that adds to the timeline. It is dull, and it closes work.',
        },
      ],
    },

    pages: {
      heading: 'The pages an electrical contractor actually needs',
      lede: 'This trade has the most searchable job names on the site and, in most cases, the fewest pages to match them. That gap is the opportunity.',
      items: [
        {
          name: 'Electrical panel upgrades',
          why: 'A high-value, specifically-searched job that almost always sits inside a general list. It needs its own page explaining why an upgrade gets recommended and what the day looks like.',
        },
        {
          name: 'EV charger installation',
          why: 'A growing search with an unusually well-informed customer who has already read about their own car and wants to know about their own panel.',
        },
        {
          name: 'Faults, outages and troubleshooting',
          why: 'The urgent half. Written for somebody who is worried, with the phone number as the point of the page.',
        },
        {
          name: 'Lighting and rewiring',
          why: 'Planned, visual, and often part of a wider renovation — which means the visitor may be a homeowner or may be another trade.',
        },
        {
          name: 'Residential and commercial, separated',
          why: 'Two audiences with different budgets, timescales and buyers. Making each read past the other is how you lose both.',
        },
      ],
      note: 'Licence details belong on every one of these pages, not only on an About page. The customer checking is not always the one who arrived at the front door.',
    },

    benchmark: {
      category: 'Electricians & Electrical Contractors',
      conversionRate: '9.08%',
      source: LOCALIQ_SOURCE,
      sourceUrl: LOCALIQ_URL,
      dataset: LOCALIQ_DATASET,
      label: ADVERTISING_BENCHMARK_LABEL,
      whyItMatters:
        'The highest of the five trades on this site, and consistent with how the work is bought: a dead socket or a breaker that keeps tripping is a small, urgent, well-defined job, and well-defined jobs get decided quickly.',
      limitation: `${DENOMINATOR_CAVEAT} And a higher figure than the other trades on this site is not evidence that anybody’s electrical marketing is better — it reflects what is being bought, which is mostly small jobs with short decisions.`,
    },

    evidenceIds: ['google-web-vitals'],
    demoId: 'electrical',

    cta: {
      heading: 'Can a customer verify your licence in ten seconds?',
      body: 'That is one of twenty checks. About five minutes, no email address needed for the result, and the diagnosis is written for an electrical customer rather than in general terms.',
      auditLabel: 'Audit my electrical website',
    },
  },
];

const byIndustrySlug = new Map(industries.map((industry) => [industry.slug, industry]));

/** Resolves an industry page by trade slug. Returns `undefined` rather than guessing. */
export function findIndustry(slug: string): IndustryPageContent | undefined {
  return byIndustrySlug.get(slug as IndustryPageContent['slug']);
}

/**
 * Shared copy for the industry pages.
 *
 * Section headings and labels live here rather than being repeated five times, because
 * they are the parts that genuinely are the same on every page — and five copies of
 * "What it costs you" is five chances for four of them to be edited and one to be missed.
 */
export const industryShared = {
  decisionLabel: 'How long the decision takes',

  frictionLabels: {
    whatHappens: 'What happens',
    whatItCosts: 'What it costs you',
    whatIdChange: 'What I would change',
  },

  benchmark: {
    heading: 'What the published advertising data says',
    lede: 'One figure, reproduced exactly as its source published it, under the source’s own name for the category. It is included because it is the only trade-specific number on this site that anybody can check — and because what it is not is worth as much as what it is.',
    rateLabel: 'Average search-ad conversion rate',
    sourceLabel: 'Source',
    limitationLabel: 'What it does not show',
  },

  evidence: {
    heading: 'And what the research says about the rest of it',
  },

  demo: {
    heading: 'A demonstration built for this trade',
    lede: 'Not client work, and labelled as such wherever it appears. It exists to show what the decisions above look like once they are built.',
    linkLabel: 'See all five demonstrations',
  },

  offerLink: {
    heading: 'The service itself is the same whoever you are',
    body: 'What changes by trade is what the site has to say and which pages it needs. What does not change is how the work is done, what it costs, or what happens if you want to stop — those are published once, in full, on one page.',
    label: 'What is included, and what it costs',
  },
} as const;
