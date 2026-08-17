import { routes } from '../../../config/routes';
import { findPageMeta, termsContent } from '../../../content';
import { LegalPage } from './LegalPage';

const meta = findPageMeta(routes.terms) ?? { path: routes.terms, title: 'Terms', description: '' };

export function TermsPage() {
  return (
    <LegalPage
      meta={meta}
      heading={termsContent.heading}
      intro={termsContent.intro}
      sections={termsContent.sections}
    />
  );
}
