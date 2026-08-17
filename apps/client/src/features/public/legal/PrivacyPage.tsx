import { routes } from '../../../config/routes';
import { findPageMeta, privacyContent } from '../../../content';
import { LegalPage } from './LegalPage';

const meta = findPageMeta(routes.privacy) ?? {
  path: routes.privacy,
  title: 'Privacy',
  description: '',
};

export function PrivacyPage() {
  return (
    <LegalPage
      meta={meta}
      heading={privacyContent.heading}
      intro={privacyContent.intro}
      sections={privacyContent.sections}
    />
  );
}
