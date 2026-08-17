import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { evidence } from '../../content';
import { EvidenceList } from './Evidence';

/*
 * The limitation, pinned where it actually matters.
 *
 * `EvidenceCitation` makes `limitation` a required field and `content.test.ts` asserts
 * every one of them says something. Both check the *data*, and neither would notice if
 * the paragraph that renders it were deleted — a plausible density edit, given the
 * component's own comment says the caveat is deliberately not tucked away.
 *
 * The consequence of that gap is the exact overclaim this site is positioned against:
 * "52% of calls were answered by a person" and "70% of consumers expect to book online"
 * published on the homepage and all five industry pages with nothing saying that the
 * first measures call handling rather than websites, and the second is what people say
 * rather than what they did.
 *
 * So these assertions are about what is on the screen.
 */
describe('the evidence list', () => {
  it('renders something, so this guard cannot pass by rendering nothing', () => {
    expect(evidence.citations.length).toBeGreaterThan(0);
  });

  it('renders the limitation for every citation it shows', () => {
    render(<EvidenceList citations={evidence.citations} />);

    for (const citation of evidence.citations) {
      expect(
        screen.getByText(citation.limitation),
        `"${citation.id}" is published without what it does not show`,
      ).toBeInTheDocument();
    }

    // And each one is labelled as a limitation rather than left as another sentence.
    expect(screen.getAllByText(evidence.limitationLabel)).toHaveLength(evidence.citations.length);
  });

  it('renders the claim, the reason it matters and a checkable source', () => {
    render(<EvidenceList citations={evidence.citations} />);

    for (const citation of evidence.citations) {
      expect(screen.getByText(citation.claim)).toBeInTheDocument();
      expect(screen.getByText(citation.whyItMatters)).toBeInTheDocument();

      const link = screen.getByRole('link', {
        name: new RegExp(citation.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      });
      expect(link).toHaveAttribute('href', citation.sourceUrl);
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  /*
   * A subset is what the industry pages render — one citation each, chosen because its
   * dataset genuinely covers that trade. The caveat has to travel with it there too.
   */
  it('keeps the limitation attached when only one citation is shown', () => {
    const one = evidence.citations.slice(0, 1);
    render(<EvidenceList citations={one} />);

    expect(screen.getAllByText(evidence.limitationLabel)).toHaveLength(1);
    expect(screen.getByText(one[0]?.limitation ?? '')).toBeInTheDocument();
  });
});
