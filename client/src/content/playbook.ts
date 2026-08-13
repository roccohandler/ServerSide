import type {
  PlaybookPrinciple,
  PlaybookStageMeta,
  PriorityTier,
  ScorecardBand,
  ScorecardCategory,
} from '../types/content';

/*
 * ============================================================================
 * THE PLAYBOOK — THE FREE HALF, AND IT IS THE LARGER HALF
 * ============================================================================
 *
 * A lead magnet that withholds the useful part is a bait advert with a form on it. This
 * one is written the other way round: everything a service-business owner needs in order
 * to understand *what* makes a website work is on the public page, in full, unfolded.
 * The PDF adds the paperwork — audit sheets, worksheets, a printable scorecard — that
 * makes it faster to *do*.
 *
 * Somebody who reads the page and never gives me their email address should still leave
 * able to find real problems on their own website. That is the point. It is also the only
 * version that makes the paid service look like what it is: the same work, done for them,
 * by somebody who does it every day.
 *
 * ## The shape
 *
 * Twenty improvements, grouped into the six stages a visitor actually passes through.
 * The grouping is not decoration — it is what stops twenty pieces of advice reading as a
 * listicle. Numbers run 01–20 down the page, in stage order, so the sticky navigation and
 * the numbering never disagree.
 *
 * Every principle carries the same eight parts: a meta concept somebody remembers a week
 * later, what goes wrong, what it costs, the rule, what to do, a five-minute test, why it
 * matters commercially, and — where one earns its place — an example from a real trade.
 * All of those fields are *required* by `PlaybookPrinciple`, so a half-written principle
 * is a compile error rather than a gap discovered on the live page.
 *
 * ## Three rules
 *
 *   1. No invented statistics. Where research is referenced it is named, and the limits
 *      of what it actually studied are stated. Checkout research from an ecommerce lab is
 *      not a lead-conversion benchmark for a plumber.
 *   2. No promised result. "Reduces friction" and "makes the next step obvious" are
 *      defensible. "Increases leads by 30%" is not, from anybody.
 *   3. Every principle is something the reader can act on today, on their own site,
 *      without hiring anybody.
 * ============================================================================
 */

/* ------------------------------------------------------------------ the system */

/**
 * The six stages, in the order they happen.
 *
 * Somebody has to find you before your headline can be unclear at them, and no amount of
 * trust-building matters if the page took nine seconds to arrive. That sequence is the
 * argument for the grouping: each stage is a place the chain can break, and a broken link
 * early makes everything downstream irrelevant.
 */
export const playbookStages: readonly PlaybookStageMeta[] = [
  {
    id: 'found',
    number: '01',
    name: 'Get found',
    question: 'Can the right person find you at all?',
    summary:
      'Somebody in your area searches for the job they need doing. Nothing else on this list matters if they never see you.',
    icon: 'map-pin',
  },
  {
    id: 'understood',
    number: '02',
    name: 'Get understood',
    question: 'Can they tell what you do, in seconds?',
    summary:
      'They have landed. Now a stranger has to work out what you sell, whether you cover them, and where to go next — without thinking about it.',
    icon: 'layout',
  },
  {
    id: 'experienced',
    number: '03',
    name: 'Get experienced',
    question: 'Is the site comfortable to use on a phone in a driveway?',
    summary:
      'Speed, mobile, readability, colour. The parts nobody praises and everybody notices when they are wrong.',
    icon: 'bolt',
  },
  {
    id: 'trusted',
    number: '04',
    name: 'Get trusted',
    question: 'Do they believe you can do the job?',
    summary:
      'They are about to let a stranger into their home. Every unanswered question about legitimacy is a reason to call the next result.',
    icon: 'shield',
  },
  {
    id: 'contacted',
    number: '05',
    name: 'Get contacted',
    question: 'Is getting in touch effortless?',
    summary:
      'Somebody has decided. This is where that decision is either collected or quietly lost.',
    icon: 'inbox',
  },
  {
    id: 'better',
    number: '06',
    name: 'Get better',
    question: 'Do you know what is working, and are you acting on it?',
    summary:
      'A website is not finished at launch. It is a business asset that either gets managed or gets stale.',
    icon: 'target',
  },
];

export const playbook = {
  name: 'The Service Business Website PlayBook',
  subtitle:
    'Twenty improvements that turn more of the visitors you already have into calls and quote requests.',

  hero: {
    eyebrow: 'Free resource',
    heading: 'The Service Business Website PlayBook',
    lede: 'Twenty improvements that turn more of the visitors you already have into calls and quote requests. Written for the owner of a local service business, not for a designer.',
    supporting:
      'Grouped into the six things a website has to do in order: get found, get understood, get experienced, get trusted, get contacted, get better. Each improvement tells you what goes wrong, what it costs you, what to do about it, and how to check it yourself in five minutes.',
    primaryCta: 'Start reading',
    secondaryCta: 'Score your website',
    note: 'The whole thing is on this page. No email address required to read any of it.',
  },

  introduction: {
    heading: 'Your website is part of the sales conversation',
    body: [
      'Somebody with a broken furnace does not browse. They search, they open two or three results, and within a few seconds each one either earns another minute or gets closed.',
      'Everything in this PlayBook is about those few seconds and the two minutes after them: whether a stranger can find you, tell what you do, believe you can do it, and get in touch without effort. Twenty improvements, in the order those things happen.',
    ],
    chain: ['Search', 'Your website', 'The right service page', 'Proof', 'Call or quote request'],
    closing:
      'Nothing here needs a developer to understand. Most of it you can check on your own phone in the next ten minutes.',
  },

  /* ---------------------------------------------------------------- the system */

  system: {
    eyebrow: 'The framework',
    heading: 'The Lead-Ready Website System',
    lede: 'Twenty improvements is a list. These six stages are what makes it a system — each one a place the chain breaks, in the order a customer meets them.',
    closing:
      'A weak link early makes everything after it irrelevant. That is why the order matters: there is no point sharpening your calls to action if the page takes nine seconds to arrive.',
  },

  /* ---------------------------------------------------------------- principles */

  principlesHeading: 'The twenty improvements',
  principlesLede:
    'Each one is the same shape: the idea underneath it, what goes wrong, what it costs you, what to do, and a test you can run yourself in five minutes.',

  principles: [
    /* ============================================================ 01 GET FOUND */
    {
      id: 'local-relevance',
      number: '01',
      stage: 'found',
      name: 'Local relevance',
      heading: 'Make it obvious you are the right business for this place',
      metaConcept: 'Nearby is a feature. Say where you work as plainly as you say what you do.',
      uxProblem:
        'The site never names a town. The service area is "the greater area and surrounding communities", and the address is missing entirely.',
      consequence:
        'A homeowner three miles away cannot tell whether you come out to them, and a search engine has nothing to go on either. Both of them move on to a business that said so.',
      principle:
        'Name the places you actually serve, in the words locals use, where somebody looking for them would look.',
      practices: [
        'List your service area on the homepage and in the footer, as town names rather than a radius.',
        'Keep your name, address and phone number identical everywhere they appear — website, Google Business Profile, directories. Inconsistency is the most common own goal in local search.',
        'Claim and fill out your Google Business Profile properly. For most local trades it does more work than the website does.',
        'Create a page for a specific town only when you genuinely serve it and have something specific to say about it.',
        'Photographs of jobs in recognisable local places do more than any amount of "proudly serving".',
      ],
      quickTest:
        'Open your homepage and count how many seconds it takes to find a town name. If it is more than five, or there is none, that is the fix.',
      whyItMatters:
        'Local intent is the most valuable traffic a service business gets — somebody searching for a plumber near them is closer to buying than almost any other visitor. Being unclear about geography throws that away at the first hurdle.',
      example: {
        weakLabel: 'Weak',
        weak: 'Serving the greater area and surrounding communities',
        strongLabel: 'Clearer',
        strong: 'Landscaping and yard care in Kirkland, Redmond, Bellevue and Sammamish',
        note: 'The second one answers "do you come to me?" before it is asked. The first one requires a phone call to find out, and most people will not make it.',
      },
      warning:
        'Do not generate fifty near-identical town pages with the place name swapped. It is obvious to a reader, it is obvious to a search engine, and it makes a real business look like a spam operation.',
      relatedPrinciples: ['search-intent'],
      serviceNote:
        'Local-search foundation and Google Business Profile review are part of the launch, and kept current as the service area changes.',
    },
    {
      id: 'search-intent',
      number: '02',
      stage: 'found',
      name: 'Search intent',
      heading: 'Answer the question they actually typed',
      metaConcept: 'Write for the search someone makes, not the service you named internally.',
      uxProblem:
        'Pages are titled after internal categories — "Residential Solutions", "HVAC Services" — rather than after the jobs customers ask for.',
      consequence:
        'Nobody searches for a solution. They search for "AC not blowing cold" and "air conditioner repair Bellevue", and a page that never uses those words is invisible to them.',
      principle:
        'Name each page after the job somebody is trying to get done, in the words they would use to describe it.',
      practices: [
        'Listen to how customers describe the problem on the phone, and use exactly those words.',
        'Separate the two kinds of visitor: someone with a problem right now, and someone researching a bigger job. They need different pages.',
        'Answer the questions you get asked on every call — price ranges, timescales, what is included — where they can be read without calling.',
        'Write one page per job, properly, rather than ten thin pages stuffed with variations.',
        'Write for the person first. If a sentence exists to contain a phrase, delete it.',
      ],
      quickTest:
        'Write down the last five things a customer said when they called you. Search your own site for those words. If they are not on it, you have found five pages worth writing.',
      whyItMatters:
        'Matching the customer’s own language is the cheapest way to be found by people who are ready to buy, and it makes the page better for everybody who lands on it — including the ones who arrived some other way.',
      example: {
        weakLabel: 'Weak',
        weak: 'HVAC Solutions',
        strongLabel: 'Clearer',
        strong: 'Air conditioner repair in Bellevue',
        note: 'The second names a job and a place. It is what somebody types, and it is what they want to see at the top of the page they land on.',
      },
      warning:
        'Keyword stuffing is obvious and it reads badly. If a human would not say the sentence out loud, it does not belong on the page.',
      relatedPrinciples: ['local-relevance', 'service-pages'],
      serviceNote: null,
    },

    /* ======================================================== 02 GET UNDERSTOOD */
    {
      id: 'clarity',
      number: '03',
      stage: 'understood',
      name: 'Clarity',
      heading: 'Make it obvious in one glance',
      metaConcept: 'A stranger should understand your business before they have to think.',
      uxProblem:
        'The first screen says something that could belong to any business in any industry.',
      consequence:
        'The visitor has to work out whether you are relevant. Some of them will not, and the ones who do have spent their patience before they reach your services.',
      principle:
        'Say what you do, who you do it for, and where — in the first sentence somebody reads.',
      practices: [
        'Answer five questions above the fold: what you do, who for, where, why you, and what to do next.',
        'Name the service and the area in the headline.',
        'Cut anything that would still be true if a competitor wrote it.',
        'Use the words your customers use. They search for "boiler not working", not "HVAC remediation".',
      ],
      quickTest:
        'Show your homepage to somebody who does not know what you do, for five seconds, then take it away. Ask them what the business sells and where. If they cannot say, the headline is the problem.',
      whyItMatters:
        'Clarity costs nothing and compounds: every visitor from every source arrives on a page that either explains itself or does not. It is the highest-leverage sentence on the whole site.',
      example: {
        weakLabel: 'Weak',
        weak: 'Quality You Can Count On',
        strongLabel: 'Clearer',
        strong: '24/7 emergency plumbing in Greater Seattle',
        note: 'The second one tells a stranger the service, the availability and the area before they have scrolled. The first one tells them nothing they could not have assumed.',
      },
      relatedPrinciples: ['first-screen'],
      serviceNote: null,
    },
    {
      id: 'first-screen',
      number: '04',
      stage: 'understood',
      name: 'The first screen',
      heading: 'Earn the next thirty seconds',
      metaConcept: 'The first screen has one job: buy you enough attention to make the case.',
      uxProblem:
        'The first screen is a large photograph, a slogan, and a cookie banner. Everything that would help somebody decide is below the fold.',
      consequence:
        'The visitor has to scroll to find out whether they are in the right place. Some do. The ones who came from a search result with three other tabs open frequently do not.',
      principle:
        'Judge the first screen as a whole, not as a headline: relevance, service, geography, proof, and one obvious action, with nothing competing.',
      practices: [
        'Look at what is genuinely visible on a phone before any scrolling. That is your first screen — not the desktop hero.',
        'Make sure the service, the area and the next step are all in it.',
        'Put one piece of proof there — licensed, insured, a review score, years in business — where it supports the claim above it.',
        'Remove anything that competes: autoplaying video, a carousel that has moved on before it is read, a chat bubble covering the call button.',
        'If a cookie banner or popup covers the first screen, fix that before anything else on this list.',
      ],
      quickTest:
        'The five-second test. Open your homepage on a phone, screenshot it without scrolling, and check it answers: what, where, why you, and what next. Four out of four or it needs work.',
      whyItMatters:
        'Every paid click, every search result and every referral lands here. Improving the first screen improves the return on every other marketing thing you do, all at once.',
      chain: [
        'Arrive',
        'Recognise the service',
        'Recognise the area',
        'See a reason to trust',
        'See what to do',
      ],
      relatedPrinciples: ['clarity', 'hierarchy'],
      serviceNote: null,
    },
    {
      id: 'hierarchy',
      number: '05',
      stage: 'understood',
      name: 'Visual hierarchy',
      heading: 'Tell their eyes where to go',
      metaConcept:
        'Design should say what matters first. When everything shouts, nothing is heard.',
      uxProblem:
        'Every heading is the same size, every box has the same weight, and four buttons compete for the same attention.',
      consequence:
        'When everything is emphasised, nothing is. The visitor has to read the whole page to find the one thing they needed.',
      principle: 'Decide what matters first, second and third — then make the page show it.',
      practices: [
        'One clear first thing per screen. Everything else supports it or waits.',
        'Use size, weight and space to signal importance, not colour alone.',
        'Give the primary action more visual weight than anything near it.',
        'Use whitespace to group related things. Space is what makes a page scannable.',
        'Squint at your own page. Whatever you still see is what the page is emphasising — check it is what you meant.',
      ],
      quickTest:
        'Blur your homepage — screenshot it and apply a heavy blur, or just take your glasses off. The shapes that remain should be the headline and the primary button. If a stock photo dominates, the hierarchy is wrong.',
      whyItMatters:
        'People do not read web pages, they scan them. Hierarchy is how a scanner finds what they came for, and it is the difference between a page that feels effortless and one that feels like work.',
      relatedPrinciples: ['first-screen', 'colour'],
      serviceNote: null,
    },
    {
      id: 'navigation',
      number: '06',
      stage: 'understood',
      name: 'Navigation',
      heading: 'Give them a route, not a maze',
      metaConcept:
        'Organise the site around the decision a customer is making, not your org chart.',
      uxProblem:
        'The menu has eleven items in it, including "Home", "Our Team", "Gallery", "News" and a dropdown four levels deep. The services are inside a submenu.',
      consequence:
        'Somebody who wants roof repair has to find it. Every extra decision is a chance to give up, and on a phone a deep menu is genuinely hard to operate.',
      principle:
        'Build navigation around what customers are trying to do, and put the services where they can be seen rather than found.',
      practices: [
        'Lead with services. They are what people came for.',
        'Aim for five or six top-level items. If there are eleven, some of them belong in the footer.',
        'Name links after what is behind them. "Services" beats "What we do"; the actual service name beats both.',
        'Follow the decision, not the department: problem → service → proof → what happens next → get in touch.',
        'Make sure every important page is reachable in one move from the homepage.',
      ],
      quickTest:
        'From your homepage, count the taps to reach the page for your most profitable service. More than one and it is buried.',
      whyItMatters:
        'Navigation is the difference between a visitor finding your best-converting page and never seeing it. It costs nothing to fix and it affects every visit.',
      example: {
        weakLabel: 'Organised for you',
        weak: 'Home · About · Our Team · Services ▾ · Gallery · News · Careers · Contact',
        strongLabel: 'Organised for them',
        strong: 'Kitchen remodels · Bathrooms · Additions · Our work · Service area · Get a quote',
        note: 'The second menu is a list of what a remodelling customer might want. The first is a list of the things the business has.',
      },
      relatedPrinciples: ['service-pages', 'friction'],
      serviceNote: null,
    },

    /* ======================================================= 03 GET EXPERIENCED */
    {
      id: 'speed',
      number: '07',
      stage: 'experienced',
      name: 'Speed',
      heading: 'Make it fast enough that the website is not the problem',
      metaConcept: 'Do not make somebody wait to find out whether you are relevant to them.',
      uxProblem: 'The visitor waits, watching a blank screen or a page that jumps around.',
      consequence:
        'They cannot start evaluating you until the page arrives. Some of them will not wait, and you never know it happened.',
      principle:
        'Get the useful part of the page on screen quickly, and stop it moving once it is there.',
      practices: [
        'Open your own site on a phone, on mobile data, away from your wi-fi. That is the real test.',
        'Resize photographs before uploading them. A 4MB photo from a phone camera is the single most common cause of a slow service-business website.',
        'Give images width and height so the page does not jump as they load.',
        'Put the headline, the phone number and the main action in the part that loads first.',
        'Be honest about whether every plugin, chat widget and tracking script is earning its place.',
      ],
      quickTest:
        'Run your homepage through Google PageSpeed Insights and read the mobile score. Then do the real test: open it on your phone, on mobile data, standing outside.',
      whyItMatters:
        'Speed is the one improvement that helps every visitor from every source, on the worst connection, without them ever noticing it happened. It is also usually the cheapest thing on this list to fix.',
      research:
        'Google measures this as Core Web Vitals: how quickly the main content appears (LCP, target 2.5 seconds or under), how quickly the page responds when tapped (INP, target under 200 milliseconds), and how much the layout shifts while loading (CLS, target under 0.1). Google recommends good scores for the experience they represent — and says plainly that good scores alone do not buy you a ranking.',
      serviceNote:
        'Performance is monitored rather than assumed as part of ongoing website management.',
    },
    {
      id: 'mobile',
      number: '08',
      stage: 'experienced',
      name: 'Mobile',
      heading: 'Design for the device your customers actually hold',
      metaConcept: 'Build for the hand holding the phone, not the monitor on the desk.',
      uxProblem:
        'A desktop layout squeezed onto a phone: tiny text, buttons too close together, a menu that takes two taps to open.',
      consequence:
        'Your customer is standing in a driveway with one hand free. Every pinch and zoom is a reason to go back to the results page.',
      principle: 'Design the phone version first, then widen it. Not the other way round.',
      practices: [
        'Body text no smaller than 16px, so phones do not zoom your form fields when tapped.',
        'Tap targets big enough to hit without aiming — roughly a fingertip, with space around them.',
        'Make the phone number a link. On a phone it should dial, not select.',
        'Put the service somebody came for above the company history.',
        'Keep the primary action reachable with a thumb, not stranded at the top of a long page.',
        'Check it on a real phone, not a narrow browser window.',
      ],
      quickTest:
        'Open your site on your own phone, one-handed, outside, in daylight. Try to call yourself from it. If any part of that was awkward, that is the fix.',
      whyItMatters:
        'For most local service businesses the majority of visitors arrive on a phone, often mid-problem and mid-errand. The phone experience is not a version of the website — it is the website.',
      example: {
        weakLabel: 'Weak',
        weak: 'Contact us · (206) 555-0134 — in the footer, in grey, as plain text',
        strongLabel: 'Clearer',
        strong: 'A tappable Call now button in the header of every page, above the fold',
        note: 'A garage door that will not close is not a browsing situation. The number needs to be one thumb away from wherever they are.',
      },
      relatedPrinciples: ['accessibility', 'cta'],
      serviceNote: null,
    },
    {
      id: 'accessibility',
      number: '09',
      stage: 'experienced',
      name: 'Accessibility',
      heading: 'If they cannot read it or operate it, nothing else matters',
      metaConcept:
        'Accessible and usable are the same thing seen from different sides. Both are lost conversions when they are wrong.',
      uxProblem:
        'Light grey text on white, form fields with no labels, buttons that are really coloured divs, and errors announced only by turning a border red.',
      consequence:
        'Somebody with less than perfect sight, or bright sunlight, or a keyboard instead of a mouse, cannot complete the thing they came to do. They are not a niche — they are your customers, in a driveway, in the sun.',
      principle:
        'Make it readable, operable and understandable, and never convey something with colour alone.',
      practices: [
        'Contrast: dark text on light backgrounds, and check the grey ones. Most "elegant" light grey body text fails.',
        'Every form field gets a real label above it, not placeholder text that vanishes when somebody types.',
        'Everything you can click, you can also reach with the Tab key — and you can see where you are while doing it.',
        'Use real buttons and real links. A div with a click handler is invisible to a screen reader.',
        'Write alt text for images that carry meaning, and leave it empty for decoration.',
        'Errors say what to fix, in words, next to the field they belong to.',
      ],
      quickTest:
        'Put your mouse down and press Tab through your contact form. If you cannot see where you are, or cannot reach the submit button, that is the fix. Then read your body text in direct sunlight.',
      whyItMatters:
        'This is usability for everybody, discovered by the people for whom it is not optional. It also makes the site more robust for search engines, which read a page much the way a screen reader does.',
      warning:
        'An accessibility overlay widget is not a fix. It is a monthly fee that leaves the underlying problems in place, and it is widely disliked by the people it claims to help.',
      relatedPrinciples: ['mobile', 'forms', 'colour'],
      serviceNote: 'Accessibility is treated as part of the build, not as an upgrade.',
    },
    {
      id: 'colour',
      number: '10',
      stage: 'experienced',
      name: 'Colour and brand',
      heading: 'Use colour to signal priority, not to decorate',
      metaConcept: 'Colour is a way of pointing. Point at one thing.',
      uxProblem:
        'Five accent colours, a call-to-action button the same shade as the header, and important warnings in a red that also appears on three decorative elements.',
      consequence:
        'Colour stops meaning anything. The visitor has no signal for what is important, and the action you want them to take blends into the furniture.',
      principle:
        'One brand colour, one action colour, a neutral scale for everything else — and enough contrast that all of it is legible.',
      practices: [
        'Reserve one colour for the primary action, and use it for nothing else.',
        'Keep a small neutral scale for text, borders and backgrounds. Most of a good page is neutral.',
        'Use the same colours for the same meanings everywhere: success, warning, error.',
        'Check contrast rather than trusting your monitor. Light grey on white is the usual offender.',
        'Consistency between your van, your invoices and your website is worth more than any particular palette.',
      ],
      quickTest:
        'Screenshot your homepage and count the distinct accent colours. More than two and the primary action is competing with decoration.',
      whyItMatters:
        'A consistent, restrained palette makes a small business look established, and it makes the one button you actually want pressed impossible to miss.',
      relatedPrinciples: ['hierarchy', 'accessibility'],
      serviceNote: null,
    },

    /* ========================================================== 04 GET TRUSTED */
    {
      id: 'trust',
      number: '11',
      stage: 'trusted',
      name: 'Trust',
      heading: 'Give them a reason to believe you',
      metaConcept: 'Replace claims with evidence. Anyone can claim.',
      uxProblem:
        'Stock photography, no address, no licence details, and testimonials that could have been written by anybody.',
      consequence:
        'A stranger is about to let you into their house. Every unanswered question about legitimacy is a reason to call the next result instead.',
      principle:
        'Trust is not built by looking expensive. It is built by giving people checkable reasons to believe you.',
      practices: [
        'Photographs of your own finished work beat stock images every time. Phone photos are fine.',
        'Licence and insurance details where somebody looking for them would look.',
        'Reviews with a real first name and a real town, published with permission.',
        'A real address or at least a real service area, and a phone number that a person answers.',
        'Say how long you have been doing this, if it is a while. Say who does the work.',
      ],
      quickTest:
        'Open your homepage and list everything a stranger could check independently — a licence number, a named person, a real review, a photo of your own work. If the list is empty, that is where to start.',
      whyItMatters:
        'In a trade where the customer is choosing between three near-identical search results, checkable evidence is often the entire difference. It is also the cheapest asset you already own and probably are not using.',
      example: {
        weakLabel: 'Claim',
        weak: 'Trusted pest control professionals with a commitment to excellence',
        strongLabel: 'Evidence',
        strong:
          'Licensed WA structural pest inspector #12345 · Insured · 400+ inspections in Snohomish County',
        note: 'The second one can be checked. That is the whole difference, and it is why it works.',
      },
      warning:
        'Do not invent testimonials, buy badges, or display certifications you do not hold. It is the fastest way to lose the trust you are trying to build, and in some trades it is worse than that.',
      relatedPrinciples: ['proof', 'expectations'],
      serviceNote: null,
    },
    {
      id: 'proof',
      number: '12',
      stage: 'trusted',
      name: 'Proof placement',
      heading: 'Put the evidence next to the claim it supports',
      metaConcept: 'Proof works where the doubt is, not on a separate page called Testimonials.',
      uxProblem:
        'All the reviews live on one page, in a wall, sorted by nothing. The claims live on the service pages, unsupported.',
      consequence:
        'The doubt happens where the claim is made. By the time somebody reaches the testimonials page — if they ever do — they have already decided.',
      principle: 'Every significant claim should have its evidence within sight of it.',
      practices: [
        'Put the customer review that mentions punctuality next to the claim about punctuality.',
        'Put a photograph of that exact kind of job on the page selling that job.',
        'Put licence and insurance details beside the service where a customer worries about it most.',
        'Use specific numbers you can stand behind — jobs completed, years, response times you actually meet.',
        'Keep a testimonials page if you like, but treat it as an archive rather than as the argument.',
      ],
      quickTest:
        'Take your most-visited service page and list every claim it makes. For each one, ask what is on that page that would let a sceptic verify it. Most pages score zero.',
      whyItMatters:
        'The same reviews you already have work several times harder when they are placed where the doubt occurs, which makes this one of the few improvements that costs nothing but arrangement.',
      example: {
        weakLabel: 'Unsupported',
        weak: 'We turn up when we say we will.',
        strongLabel: 'Supported, in place',
        strong:
          '"Booked Tuesday, painted Thursday, and they cleaned up." — Marie, Ballard · shown directly beneath the scheduling promise',
        note: 'Same review, same claim. Moving one next to the other is the entire change.',
      },
      warning:
        'Only publish a review somebody actually wrote, with their permission. A fabricated quote is the one mistake on this whole list that a business does not recover from.',
      relatedPrinciples: ['trust'],
      serviceNote: null,
    },
    {
      id: 'expectations',
      number: '13',
      stage: 'trusted',
      name: 'Expectations',
      heading: 'Tell them what happens after they contact you',
      metaConcept: 'Uncertainty is friction, even for somebody who has already decided to buy.',
      uxProblem:
        'The form says "Submit". What happens next — who calls, when, whether it costs anything, whether somebody is coming to the house — is not stated anywhere.',
      consequence:
        'A visitor who wants the work done still hesitates, because they do not know what they are starting. Some of them go and find a business that told them.',
      principle:
        'Describe what happens after contact, in order, in plain language — and only promise what you actually do.',
      practices: [
        'Write out the steps: what happens first, who does it, roughly when, and what it costs.',
        'Say whether a quote is free, and whether a visit is needed to give one.',
        'Say what you need from them so the first call is productive.',
        'Put it next to the form and next to the phone number, not on a separate page.',
        'Set a response expectation you can genuinely meet every time, including on a Friday.',
      ],
      quickTest:
        'Read your own contact page as somebody who has never spoken to you. Can you tell what happens in the next 24 hours if you send the form? If not, write those three sentences.',
      whyItMatters:
        'This is the cheapest anxiety reduction available, and it works at the exact moment somebody is deciding whether to commit. It also produces better first calls, because the customer arrives knowing what to expect.',
      chain: [
        'Request a quote',
        'We call to understand the job',
        'We confirm details and price',
        'We book the visit',
      ],
      warning:
        'Do not publish a response time you cannot keep. A missed promise here is worse than no promise, because it is the first thing you told them and the first thing you broke.',
      relatedPrinciples: ['trust', 'forms'],
      serviceNote: null,
    },

    /* ======================================================== 05 GET CONTACTED */
    {
      id: 'cta',
      number: '14',
      stage: 'contacted',
      name: 'Calls to action',
      heading: 'Give them one obvious next step',
      metaConcept: 'When somebody is ready, do not make them work out what to do.',
      uxProblem:
        'Six buttons that all say "Learn more", and the phone number in the footer in grey.',
      consequence:
        'A visitor who has decided to get in touch should never have to look for how. Making them hunt is where interest quietly dies.',
      principle:
        'One primary action per page, repeated where it makes sense, worded as an outcome.',
      practices: [
        'Say what happens: "Request a quote", "Book an inspection", "Call now" — not "Submit" or "Learn more".',
        'Keep one primary action per page. A secondary, lower-commitment option is fine; a third is noise.',
        'Put the action where the decision happens, not only at the bottom.',
        'Make the phone number tappable on every page, in the header.',
        'Give the primary action more visual weight than anything competing with it.',
      ],
      quickTest:
        'Open any page of your site and ask what the single thing is that you want a visitor to do. If you cannot answer in one word, neither can they.',
      whyItMatters:
        'Every other improvement on this list exists to get somebody to this moment. A weak call to action wastes all of them at once.',
      example: {
        weakLabel: 'Weak',
        weak: 'Submit · Learn more · Click here',
        strongLabel: 'Clearer',
        strong: 'Book a free electrical safety check · Call now',
        note: 'The second names what the visitor gets. The first names what the visitor has to do for you.',
      },
      relatedPrinciples: ['friction', 'hierarchy'],
      serviceNote: null,
    },
    {
      id: 'forms',
      number: '15',
      stage: 'contacted',
      name: 'Forms',
      heading: 'Do not make people work to contact you',
      metaConcept: 'Every unnecessary field is another chance to lose the lead.',
      uxProblem:
        'Eleven fields, half of them required, including how they heard about you and their budget range.',
      consequence:
        'Every field is another reason to give up, and most of what is being asked could have been worked out in the first reply.',
      principle: 'Ask for what you actually need to take the next step. Nothing else.',
      practices: [
        'Ask only what you need to reply and to quote. Everything else can wait for the conversation.',
        'Use real labels above the field, not placeholder text that vanishes when somebody types.',
        'Use the right input types so phones show the right keyboard and offer to autofill.',
        'Write errors that say what to fix: "Enter a valid email address", not "Invalid input".',
        'Never clear what somebody typed because the send failed.',
        'Say what happens next once it is sent, and show a confirmation that is unmistakably a confirmation.',
      ],
      quickTest:
        'Submit your own form. Did it arrive? Then count the fields and, for each one, ask whether you could reply and give a rough price without it. Every "yes" is a field to cut.',
      whyItMatters:
        'The form is the last step before a lead becomes yours. Friction here does not lose you browsers — it loses you people who had already decided.',
      example: {
        weakLabel: 'Weak',
        weak: 'Name · Email · Phone · Address · Property type · Square footage · Budget range · How did you hear about us? · Preferred contact time · Message',
        strongLabel: 'Clearer',
        strong: 'Name · Phone · What needs cleaning, and roughly when',
        note: 'Everything cut from the first list can be asked on the call that the second list produces.',
      },
      research:
        'Baymard Institute has studied form and checkout usability at length and consistently finds unnecessary fields to be a significant source of friction. That research is largely about ecommerce checkout rather than service-business enquiry forms, so treat it as support for the principle — ask for less — rather than as a benchmark for how many fields a quote form should have.',
      warning:
        'There is no universal correct number of fields. The right number is the number you genuinely need to take the next step, which for a quote request is usually three or four.',
      relatedPrinciples: ['friction', 'accessibility', 'expectations'],
      serviceNote: null,
    },
    {
      id: 'service-pages',
      number: '16',
      stage: 'contacted',
      name: 'Service pages',
      heading: 'Give every service you sell its own page',
      metaConcept: 'Build pages around the jobs customers buy, not the way you are organised.',
      uxProblem:
        'One "Services" page listing nine things in a bulleted list, each with a sentence.',
      consequence:
        'Somebody searching for the specific job you want to be hired for has nothing to land on, and nothing that convinces them you do that particular work well.',
      principle:
        'One page per service you actually want more of, written the way a customer describes the job.',
      practices: [
        'Start with the problem in the customer’s words, not with your process.',
        'Say what is included, what it typically costs or what it depends on, and how long it takes.',
        'Show proof of that exact kind of job — photos, a review from that service.',
        'Answer the questions you get asked on every call about it.',
        'End with the same clear action as everywhere else, and link to the services somebody often needs alongside it.',
      ],
      quickTest:
        'List the services you want more of. For each, ask whether it has its own page you would be happy to send a stranger to. The gaps are the pages to write next.',
      whyItMatters:
        'Service pages are where search intent, proof and the call to action meet. They are usually the highest-converting pages on a service-business website, and most sites do not have any.',
      example: {
        weakLabel: 'Weak',
        weak: 'Services: furnace repair, AC install, heat pumps, ducts, maintenance plans…',
        strongLabel: 'Clearer',
        strong:
          'A dedicated furnace repair page: the symptoms, what a call-out includes, typical timescales, photos of the work, and one action.',
        note: 'The list tells somebody you offer it. The page convinces them you are the one to call.',
      },
      relatedPrinciples: ['search-intent', 'navigation'],
      serviceNote:
        'A repeatable service page structure is set up at launch, so adding one next year is a small job.',
    },
    {
      id: 'friction',
      number: '17',
      stage: 'contacted',
      name: 'Friction',
      heading: 'Count the things a motivated customer has to figure out',
      metaConcept:
        'Every unnecessary step is a leak in the sales process. Find the leaks before adding traffic.',
      uxProblem:
        'Nothing is broken exactly. It is just that the service is three clicks in, the phone number is text rather than a link, a popup covers the form, and the confirmation page says "Thank you" and nothing else.',
      consequence:
        'None of these lose everybody. Each loses a few, and they compound — which is why a site can look fine and still convert badly.',
      principle:
        'Walk your own site as a customer with a problem, and remove every step that does not have to be there.',
      practices: [
        'Count the clicks from landing to phoning, and from landing to submitting a quote request. Both should be very small numbers.',
        'Remove or delay popups. A newsletter modal over a service page is a tax on your own leads.',
        'Check every link and form on the site, on a phone, this month.',
        'Fix anything that makes somebody go back: a dead end page, a missing service, an unclear service area.',
        'Read your confirmation page. "Thank you" is not a confirmation — it should say what happens next.',
      ],
      quickTest:
        'Time yourself. From your homepage on a phone, how many seconds to start a phone call? How many to submit a quote request? Write both numbers down; they are your baseline.',
      whyItMatters:
        'Friction is the cheapest thing on this list to fix and the easiest to ignore, because nothing about it looks broken. It is also where most of the loss in a decent-looking website actually happens.',
      chain: [
        'Land',
        'Find the service',
        'Believe it',
        'Find the action',
        'Complete it',
        'Know it worked',
      ],
      relatedPrinciples: ['forms', 'navigation', 'cta'],
      serviceNote:
        'A conversion review of the site you have now is the free first step, and finding this kind of thing is most of what it does.',
    },
    {
      id: 'message-match',
      number: '18',
      stage: 'contacted',
      name: 'Message match',
      heading: 'Keep the promise that earned the click',
      metaConcept: 'The conversation that started in the advert should continue on the page.',
      uxProblem:
        'The advert promises same-week tree removal. The click lands on a homepage that opens with the company history.',
      consequence:
        'You paid for that click. The visitor now has to work out whether they are in the right place, and a proportion of them decide they are not.',
      principle:
        'The page should repeat the promise, in the same words, and offer the action the advert implied.',
      practices: [
        'Match the headline to the advert’s promise, using the advert’s words.',
        'Match the offer. If the advert said free estimate, the page says free estimate.',
        'Match the action. If the advert implied a call, the call button is the primary action.',
        'Send campaign traffic to a page about that service, not to the homepage.',
        'Do the same for your Google Business Profile links, referral links and email campaigns.',
      ],
      quickTest:
        'Click your own advert, or your own Google Business Profile link, on a phone. Read the first screen. Does it repeat what you were just promised? If not, that is the highest-value fix you have.',
      whyItMatters:
        'This is the one improvement with a direct, immediate effect on money you are already spending. Every mismatched click is paid for twice: once to the platform, and once in the customer you did not get.',
      research:
        'Google’s own advertising guidance recommends that landing pages closely match the advert and the keyword, and that the page’s call to action reflect what the advert asked the visitor to do.',
      relatedPrinciples: ['service-pages', 'first-screen'],
      serviceNote:
        'Campaign landing pages and message alignment are part of the monthly service — website work only, not ad management.',
    },

    /* =========================================================== 06 GET BETTER */
    {
      id: 'measurement',
      number: '19',
      stage: 'better',
      name: 'Measurement',
      heading: 'Count the things that are actually worth counting',
      metaConcept: 'Traffic is not the outcome. Contact is.',
      uxProblem:
        'Analytics is installed, nobody has looked at it, and the only number anybody quotes is visits.',
      consequence:
        'Every decision about the website becomes an opinion, including yours and mine. You cannot tell a good month from a lucky one.',
      principle:
        'Count the actions that mean somebody is trying to hire you, and use them to decide what to fix next.',
      practices: [
        'Count phone taps. On a phone they are most of your enquiries and they are invisible by default.',
        'Count form starts and form submissions separately. The gap between them is your form problem, measured.',
        'Watch which service pages actually produce enquiries, and put your effort there.',
        'Record where enquiries come from, even if it is just asking on the call.',
        'Look at it once a month. An unread dashboard is not measurement.',
      ],
      quickTest:
        'Answer these without opening anything: how many people contacted you through the website last month, and which page did most of them come from? If you cannot, that is the gap.',
      whyItMatters:
        'Measurement is what turns the other nineteen improvements from a to-do list into an order of work. Without it, the next change is a guess — an educated one, but a guess.',
      chain: ['Traffic', 'Engagement', 'Intent', 'Contact', 'Opportunity'],
      warning:
        'More traffic is not the goal and never was. A page that gets fewer visitors and more calls has improved.',
      relatedPrinciples: ['continuous-improvement'],
      serviceNote:
        'Analytics and conversion tracking are configured at launch, and what they show is explained in plain English rather than emailed as a dashboard.',
    },
    {
      id: 'continuous-improvement',
      number: '20',
      stage: 'better',
      name: 'Continuous improvement',
      heading: 'Treat the website as an asset, not as a finished brochure',
      metaConcept: 'A website is never done. It is either being managed or it is going stale.',
      uxProblem:
        'The site was built three years ago, the services have changed twice since, and the last update was a phone number correction in 2024.',
      consequence:
        'It slowly stops describing the business. Competitors who change theirs four times a year look more current, more active and more like a going concern.',
      principle: 'Build, launch, measure, learn, improve — then do it again.',
      practices: [
        'Put a recurring hour in the calendar to look at the numbers and change one thing.',
        'Bring the service people need this season to the front, and move the out-of-season one down.',
        'Add new photographs of finished work as you take them. They are the cheapest trust you will ever get.',
        'Improve the pages that already produce enquiries before rebuilding the ones that do not.',
        'Fix what is broken as you find it. Small and constant beats a redesign every four years.',
      ],
      quickTest:
        'When did you last change something on your website on purpose, because of something you had learned? If the answer is a year or more, that is the habit to start.',
      whyItMatters:
        'The compounding is the point. A website improved a little every month for two years is a different asset from one rebuilt from scratch every four — and it costs less, spread out, with no period of being offline and wrong.',
      chain: ['Build', 'Launch', 'Measure', 'Learn', 'Improve', 'Repeat'],
      warning:
        'Formal A/B testing only produces useful evidence when there is enough traffic for a difference to mean something. Most local service businesses will not have that in a given month, and running a test anyway just measures noise. Use judgement, analytics and known usability principles instead — and call it what it is.',
      relatedPrinciples: ['measurement'],
      serviceNote:
        'This is the whole argument for a monthly service rather than a one-off build: somebody whose job it is to keep doing this.',
    },
  ] satisfies readonly PlaybookPrinciple[],

  /* ---------------------------------------------------------------- priorities */

  /*
   * The static priority tiers, for a reader who has not scored anything.
   *
   * The personalised version — your own five weakest categories, in order — comes out of
   * the assessment and sits beside this. Both exist because somebody who skims the page
   * and leaves should still know where to start, and somebody who does the work should
   * get something better than a fixed list.
   */
  priorities: {
    eyebrow: 'Where to start',
    heading: 'You do not have twenty jobs. You have three.',
    lede: 'If you have not scored your site yet, work in this order. It is roughly impact divided by effort for most service businesses.',

    tiers: [
      {
        id: 'now',
        label: 'Priority 1',
        heading: 'Fix immediately',
        body: 'These affect every visitor from every source, and most of them are an afternoon rather than a project.',
        principleIds: ['clarity', 'mobile', 'cta', 'speed', 'trust'],
      },
      {
        id: 'next',
        label: 'Priority 2',
        heading: 'Fix next',
        body: 'These need a little more thought and usually some writing, and they are where the compounding starts.',
        principleIds: ['service-pages', 'forms', 'navigation', 'local-relevance', 'expectations'],
      },
      {
        id: 'ongoing',
        label: 'Priority 3',
        heading: 'Improve continuously',
        body: 'These are not one-off jobs. They are the habits that keep the site earning after the fixes are done.',
        principleIds: [
          'measurement',
          'message-match',
          'proof',
          'search-intent',
          'friction',
          'first-screen',
          'hierarchy',
          'colour',
          'accessibility',
          'continuous-improvement',
        ],
      },
    ] satisfies readonly PriorityTier[],

    closing:
      'Nothing in Priority 1 needs a rebuild, a developer or a budget approval. If those five are already right, the rest of this list is where your remaining opportunity is.',
  },

  /* ---------------------------------------------------------------- don't */

  dontDoThis: {
    heading: 'And a few things not to do',
    items: [
      'Write a headline that would work for any business in any trade.',
      'Make every button say "Learn more".',
      'Hide the phone number in the footer.',
      'Make people pinch and zoom to read anything.',
      'Ask for a budget range before you have said hello.',
      'Use five competing accent colours.',
      'Put a full-screen animation in front of the information.',
      'Publish a review nobody actually wrote.',
      'Give every section the same visual weight.',
      'Add a chat widget that covers the call button on a phone.',
      'Generate fifty town pages with the place name swapped.',
      'Buy an accessibility overlay instead of fixing the contrast.',
      'Rebuild the whole thing every four years instead of improving it every month.',
    ],
  },

  /* ---------------------------------------------------------------- scorecard */

  scorecard: {
    eyebrow: 'The assessment',
    heading: 'Score your own website',
    lede: 'Twenty categories, two points each, forty available. Be harsh — the point is to find the weak ones, not to feel good about the total.',
    disclaimer:
      'Illustrative self-assessment. These bands are a way of organising what to do next, not a validated benchmark, and nobody has calibrated them against anybody’s revenue. A low score does not predict a bad business, and a high one does not promise a good month.',

    instructions:
      'Score each category as you find it today, not as you intend it to be. Your five weakest categories become your work list.',
    totalLabel: 'Your score',
    resetLabel: 'Clear my answers',
    unscoredLabel: 'Not scored yet',
    storageNote:
      'Your answers stay in this browser and are never sent anywhere. Clearing them removes them completely.',

    scale: [
      { value: '0', label: 'Missing' },
      { value: '1', label: 'Needs work' },
      { value: '2', label: 'Strong' },
    ],

    /*
     * One category per improvement, in the same order, each pointing back at the
     * principle that explains it — so a low score always has somewhere to send the
     * reader. A test asserts every `principleId` resolves.
     */
    categories: [
      {
        id: 'local-relevance',
        principleId: 'local-relevance',
        stage: 'found',
        label: 'Local relevance',
        prompt: 'Can a stranger tell within seconds which towns you serve?',
      },
      {
        id: 'search-intent',
        principleId: 'search-intent',
        stage: 'found',
        label: 'Search intent',
        prompt: 'Are your pages named after the jobs customers search for?',
      },
      {
        id: 'clarity',
        principleId: 'clarity',
        stage: 'understood',
        label: 'Clarity',
        prompt: 'Can a stranger tell what you do and where, in five seconds?',
      },
      {
        id: 'first-screen',
        principleId: 'first-screen',
        stage: 'understood',
        label: 'The first screen',
        prompt: 'Does the first phone screen answer what, where, why you and what next?',
      },
      {
        id: 'hierarchy',
        principleId: 'hierarchy',
        stage: 'understood',
        label: 'Visual hierarchy',
        prompt: 'Is it obvious what matters most on each page?',
      },
      {
        id: 'navigation',
        principleId: 'navigation',
        stage: 'understood',
        label: 'Navigation',
        prompt: 'Can they reach the service they came for in one move?',
      },
      {
        id: 'speed',
        principleId: 'speed',
        stage: 'experienced',
        label: 'Speed',
        prompt: 'Does it load quickly on mobile data, away from your wi-fi?',
      },
      {
        id: 'mobile',
        principleId: 'mobile',
        stage: 'experienced',
        label: 'Mobile',
        prompt: 'Is it comfortable to use one-handed, outside, in daylight?',
      },
      {
        id: 'accessibility',
        principleId: 'accessibility',
        stage: 'experienced',
        label: 'Accessibility',
        prompt: 'Readable contrast, real labels, and everything reachable with a keyboard?',
      },
      {
        id: 'colour',
        principleId: 'colour',
        stage: 'experienced',
        label: 'Colour and brand',
        prompt: 'Does one colour mean "this is the action", and only that?',
      },
      {
        id: 'trust',
        principleId: 'trust',
        stage: 'trusted',
        label: 'Trust',
        prompt: 'Is there checkable evidence you are legitimate and capable?',
      },
      {
        id: 'proof',
        principleId: 'proof',
        stage: 'trusted',
        label: 'Proof placement',
        prompt: 'Does the evidence sit next to the claim it supports?',
      },
      {
        id: 'expectations',
        principleId: 'expectations',
        stage: 'trusted',
        label: 'Expectations',
        prompt: 'Do you say what happens after somebody gets in touch?',
      },
      {
        id: 'cta',
        principleId: 'cta',
        stage: 'contacted',
        label: 'Calls to action',
        prompt: 'Is there one obvious next step on every page?',
      },
      {
        id: 'forms',
        principleId: 'forms',
        stage: 'contacted',
        label: 'Forms',
        prompt: 'Does the form ask only for what you need to reply and quote?',
      },
      {
        id: 'service-pages',
        principleId: 'service-pages',
        stage: 'contacted',
        label: 'Service pages',
        prompt: 'Does each service you want more of have its own page?',
      },
      {
        id: 'friction',
        principleId: 'friction',
        stage: 'contacted',
        label: 'Friction',
        prompt: 'Can somebody call or request a quote in two taps from any page?',
      },
      {
        id: 'message-match',
        principleId: 'message-match',
        stage: 'contacted',
        label: 'Message match',
        prompt: 'Do adverts and listings land somewhere that repeats their promise?',
      },
      {
        id: 'measurement',
        principleId: 'measurement',
        stage: 'better',
        label: 'Measurement',
        prompt: 'Do you count calls and form submissions, and look at them?',
      },
      {
        id: 'continuous-improvement',
        principleId: 'continuous-improvement',
        stage: 'better',
        label: 'Continuous improvement',
        prompt: 'Has the site changed on purpose in the last three months?',
      },
    ] satisfies readonly ScorecardCategory[],

    bands: [
      {
        id: 'low',
        range: '0–13',
        min: 0,
        max: 13,
        title: 'High friction',
        body: 'The good news is that the first few fixes here usually make the largest difference, and most of them are not redesigns. Start with Priority 1 and do not look at the rest yet.',
      },
      {
        id: 'mid',
        range: '14–25',
        min: 14,
        max: 25,
        title: 'A working foundation with real leaks',
        body: 'The basics are mostly there and something specific is losing you enquiries. Your weakest five below are where it is happening.',
      },
      {
        id: 'good',
        range: '26–33',
        min: 26,
        max: 33,
        title: 'Strong foundation',
        body: 'Worth moving from fixing things to improving them: sharper service pages, proof where the doubt is, and measurement so the next change is informed rather than guessed.',
      },
      {
        id: 'high',
        range: '34–40',
        min: 34,
        max: 40,
        title: 'Lead-ready',
        body: 'Ahead of most of your competition. From here the gains come from measurement and continuous improvement rather than from another redesign — which is a different kind of work, and a smaller one.',
      },
    ] satisfies readonly ScorecardBand[],

    /** Shown once somebody has scored everything. */
    result: {
      heading: 'Your five weakest categories',
      lede: 'In score order, weakest first. This is your work list — and it is yours rather than a generic one, because it came from your own answers.',
      emptyHeading: 'Score all twenty to get your list',
      emptyBody:
        'The weakest-five list appears once every category has a score. Partial scores would produce a partial answer, which is worse than none.',
      perfectHeading: 'Nothing scored below two',
      perfectBody:
        'Either the site is in genuinely good shape, or the scoring was kind. Either way the next move is measurement: find out what visitors actually do, then improve on evidence rather than on this list.',
      readMore: 'Read the improvement',
    },
  },

  /* ---------------------------------------------------------------- pdf offer */

  pdfOffer: {
    eyebrow: 'The complete version',
    heading: 'Want the workbook version?',
    lede: 'Everything above is the knowledge. The PDF is the implementation: the audit sheets, worksheets and printable scorecard that turn it into an afternoon of work rather than a reading list.',

    includes: [
      'All twenty improvements, formatted to read and to keep',
      'The full 40-point scorecard as a printable audit sheet',
      'A page-by-page audit checklist: homepage, service page, contact page',
      'A homepage headline worksheet — we help [customer] with [problem] in [area]',
      'A form audit worksheet: every field, why it is there, and whether it stays',
      'Mobile, speed, trust and call-to-action checklists',
      'An advert-to-landing-page alignment checklist',
      'A "fix this first" prioritisation sheet',
    ],

    boundary:
      'Nothing essential is being held back. You can act on every improvement above without ever giving me your email address — the PDF just saves you building the checklists yourself.',

    form: {
      heading: 'Where should I send it?',
      label: 'Email',
      placeholder: 'you@yourbusiness.com',
      hint: 'The workbook is sent to this address. Nothing else is.',
      submit: 'Send me the workbook',
      pending: 'Sending…',
      /*
       * ========================================================================
       * CONSENT WORDING — MIRRORED ON THE SERVER
       * ========================================================================
       *
       * This exact string is duplicated as `PLAYBOOK_CONSENT_TEXT` in
       * `server/src/features/subscribers/subscriber.types.ts`, and stored alongside
       * every record so there is a note of what each person was actually shown.
       *
       * Both sides have a test pinning the literal. Rewording this without rewording
       * the server constant fails the build — which is the point, because otherwise the
       * database would hold consent to a promise nobody was ever made.
       *
       * And it has to stay true. There is no sequence and no list today. Adding one
       * means changing this sentence first and asking people to opt in separately, not
       * discovering it in their inbox.
       * ========================================================================
       */
      consent:
        'One email with the PlayBook in it. No sequence, no list, and no sharing your address with anybody.',
    },

    /*
     * Two confirmations, because there are two real behaviours.
     *
     * When `PLAYBOOK_PDF_URL` is configured the server emails the workbook link directly
     * and `sent` is accurate. When it is not, the request reaches me and I send it — and
     * `queued` says so rather than describing a mailing system that is not running.
     * Neither version promises something that is not happening.
     */
    success: {
      heading: 'Got it.',
      sentBody:
        'The workbook is on its way to that address. If it has not arrived in a few minutes, check the spam folder — and if it is not there either, reply to this site’s email address and I will send it directly.',
      queuedBody:
        'Your request has reached me and I will send the workbook over. It comes from me rather than from a mailing system, so it may not be instant — if it has not turned up by tomorrow, reply to this site’s email address and I will chase it.',
      nextLabel: 'While you wait: get a free assessment of your actual website',
    },

    failure: {
      heading: 'That did not send',
      body: 'Your address has not been saved and nothing has been sent. Try again in a moment, or email me directly and I will send the workbook over.',
    },
  },

  inlineCta: {
    heading: 'Want the checklist version of all this?',
    body: 'The complete PlayBook turns these improvements into audit sheets and worksheets you can work through.',
    action: 'Get the complete PDF',
  },

  /*
   * A `share` block used to sit here: an eyebrow, a heading, a lede and three bullets for
   * `/playbook/get`, a second page carrying the same email form as this one. Both the
   * page and this copy were removed — the form that mattered is `pdfOffer` above, which
   * renders on this page, and a salesperson reads out `/playbook` because it is shorter
   * to say than `/playbook/get` was. See `docs/VALUE-PER-SECOND.md` §4.
   */

  /* ---------------------------------------------------------------- the workbook */

  /*
   * ======================================================================
   * THE WORKBOOK — THE DOCUMENT THAT GETS PRINTED AND SENT
   * ======================================================================
   *
   * Rendered by `/playbook/workbook`, which is `noindex`, absent from the sitemap and
   * linked from nowhere. It is a production tool: open it, print to PDF, host the PDF,
   * set `PLAYBOOK_PDF_URL`, and the subscribe endpoint starts sending it automatically.
   *
   * There is no PDF-generation dependency because the browser already contains an
   * excellent PDF renderer, and three runtime dependencies is a number worth protecting.
   *
   * The document renders the twenty improvements in full from the same source as the
   * public page, so the two can never drift, and then adds what the page cannot: sheets
   * with boxes, prompts with lines to write on, and a printable scorecard. Nobody is
   * missing an idea by not having this. They are missing the clipboard.
   * ======================================================================
   */
  workbook: {
    title: 'The Service Business Website PlayBook',
    subtitle: 'Twenty improvements, a 40-point scorecard, and the sheets to work through',
    intro:
      'Print this, or work through it on screen. The twenty improvements are here in full, followed by the audit sheets — the reasoning and the paperwork in one document.',
    printPrompt: 'Print this page, or save it as a PDF, and work through it on your own website.',

    contentsHeading: 'Contents',
    summaryHeading: 'Before you start',
    summaryBody: [
      'Your website is part of the sales conversation. Somebody with a broken furnace does not browse — they search, open two or three results, and within a few seconds each one either earns another minute or gets closed.',
      'Everything here is about those few seconds and the two minutes after them, in the order they happen: get found, get understood, get experienced, get trusted, get contacted, get better.',
    ],
    summaryChain: ['Search', 'Website', 'Service', 'Proof', 'Contact'],

    principlesHeading: 'The twenty improvements',
    sheetsHeading: 'The audit sheets',

    /** Filled in by hand before the audit, so the sheet is usable a month later. */
    header: {
      heading: 'This audit',
      fields: ['Business', 'Website address', 'Date of this audit', 'Who is doing it'],
      note: 'Do the whole thing on a phone, on mobile data, as though you had never heard of the business. That is the condition your customers are in.',
    },

    sections: [
      {
        id: 'first-screen',
        title: 'Sheet 1 — The first screen',
        lede: 'Open the homepage on a phone and stop scrolling. Answer these from what is visible without moving.',
        prompts: [
          'What service does this business sell? (write it in their words)',
          'Which towns or areas does it cover?',
          'What is the one thing the page wants you to do?',
          'Is there a phone number you could tap right now?',
          'How long did the page take before you could read anything?',
        ],
        checks: [
          'The headline names a service, not a value',
          'The area is stated, not implied',
          'One primary action, visible without scrolling',
          'Tap-to-call in the header',
          'One piece of checkable proof is visible',
          'Nothing moved under your thumb while it loaded',
        ],
      },
      {
        id: 'headline',
        title: 'Sheet 2 — The headline worksheet',
        lede: 'Most service-business headlines could belong to any business in any trade. This is the fix, and it takes ten minutes.',
        formula: 'We help [who] with [problem] in [where].',
        prompts: [
          'Who exactly: homeowners, landlords, property managers, commercial?',
          'The problem in their words, not yours',
          'The area, named the way locals name it',
          'Now write it as one sentence a stranger could read in two seconds',
          'And a second line that answers their next question',
        ],
        checks: [
          'Could a competitor put their logo on this headline and have it still make sense? If yes, it is not finished',
          'Does it name a job somebody would actually search for?',
          'Would somebody standing in a driveway understand it?',
        ],
      },
      {
        id: 'form',
        title: 'Sheet 3 — The form audit',
        lede: 'List every field on your contact form. For each one, answer honestly: could you reply and give a rough price without it? If yes, it goes.',
        table: {
          columns: ['Field', 'Why it is there', 'Needed to reply?', 'Keep or cut'],
          rows: 8,
        },
        checks: [
          'Every remaining field earns its place',
          'Nothing asks for a budget range before a conversation has happened',
          'The labels are above the inputs and readable',
          'Errors say what to do, not "invalid input"',
          'What somebody typed survives a failed send',
          'You have submitted it yourself this month and the email arrived',
        ],
      },
      {
        id: 'pages',
        title: 'Sheet 4 — Page-by-page audit',
        lede: 'Three pages, the same four questions. Do the homepage, your most valuable service page, and the contact page.',
        pages: ['Homepage', 'Best service page', 'Contact page'],
        prompts: [
          'What is this page for, in one sentence?',
          'What is the one action it asks for?',
          'What question does a visitor still have when they finish it?',
          'What would you cut if you had to cut a third of it?',
        ],
      },
      {
        id: 'services',
        title: 'Sheet 5 — Service page inventory',
        lede: 'Write down every service you want to be hired for. Then find the page for it. A service without a page is a service nobody can search their way to.',
        table: {
          columns: [
            'Service you sell',
            'Has its own page?',
            'Written in customer words?',
            'Action',
          ],
          rows: 8,
        },
        checks: [
          'Every service you actually want more of has a page',
          'Each page describes the job the way a customer would say it',
          'Each page carries proof of that exact kind of work',
          'Each page ends with the same obvious next step',
        ],
      },
      {
        id: 'trust',
        title: 'Sheet 6 — Trust and proof',
        lede: 'A stranger is deciding whether to let you into their home. Tick what is checkable on your site today — then note where each piece of evidence actually sits.',
        checks: [
          'Photographs of your own finished work, not stock images',
          'Licence number, insurance and any certifications',
          'Reviews with real names, or a link to where they live',
          'A named human being somewhere on the site',
          'A real address or at least a real service area',
          'The year the business started',
          'What happens after somebody gets in touch',
          'Each of the above sits beside the claim it supports, not on a separate page',
        ],
      },
      {
        id: 'speed',
        title: 'Sheet 7 — Speed, mobile and accessibility',
        lede: 'Run your homepage through Google PageSpeed Insights, then do the manual checks. Both matter; only one of them has a score.',
        prompts: [
          'Largest Contentful Paint (target: 2.5 seconds or under)',
          'Interaction to Next Paint (target: under 200 milliseconds)',
          'Cumulative Layout Shift (target: under 0.1)',
          'Largest image on the page, in kilobytes',
        ],
        checks: [
          'Body text readable without zooming, and in sunlight',
          'Buttons big enough to hit with a thumb',
          'Nothing needs a horizontal scroll',
          'The menu opens in one tap',
          'Every field has a visible label',
          'You can tab to the submit button and see where you are',
          'It works on one bar of signal',
        ],
      },
      {
        id: 'match',
        title: 'Sheet 8 — Advert to landing page',
        lede: 'Only if you are running adverts or have a Google Business Profile link. For each, write the promise and then read the page it lands on.',
        table: {
          columns: ['Campaign or link', 'What it promises', 'What the page says', 'Match?'],
          rows: 5,
        },
        checks: [
          'The page repeats the offer, in the same words',
          'The call to action matches the one that was implied',
          'There is nothing between arriving and getting in touch',
          'You can tell, from your analytics, what that page did',
        ],
      },
      {
        id: 'friction',
        title: 'Sheet 9 — The friction count',
        lede: 'Walk your own site as a customer with a problem. Write down the numbers; they are your baseline for next quarter.',
        prompts: [
          'Taps from the homepage to starting a phone call',
          'Taps from the homepage to submitting a quote request',
          'Seconds to do each of the above',
          'Number of popups, banners or widgets encountered on the way',
          'Anything that made you go back',
        ],
        checks: [
          'No popup covers a call to action',
          'Every link and form on the site works, checked this month',
          'The confirmation page says what happens next',
        ],
      },
      {
        id: 'measurement',
        title: 'Sheet 10 — What you can actually see',
        lede: 'If you cannot answer these, the next improvement will be a guess. That is not a disaster, but it is worth knowing.',
        prompts: [
          'How many people visited the site last month?',
          'How many submitted the form?',
          'How many tapped the phone number?',
          'Which page brings in the most enquiries?',
          'Where do people leave?',
        ],
        checks: [
          'Analytics is installed',
          'Form submissions are counted as a conversion',
          'Phone taps are counted as a conversion',
          'Somebody has looked at it in the last three months',
        ],
      },
    ],

    /** The scorecard again, as a sheet with somewhere to write the numbers. */
    scoreSheet: {
      title: 'Sheet 11 — The 40-point scorecard',
      lede: 'Score each category 0, 1 or 2. Add it up, read the band, then do it again in three months and see what moved.',
      columns: ['Category', 'Score today', 'Score in 3 months', 'What I changed'],
    },

    priority: {
      title: 'Sheet 12 — What to fix first',
      lede: 'Take your five weakest categories and sort them. Effort is your own estimate; impact is how many people it affects and how close they were to getting in touch.',
      table: {
        columns: ['What is wrong', 'Impact (1–3)', 'Effort (1–3)', 'Do it by'],
        rows: 10,
      },
      note: 'Do the high-impact, low-effort ones this week. The rest is a plan, not a backlog you feel guilty about.',
    },

    closing: {
      heading: 'That is the whole thing',
      body: 'Nothing in this workbook needs a developer, a budget or permission. It needs an afternoon and a willingness to look at your own website the way a stranger does — which is the hard part, and the reason most websites never get audited at all.',
      note: 'If you would rather somebody did it with you, the free website assessment covers the same ground on your actual site, and you get the list whether or not you ever hire anybody.',
    },
  },

  /* ---------------------------------------------------------------- the service */

  service: {
    heading: 'Would you rather somebody did this with you?',
    body: [
      'The PlayBook exists to help you understand what makes a service-business website work. Everything in it is something you can do yourself.',
      'The managed service is for owners who would rather not spend their evenings doing it — where the website gets built, launched, maintained, aligned with your marketing, measured, tested and improved by the person who built it.',
    ],
    closing:
      'Either way, the free website assessment tells you where you actually stand. It costs nothing and you get the list whether or not you ever hire anybody.',
  },
} as const;
