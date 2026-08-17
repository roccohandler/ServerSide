import { Link } from 'react-router-dom';
import { routes } from '../../../config/routes';
import { notFoundPage } from '../../../content';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { ButtonLink } from '@jobforge/ui';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { PhoneLink } from '../../../components/marketing/ContactLink';

export function NotFoundPage() {
  useDocumentMeta(notFoundPage);

  return (
    <Section labelledBy="not-found-heading">
      <Container narrow>
        <SectionHeading
          id="not-found-heading"
          level={1}
          title="That page does not exist"
          lede="The link may be out of date, or the address may have a typo in it. Everything on the site is reachable from the pages below."
        />

        <p>
          <ButtonLink to={routes.home}>Go to the homepage</ButtonLink>
        </p>
        <p>
          Looking for something specific? Call <PhoneLink showIcon={false} /> and ask, or{' '}
          <Link to={routes.contact}>get in touch</Link>.
        </p>
      </Container>
    </Section>
  );
}
