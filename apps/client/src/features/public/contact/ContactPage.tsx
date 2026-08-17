import { Link } from 'react-router-dom';
import { routes, sections } from '../../../config/routes';
import { contactContent, findPageMeta, site } from '../../../content';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { ContactDetails } from './ContactDetails';
import { ContactForm } from './ContactForm';
import styles from './Contact.module.css';

const meta = findPageMeta(routes.contact);

export function ContactPage() {
  useDocumentMeta(meta ?? { path: routes.contact, title: 'Contact', description: '' });

  const { freeReview } = site.offer;

  return (
    <Section labelledBy="contact-heading">
      <Container>
        <SectionHeading
          id="contact-heading"
          level={1}
          eyebrow={freeReview.enabled ? freeReview.name : 'Contact'}
          title={contactContent.heading}
          lede={contactContent.intro}
        />

        {/*
         * This is the page where somebody decides whether to ask for the assessment, so it is
         * the page where "what do I actually get back" is most worth answering. Rendered
         * only while the offer is on, for the same reason `ReviewOfferSection` is — the
         * free-review switch has to remove every promise of one, not most of them.
         */}
        {freeReview.enabled ? (
          <p className={styles['sampleLink']}>
            {freeReview.sampleLede} <Link to={routes.teardown}>{freeReview.sampleLabel}</Link>.
          </p>
        ) : null}

        <div className={styles['layout']}>
          {/*
           * The landing point for every primary call to action on the site. `tabIndex`
           * lets `SiteLayout` move focus here after a `#request` navigation, so somebody
           * arriving from a button on the homepage lands on the form rather than at the
           * top of a page containing one.
           */}
          <div id={sections.request} tabIndex={-1}>
            <ContactForm />
          </div>
          <ContactDetails />
        </div>
      </Container>
    </Section>
  );
}
