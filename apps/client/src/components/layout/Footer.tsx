import { Link } from 'react-router-dom';
import { industryMeta, site } from '../../content';
import { routes } from '../../config/routes';
import { Logo } from '../brand/Logo';
import { Container } from '@jobforge/ui';
import { EmailLink, PhoneLink } from '../marketing/ContactLink';
import { ThemeControl } from '../patterns/ThemeControl';
import { useAuth } from '../../session';
import styles from './Footer.module.css';

const currentYear = new Date().getFullYear();

export function Footer() {
  /*
   * The footer knows about the session for exactly one reason: offering "Create an
   * account" to somebody who has one is the footer telling a customer it does not know
   * who they are. See the account entry below.
   */
  const { status } = useAuth();

  const navLinks = site.footerNav.filter(
    (item) => item.to !== routes.privacy && item.to !== routes.terms,
  );

  return (
    <footer className={styles['footer']} data-print="hide">
      <Container>
        <div className={styles['grid']}>
          <div>
            <p className={styles['name']}>
              <Logo onDark />
            </p>
            <p className={styles['description']}>{site.description}</p>
          </div>

          <nav aria-label="Footer">
            <h2 className={styles['groupHeading']}>Pages</h2>
            <ul className={styles['list']}>
              {navLinks.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className={styles['link']}>
                    {item.label}
                  </Link>
                </li>
              ))}

              {/*
               * ============================================================
               * THE ONE ACCOUNT ENTRY, AND THE NOTE IT NARROWS
               * ============================================================
               *
               * `content.test.ts` refuses account links in the footer, in writing: "a
               * footer full of account links on a marketing page is navigation nobody
               * asked for". That still holds for a *column* of them — sign in, sign up,
               * forgot password, verify email — and there is not one here.
               *
               * One entry is not a column, and the reason it is worth one is a fact that
               * was not true when the note was written. DECISION 031 put the pair in the
               * header, and **the header strip does not exist below 64rem**: on a phone it
               * is inside a menu nobody has opened. The footer is the only surface on this
               * site that carries the same thing at every width with no click, and a
               * reader who has got to the bottom of a page has done the reading that makes
               * an account worth having.
               *
               * ## Why it is not in `site.footerNav`
               *
               * That list drives this column *and* the sitemap, and `/signup` is `noindex`
               * — a sign-in form in a search result is a result nobody wanted. Rendering
               * it here without adding it there is the difference between a link and an
               * indexed page.
               *
               * ## Why there is no Sign out beside it
               *
               * Because there is one in the header, and two controls with one accessible
               * name and one effect is the duplication `CredentialForm`'s "Previous step"
               * note argues against. The footer answers "how do I get in", which is a
               * question about a page. Signing out is not.
               * ============================================================
               */}
              <li>
                {status === 'authenticated' ? (
                  <Link to={routes.appDashboard} className={styles['link']}>
                    Dashboard
                  </Link>
                ) : (
                  <Link to={routes.signup} className={styles['link']}>
                    Create an account
                  </Link>
                )}
              </li>
            </ul>
          </nav>

          {/*
           * The industry pages live here rather than in the header.
           *
           * Five more items across the top would push the navigation into a menu on
           * desktop as well as mobile, and the audience for these pages arrives on one of
           * them from a search — not by browsing to it. What the footer buys is the
           * internal linking: every page on the site links to all five, which is how they
           * get found in the first place.
           */}
          <nav aria-label="Industries">
            <h2 className={styles['groupHeading']}>Industries</h2>
            <ul className={styles['list']}>
              {industryMeta.map((industry) => (
                <li key={industry.slug}>
                  <Link to={industry.path} className={styles['link']}>
                    {industry.navLabel}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className={styles['groupHeading']}>Contact</h2>
            <ul className={styles['list']}>
              <li>
                <PhoneLink className={styles['link']} />
              </li>
              <li>
                <EmailLink className={styles['link']} />
              </li>
            </ul>
            <p className={styles['areaList']}>Serving {site.serviceArea.label}.</p>
          </div>
        </div>

        <div className={styles['bottom']}>
          <p>
            © {currentYear} {site.name}
          </p>
          <ul className={styles['legalLinks']}>
            <li>
              <Link to={routes.privacy} className={styles['link']}>
                Privacy
              </Link>
            </li>
            <li>
              <Link to={routes.terms} className={styles['link']}>
                Terms
              </Link>
            </li>
          </ul>

          {/*
           * A site setting rather than a page, so it sits with the copyright line rather
           * than in the navigation columns above it. One control on the marketing site,
           * rendered on every page because the footer is; the workspace has the other.
           */}
          <ThemeControl id="appearance-site" />
        </div>
      </Container>
    </footer>
  );
}
