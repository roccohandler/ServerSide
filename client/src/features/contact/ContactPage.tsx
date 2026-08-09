import { routes } from '../../config/routes';
import { contactContent, findPageMeta, site } from '../../content';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { Container, Section, SectionHeading } from '../../components/ui/Layout';
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

        <div className={styles['layout']}>
          <div>
            <ContactForm />
          </div>
          <ContactDetails />
        </div>
      </Container>
    </Section>
  );
}
