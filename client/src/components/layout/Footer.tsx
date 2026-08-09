import { Link } from 'react-router-dom';
import { site } from '../../content';
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
