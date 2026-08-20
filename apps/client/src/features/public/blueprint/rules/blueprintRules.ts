/*
 * ============================================================================
 * THE RULES — DATA, NOT BRANCHES INSIDE A COMPONENT
 * ============================================================================
 *
 * §50 of the brief asked for an extensible rules layer rather than hardcoded logic in
 * components, and the failure it prevents is specific: a `BlueprintResult.tsx` containing
 * `if (trade === 'hvac' && area === 'seattle')`. A component that knows what an HVAC business
 * in Seattle needs is a component nobody can add a trade to.
 *
 * So a rule is a row. Each one names what it recommends, why, and the answers that trigger it.
 * Adding a trade, a market or a recommendation is an entry in an array.
 *
 * ## The engine is deliberately dull
 *
 * `match` is a predicate over the answers. There is no scoring, no weighting and no ranking
 * model, because there is no data to fit one to — a weighted model here would be arithmetic
 * dressed as evidence. Rules fire or they do not, and `weight` decides the order they are read
 * in, which is a judgement about *importance to the reader* rather than a computed relevance.
 *
 * ## §32: two halves, and they cannot mix
 *
 * `PLANNED_RULES` are derived from what somebody told us. `UNKNOWABLE` is a fixed list of the
 * things twelve business questions genuinely cannot answer, and it is **not a function of the
 * answers** — it takes no arguments and it never will. That is what makes the separation
 * structural rather than a matter of wording: there is no path by which an answer-derived
 * string can reach the second heading, and a test asserts the shape rather than trusting it.
 * ============================================================================
 */

/** The answers, keyed by question id. A multi-select question holds several values. */
export type BlueprintAnswers = Readonly<Record<string, readonly string[]>>;

export interface BlueprintRecommendation {
  readonly id: string;
  /** What the website has to do, as a thing rather than as an instruction. */
  readonly title: string;
  /** Why it matters, in the owner's terms and derived from their own answer. */
  readonly detail: string;
  /**
   * Higher is read first.
   *
   * A judgement about what matters most to this reader, not a computed score. Three tiers:
   * 30 is "this is the thing", 20 is "this is load-bearing for you specifically", 10 is
   * "true for everybody in your position".
   */
  readonly weight: number;
}

interface BlueprintRule extends BlueprintRecommendation {
  readonly match: (answers: BlueprintAnswers) => boolean;
}

/** `true` when the answer to `id` includes `value`. Undefined answers never match. */
const has = (answers: BlueprintAnswers, id: string, ...values: readonly string[]) =>
  values.some((value) => (answers[id] ?? []).includes(value));

/*
 * ============================================================================
 * THE RULES
 * ============================================================================
 *
 * Every `detail` is written in the second person and refers only to something the reader
 * *told us*. None of them may describe the reader's existing website — that is the other
 * list, and `blueprintRules.test.ts` sweeps these strings for the vocabulary that would.
 * ============================================================================
 */
export const PLANNED_RULES: readonly BlueprintRule[] = [
  /* ---------------------------------------------------------------- urgency */
  {
    id: 'urgent-contact',
    title: 'A phone number that is impossible to miss, on every screen',
    detail:
      'You want urgent work, and somebody with an urgent problem is not filling in a form. They are looking for a number to tap, in the first second, on a phone, often standing next to whatever has gone wrong.',
    weight: 30,
    match: (a) => has(a, 'want', 'emergency'),
  },
  {
    id: 'urgent-hours',
    title: 'When you actually turn out, said in words',
    detail:
      'For urgent work the first question is not "are you good" — it is "will you come now". A site that answers that before anything else stops you being rung by people you cannot help and stops you losing the ones you can.',
    weight: 20,
    match: (a) => has(a, 'want', 'emergency'),
  },
  /* ---------------------------------------------------------------- research */
  {
    id: 'planned-detail',
    title: 'A real page for each job you want to be hired for',
    detail:
      'The work you want more of is the kind people research first. They compare two or three businesses, and the one whose page describes their exact job — in the words they used — is the one that feels like the specialist.',
    weight: 30,
    match: (a) => has(a, 'want', 'planned', 'contracts'),
  },
  {
    id: 'planned-price',
    title: 'Some honest indication of what things cost',
    detail:
      'Somebody planning a job is budgeting for it. A range, a starting figure, or even a plain "here is what changes the price" removes the reason most people leave a page — not knowing whether they can afford to ask.',
    weight: 20,
    match: (a) => has(a, 'want', 'planned'),
  },
  /* ---------------------------------------------------------------- trust */
  {
    id: 'new-proof',
    title: 'Proof you have done this before, placed where the doubt happens',
    detail:
      'You are under two years in, so the question a stranger has is whether you are established. Photographs of finished work, your licence details, and the towns you cover answer that faster than anything you could write about yourself.',
    weight: 30,
    match: (a) => has(a, 'stage', 'new'),
  },
  {
    id: 'no-proof',
    title: 'Getting something to show people, before anything else',
    detail:
      'You said there is not much you could show somebody, and that is the most valuable thing you could change. Phone photographs of finished jobs are usually enough — a stranger deciding whether to ring you is looking for evidence, and there is currently none to find.',
    weight: 30,
    match: (a) => has(a, 'proof', 'none'),
  },
  {
    id: 'reviews-forward',
    title: 'Reviews on the page, not only on a listing',
    /*
     * This read "somebody who has landed on your site has already left the place your reviews
     * live", and the §32 sweep caught it — correctly, and for a reason that is not the obvious
     * one. It is not a *finding*, but it presumes a website exists, and this tool is built to
     * work for somebody who has none. A rule that quietly assumes a site is a rule that reads
     * as nonsense to a third of the people answering these questions.
     */
    detail:
      'You have reviews, and they are doing far less work where they currently sit. A stranger deciding whether to ring you should meet them on the same page as the button that rings you — not on a listing they would have to go and find.',
    weight: 20,
    match: (a) => has(a, 'proof', 'reviews'),
  },
  {
    id: 'licence-visible',
    title: 'Licence, bonding and insurance, stated plainly',
    detail:
      'You have them and most of your competitors will not say so. For homeowners it is the difference between a tradesperson and a stranger with a van, and it costs one line.',
    weight: 10,
    match: (a) => has(a, 'proof', 'licence') && has(a, 'customer', 'homes', 'both'),
  },
  /* ---------------------------------------------------------------- discovery */
  {
    id: 'referral-landing',
    title: 'A site built for somebody checking you out, not discovering you',
    detail:
      'Most of your work comes by word of mouth, so a website is rarely how somebody finds you — it is where they go to decide whether the recommendation was right. That is a different job from being discovered, and it is mostly about looking established and being effortless to contact.',
    weight: 30,
    match: (a) => has(a, 'sources', 'referrals', 'repeat') && !has(a, 'sources', 'search'),
  },
  {
    id: 'search-foundation',
    title: 'The search foundation: structure, service pages, and a clear service area',
    detail:
      'People already find you by searching, so the pages they land on are doing real work. Making each service its own page — and saying which towns you cover on it — is what turns a general search into a call about a specific job.',
    weight: 20,
    match: (a) => has(a, 'sources', 'search', 'maps'),
  },
  {
    id: 'invisible-local',
    title: 'Being findable locally, starting with your Google listing',
    detail:
      'You said people nearby do not know you exist. For a local service business a well-kept Google Business Profile usually matters more than anything on the website itself, and we will tell you that rather than sell you around it.',
    weight: 30,
    match: (a) => has(a, 'blocker', 'invisible'),
  },
  {
    id: 'directory-exit',
    title: 'Somewhere of your own to send people',
    detail:
      'You are buying leads from a directory. Those are rented — the moment you stop paying, the enquiries stop — and every one of them is shown to your competitors at the same time. A site of your own is the version you keep.',
    weight: 20,
    match: (a) => has(a, 'sources', 'directories'),
  },
  /* ---------------------------------------------------------------- capture */
  {
    id: 'missed-calls',
    title: 'A way to reach you that does not need you to be free',
    detail:
      'You said calls often get missed while you are on a job, and no website fixes that — but it changes what one should offer. A short request form, or a text option, means somebody who cannot get you on the phone leaves a name instead of ringing the next business on the list.',
    weight: 30,
    match: (a) => has(a, 'answering', 'missed'),
  },
  {
    id: 'text-first',
    title: 'Texting offered on the site, since that is how people already reach you',
    detail:
      'Most of your enquiries arrive as texts, which tells you something about how your customers prefer to get in touch. A site that only offers a phone number and a form is offering two things neither of them chose.',
    weight: 20,
    match: (a) => has(a, 'contact', 'text'),
  },
  {
    id: 'social-off-platform',
    title: 'Getting enquiries off social media and somewhere you can find them',
    detail:
      'Messages on social platforms are easy to miss, impossible to search a year later, and they belong to somebody else. Moving the first contact onto your own site is what makes an enquiry a record rather than a notification.',
    weight: 20,
    match: (a) => has(a, 'contact', 'social'),
  },
  {
    id: 'qualifying',
    title: 'A request form that asks the two questions that sort the work',
    detail:
      'You get plenty of enquiries and the wrong ones. The fix is not fewer enquiries — it is asking the two things that tell you early whether a job is yours, so the wrong ones are cheap and the right ones arrive ready to quote.',
    weight: 30,
    match: (a) => has(a, 'blocker', 'quality'),
  },
  /* ---------------------------------------------------------------- shape */
  {
    id: 'seasonal',
    title: 'Pages for the seasons, brought forward when they matter',
    detail:
      'Your work goes quiet for months at a time. The services people want in February are not the ones they want in July, and a site whose front page changes with the season is one that is selling the right thing at the right time.',
    weight: 30,
    match: (a) => has(a, 'blocker', 'seasonal'),
  },
  {
    id: 'service-area',
    title: 'The towns you cover, written out',
    detail:
      'You travel across the metro area, and "we serve the greater area" tells nobody whether that includes them. Naming the places is what stops somebody in an outlying town assuming the answer is no.',
    weight: 20,
    match: (a) => has(a, 'area', 'metro', 'wide'),
  },
  {
    id: 'solo-honest',
    title: 'A site that sounds like one person, because you are one person',
    detail:
      'You do the work yourself. Writing as "we, a team of experienced professionals" is the thing every template does and it is a worse story than the true one — for a lot of customers, dealing with the person who actually turns up is the reason to choose you.',
    weight: 10,
    match: (a) => has(a, 'size', 'solo'),
  },
  {
    id: 'commercial',
    title: 'Something a business buyer can forward to whoever signs it off',
    detail:
      'You work for other businesses, and the person who finds you is often not the person who decides. Details they can send on — what you cover, how you charge, your insurance — is what makes that second conversation possible without you being in it.',
    weight: 20,
    match: (a) => has(a, 'customer', 'business', 'both'),
  },
  {
    id: 'established',
    title: 'The years, used as the argument they are',
    detail:
      'You have been going more than a decade, which almost nothing else in your market can say. That is worth stating in the first screen rather than on an about page nobody reaches.',
    weight: 10,
    match: (a) => has(a, 'stage', 'long'),
  },
  /*
   * ==========================================================================
   * THE TRADE, WHICH ANSWERED NOTHING UNTIL 2026-08-20
   * ==========================================================================
   *
   * Question one asks what kind of work somebody does, and **not one rule matched on it.**
   * Twelve questions, and the first one — the one that most makes a reader feel the tool is
   * about *them* — had no effect on the plan whatsoever.
   *
   * That is the specific failure a personalised tool cannot survive. A reader who answers
   * "roofing" and gets a plan that would read identically for a dog groomer has been shown
   * that the personalisation was decoration, and everything else on the page inherits that
   * doubt. It is worse than not asking.
   *
   * ## Grouped by how the trade is *bought*, not by the trade
   *
   * Fourteen trades would be fourteen rules that mostly agree, and the next trade added
   * would have none. What actually differs between them is the shape of the purchase:
   *
   *   - **Break-fix** (HVAC, plumbing, electrical) — urgent, unplanned, often at a bad
   *     moment. The website's job is to be reachable and reassuring in about ten seconds.
   *   - **Considered property work** (roofing, remodelling) — expensive, researched, several
   *     quotes. The job is evidence and scale.
   *   - **Recurring visible work** (landscaping, cleaning, pest control) — repeat revenue,
   *     and the before/after is the product.
   *   - **Appearance and craft** (detailing, photography) — bought with the eyes.
   *   - **Personal outcome** (training, coaching) — bought from a person, not a company.
   *
   * A new trade is one entry in the group it belongs to. `config/trades.ts` stays the single
   * list; this is a lens over it, which is the same shape the audit's diagnosis strings use.
   * ==========================================================================
   */
  {
    id: 'breakfix-speed',
    title: 'Everything a panicking customer needs, in the first ten seconds',
    detail:
      'Your work usually arrives unplanned and at a bad moment. Somebody standing next to a problem is not reading an about page — they need your number, whether you cover their town, and whether you can come today, before they scroll anything.',
    weight: 30,
    match: (a) => has(a, 'trade', 'hvac', 'plumbing', 'electrical'),
  },
  {
    id: 'considered-evidence',
    title: 'Photographs of finished work, at the size the work deserves',
    detail:
      'Yours is a job people research and get several quotes for, and it is spent on a building somebody owns. Full-width photographs of finished work do more here than any paragraph — they are how a homeowner decides which of three quotes is from the business that has done this before.',
    weight: 30,
    match: (a) => has(a, 'trade', 'roofing'),
  },
  {
    id: 'recurring-beforeafter',
    title: 'Before and after, and something that sells the next visit',
    detail:
      'Your work is visible and it repeats. Before-and-after pairs are the most persuasive thing your website can hold, and the second-most is making a regular arrangement obviously easy to start — a one-off customer and a monthly one arrive through the same page.',
    weight: 30,
    match: (a) => has(a, 'trade', 'landscaping', 'cleaning', 'pest-control'),
  },
  {
    id: 'appearance-gallery',
    title: 'A gallery that is the argument, not decoration around it',
    detail:
      'People buy your work with their eyes, so the images are not illustrations of the pitch — they are the pitch. The site should be built around them loading fast and large on a phone, which is where almost all of them will be looked at.',
    weight: 30,
    match: (a) => has(a, 'trade', 'auto-detailing', 'photography'),
  },
  {
    id: 'personal-outcome',
    title: 'You, on the page, because you are what they are choosing',
    detail:
      'People do not hire a company for this — they hire a person, and they decide whether they want to spend time with you before they decide anything else. A real photograph and a plain account of how you work will outperform every credential you could list.',
    weight: 30,
    match: (a) => has(a, 'trade', 'personal-training'),
  },
  {
    id: 'logistics-quote',
    title: 'A quote form that asks the two things that decide the price',
    detail:
      'What you charge depends on facts a stranger has to supply — distance, size, access, dates. Asking those two or three things up front turns a vague enquiry into something you can price without a phone call, and it is the difference between a lead and a quote.',
    weight: 20,
    match: (a) => has(a, 'trade', 'moving'),
  },
  /*
   * ==========================================================================
   * WHAT A JOB IS WORTH, USED AS A PRIORITY RATHER THAN A FOOTNOTE
   * ==========================================================================
   *
   * The optional money question produced `jobValueNote` — one sentence, appended at the
   * bottom — and **no rule matched on it**, so answering it changed nothing about what the
   * plan recommended or what order it was read in.
   *
   * That is the same defect as the trade, and on the one question people are most reluctant
   * to answer. A reader who volunteers what their work is worth and gets the same plan back
   * has been charged for nothing.
   *
   * The economics genuinely differ, and the rules say how rather than restating the number:
   *
   *   - **Low value, high volume** — the site is a routing problem. Speed to contact beats
   *     everything; nobody reads three paragraphs before booking a $180 job.
   *   - **High value, low volume** — the site is a shortlisting problem. Each enquiry is
   *     worth a great deal, so the work is qualifying them and looking like the safe choice.
   *
   * Still optional, still banded, and still never a prediction of what anybody will earn.
   * ==========================================================================
   */
  {
    id: 'volume-speed',
    title: 'The shortest possible path from landing to contacting you',
    detail:
      'At your job size the money is in volume, which makes the site a routing problem rather than a persuasion one. Nobody reads three paragraphs before booking work at this price — every extra tap between landing and reaching you costs more than any sentence could earn back.',
    weight: 30,
    match: (a) => has(a, 'jobValue', 'under-250'),
  },
  {
    id: 'highvalue-shortlist',
    title: 'Built to be shortlisted, not to be found',
    detail:
      'At your job size you do not need many enquiries — you need the right ones, from people comparing two or three businesses. That makes the site a shortlisting problem: the work is proving you have done this exact job before and making it obvious you are the safe choice.',
    weight: 30,
    match: (a) => has(a, 'jobValue', 'over-5000'),
  },
  {
    id: 'midvalue-qualify',
    title: 'Enough detail to arrive at a quote, not a conversation',
    detail:
      'At your job size the expensive thing is not enquiries, it is enquiries that turn into unpaid quoting. Saying what changes the price, and asking two questions that sort the work early, is what turns a page into a filter rather than a funnel.',
    weight: 20,
    match: (a) => has(a, 'jobValue', '250-1000', '1000-5000'),
  },
  /* ---------------------------------------------------------------- measurement */
  {
    id: 'measure',
    title: 'Calls and enquiries counted, from the first day',
    detail:
      'Whatever gets built, the number worth knowing is how many people got in touch — and it can only be known from the day something starts counting. Without it, every later claim about whether it worked is somebody’s impression.',
    weight: 10,
    match: () => true,
  },
];

/*
 * ============================================================================
 * WHAT TWELVE BUSINESS QUESTIONS CANNOT ANSWER — §32
 * ============================================================================
 *
 * A fixed list. **It takes no arguments and it must never take any.** That is what makes the
 * separation between the two halves of the result structural rather than a matter of careful
 * wording: there is no path by which an answer-derived string can reach this heading, and no
 * future edit can create one without changing this signature.
 *
 * Every entry is something that genuinely requires somebody to open the reader's site on a
 * phone and try to hire them. None of it is a finding, none of it implies one, and the copy
 * is written as an open question rather than as a suspicion.
 * ============================================================================
 */
export const UNKNOWABLE: readonly { readonly id: string; readonly title: string }[] = [
  { id: 'speed', title: 'How fast it loads for somebody on a phone, on mobile data' },
  { id: 'mobile', title: 'Whether it is genuinely usable one-handed, or just shrunk' },
  { id: 'forms', title: 'Whether your enquiry form actually reaches you — many quietly do not' },
  { id: 'clarity', title: 'Whether a stranger can tell what you do within a few seconds' },
  { id: 'contact', title: 'How many taps it takes to reach you from the page they land on' },
  { id: 'search', title: 'What search engines currently make of it, and what they cannot read' },
  {
    id: 'trust',
    title: 'Whether the proof you do have is anywhere a doubtful reader will meet it',
  },
  { id: 'competitors', title: 'How it reads beside the two or three businesses you lose work to' },
];

/**
 * The plan, ordered by what matters most to this reader.
 *
 * Sorted by weight and then by declaration order, so the result is stable for the same answers
 * — a plan that reshuffles between two loads is one nobody trusts twice.
 */
export function buildBlueprint(answers: BlueprintAnswers): readonly BlueprintRecommendation[] {
  return PLANNED_RULES.filter((rule) => rule.match(answers))
    .map(({ match: _match, ...recommendation }) => recommendation)
    .sort((left, right) => right.weight - left.weight);
}

/**
 * What a missed enquiry is worth, when they told us — and never a prediction.
 *
 * Returns a *sentence about arithmetic they already know*, not a forecast. "A job like that is
 * worth $1,000 to $5,000, so one missed enquiry a week is a meaningful number" is a
 * restatement of their own answer. "You could earn $52,000 more" is a promise about a market,
 * and §53 of the brief forbids it — as does every other surface on this site.
 *
 * Absent when they skipped the question or said it varies, which is the honest answer rather
 * than a default.
 */
export function jobValueNote(answers: BlueprintAnswers): string | null {
  const [band] = answers['jobValue'] ?? [];

  const bands: Readonly<Record<string, string>> = {
    'under-250':
      'At under $250 a job, volume is what makes the difference — which is why how easy you are to contact matters more here than how much anything explains.',
    '250-1000':
      'At $250 to $1,000 a job, a handful of enquiries a month that never reach you is a real amount of money, and it is the kind that disappears without anybody noticing.',
    '1000-5000':
      'At $1,000 to $5,000 a job, one enquiry that goes to somebody else is worth more than most businesses spend on a website in a year.',
    'over-5000':
      'At more than $5,000 a job, the site is not competing on volume. Every one of these is somebody deciding carefully, and the whole job is to be the one that looks like the safe choice.',
  };

  return bands[band ?? ''] ?? null;
}
