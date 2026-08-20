import { legalNotice } from '../../../content/legal';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { EmailLink, PhoneLink } from '../../../components/marketing/ContactLink';
import type { PageMeta } from '../../../types/content';
import styles from './Legal.module.css';

interface LegalSection {
  readonly id: string;
  readonly heading: string;
  readonly body: string;
}

export interface LegalPageProps {
  readonly meta: PageMeta;
  readonly heading: string;
  readonly intro: string;
  readonly sections: readonly LegalSection[];
}

/**
 * Shared shell for the privacy and terms pages.
 *
 * The banner at the top is not decoration — these pages have not been reviewed by a
 * lawyer, and saying so is more honest than presenting placeholder text as a policy.
 * Remove it when the real documents are in place.
 */
export function LegalPage({ meta, heading, intro, sections }: LegalPageProps) {
  useDocumentMeta(meta);

  return (
    <Section labelledBy="legal-heading">
      <Container>
        <div className={styles['prose']}>
          <SectionHeading id="legal-heading" level={1} title={heading} lede={intro} />

          <p className={styles['notice']}>{legalNotice}</p>

          {/*
           * `id` on the section, not only `key`.
           *
           * Every section here already had a stable identifier and none of it reached the
           * document, so `#refunds` and `#completion` resolved to nothing — which mattered
           * the moment another page needed to send somebody to one clause of a page with
           * fourteen. `/pricing` links into four of them, and "read the refund policy" that
           * drops a reader at the top of a terms page is an instruction to go and find it.
           */}
          {sections.map((section) => (
            <section key={section.id} id={section.id} className={styles['section']}>
              <h2 className={styles['sectionHeading']}>{section.heading}</h2>
              <p className={styles['body']}>{section.body}</p>
            </section>
          ))}

          <p className={styles['contact']}>
            Questions about this page? <PhoneLink showIcon={false} /> or{' '}
            <EmailLink showIcon={false} />.
          </p>
        </div>
      </Container>
    </Section>
  );
}
