import { Link } from 'react-router-dom';
import { industryMeta, site } from '../../content';
import { routes } from '../../config/routes';
import { Container } from '../ui/Layout';
import { EmailLink, PhoneLink } from '../ui/ContactLink';
import styles from './Footer.module.css';

const currentYear = new Date().getFullYear();

export function Footer() {
  const navLinks = site.footerNav.filter(
    (item) => item.to !== routes.privacy && item.to !== routes.terms,
  );

  return (
    <footer className={styles['footer']}>
      <Container>
        <div className={styles['grid']}>
          <div>
            <p className={styles['name']}>{site.name}</p>
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
        </div>
      </Container>
    </footer>
  );
}
