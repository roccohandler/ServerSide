import { evidence } from '../../../../content';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { EvidenceList } from '../../../../components/marketing/Evidence';
import styles from '../Value.module.css';

const HEADING_ID = 'evidence-heading';

/**
 * Three published findings, immediately after the funnel they support.
 *
 * ## Why the evidence comes before the demonstrations
 *
 * The section above it claims a visitor's journey has steps, and that enquiries leak out
 * at the ones that are missing. The section below it demonstrates what a leak looks like
 * on a real page. In between, this answers the question a sceptic asks after the first
 * claim and before the second: says who?
 *
 * ## Why two of the three are about things I do not do
 *
 * Invoca's call-answer rate and ServiceTitan's booking expectation are both about parts
 * of the customer journey that are not the website. Including them is the argument, not
 * an aside — demand generation and demand conversion are different problems, and the
 * website is only one of the places the second one fails. The site already publishes
 * "whether your phone gets answered" in the list of things nobody here controls; this is
 * the same admission with a number and a source attached to it.
 *
 * The third is the only one that is the website's job, and the only one with a threshold
 * the reader can check on their own site this afternoon.
 *
 * Kept to three on purpose. `content/evidence.ts` explains why the trade-specific
 * advertising benchmarks live on the industry pages instead of here.
 */
export function EvidenceSection() {
  return (
    <Section labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={evidence.eyebrow}
          title={evidence.heading}
          lede={evidence.lede}
        />

        <EvidenceList citations={evidence.citations} />

        <p className={styles['evidenceClosing']}>{evidence.closing}</p>
      </Container>
    </Section>
  );
}
