import { routes } from '../../../config/routes';
import { aboutContent, findPageMeta, site } from '../../../content';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { EmailLink, PhoneLink } from '../../../components/marketing/ContactLink';
import { CtaBanner } from '../../../components/marketing/CtaBanner';
import styles from './About.module.css';

const meta = findPageMeta(routes.about);

export function AboutPage() {
  useDocumentMeta(meta ?? { path: routes.about, title: 'About', description: '' });

  return (
    <>
      <Section labelledBy="about-heading">
        <Container>
          <div className={styles['prose']}>
            <SectionHeading
              id="about-heading"
              level={1}
              eyebrow="About"
              title={`${aboutContent.heading} ${site.name}`}
              lede={aboutContent.intro}
            />

            {aboutContent.sections.map((section) => (
              <section key={section.id} className={styles['section']}>
                <h2 className={styles['sectionHeading']}>{section.heading}</h2>
                <p className={styles['body']}>{section.body}</p>

                {section.id === 'where' ? (
                  <ul className={styles['areaList']}>
                    {site.serviceArea.cities.map((city) => (
                      <li key={city} className={styles['areaChip']}>
                        {city}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            <div className={styles['contactCard']}>
              <h2>{aboutContent.contactHeading}</h2>
              <p className={styles['body']}>{aboutContent.contactBody}</p>
              <ul className={styles['contactList']}>
                <li>
                  <PhoneLink className={styles['contactLink']} />
                </li>
                <li>
                  <EmailLink className={styles['contactLink']} />
                </li>
              </ul>
            </div>
          </div>
        </Container>
      </Section>

      <CtaBanner />
    </>
  );
}
