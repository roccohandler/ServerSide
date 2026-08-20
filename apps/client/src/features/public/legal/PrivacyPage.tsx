import { routes } from '../../../config/routes';
import { findPageMeta } from '../../../content';
import { privacyContent } from '../../../content/legal';
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
