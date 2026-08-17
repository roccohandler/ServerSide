import { env } from '../../config/env';
import * as content from '../../content';
import { collectPlaceholders } from '../../lib/placeholders';
import { Container } from '@jobforge/ui';
import styles from './SiteLayout.module.css';

/*
 * Development-only reminder of what still needs real values.
 *
 * The content modules are walked once at import time and every `[PLACEHOLDER]` token is
 * collected. `import.meta.env.DEV` is a compile-time constant, so this component and
 * the walk behind it are removed entirely from the production bundle.
 */
const outstanding = env.isDevelopment ? [...collectPlaceholders(content)].sort() : [];

export function PlaceholderNotice() {
  if (!env.isDevelopment || outstanding.length === 0) return null;

  return (
    <div className={styles['placeholderNotice']}>
      <Container>
        <p className={styles['placeholderTitle']}>
          Development notice: {outstanding.length} placeholder
          {outstanding.length === 1 ? '' : 's'} still to replace in <code>src/content</code>.
        </p>
        <ul className={styles['placeholderList']}>
          {outstanding.map((token) => (
            <li key={token} className={styles['placeholderToken']}>
              {token}
            </li>
          ))}
        </ul>
      </Container>
    </div>
  );
}
