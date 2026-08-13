import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { primaryCta, site } from '../../content';
import { routes } from '../../config/routes';
import { track } from '../../lib/analytics';
import { getPhoneChannel } from '../../lib/contact';
import { ButtonLink } from '../ui/Button';
import { Container } from '../ui/Layout';
import { Icon } from '../ui/Icon';
import { PhoneLink } from '../ui/ContactLink';
import styles from './Header.module.css';

const MENU_ID = 'site-menu';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  // Null while the number is still a placeholder, in which case no call button renders
  // rather than a `tel:` that dials nothing.
  const phone = getPhoneChannel();

  /*
   * Navigating with the menu open should not leave it covering the new page.
   *
   * This adjusts state during render rather than in an effect: React re-runs the
   * component immediately with the corrected value, so the menu is never painted open
   * on the new route. An effect would render it open first and then close it.
   */
  if (isMenuOpen && menuPath !== null && menuPath !== pathname) {
    setIsMenuOpen(false);
    setMenuPath(null);
  }

  const openMenu = () => {
    setIsMenuOpen(true);
    setMenuPath(pathname);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setMenuPath(null);
  };

  // Escape closes the menu and returns focus to the control that opened it.
  useEffect(() => {
    if (!isMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsMenuOpen(false);
      setMenuPath(null);
      toggleRef.current?.focus();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    [styles['navLink'], isActive ? styles['navLinkActive'] : undefined].filter(Boolean).join(' ');

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    [styles['mobileLink'], isActive ? styles['mobileLinkActive'] : undefined]
      .filter(Boolean)
      .join(' ');

  return (
    <header className={styles['header']}>
      <Container className={styles['inner']}>
        <Link to={routes.home} className={styles['brand']}>
          <span className={styles['brandName']}>{site.name}</span>
          <span className={styles['brandTagline']}>{site.tagline}</span>
        </Link>

        <div className={styles['desktop']}>
          <nav aria-label="Main">
            <ul className={styles['navList']}>
              {site.nav.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={navLinkClass} end={item.to === routes.home}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <PhoneLink className={styles['phone']} />

          {/*
           * The short label, and only here. Same destination as every other primary
           * action on the site — this is the sticky bar's wording, not a second offer.
           */}
          <ButtonLink
            to={primaryCta.to}
            className={styles['navCta']}
            onClick={() => track('cta_clicked', { location: 'nav' })}
          >
            {site.cta.navLabel}
          </ButtonLink>
        </div>

        {/*
         * The mobile bar.
         *
         * Every action used to live inside the collapsed menu, which meant a visitor on a
         * phone — most of them — saw no way to act until they opened it. The call button
         * is here instead: one tap, the highest-intent thing a service-business owner can
         * do, and the reason the phone number is in `content/site.ts` at all.
         */}
        <div className={styles['mobileBar']}>
          {phone.href ? (
            <a
              href={phone.href}
              className={styles['callButton']}
              aria-label={`Call ${phone.display}`}
            >
              <Icon name="phone" size={20} />
              <span className={styles['callLabel']}>Call</span>
            </a>
          ) : null}

          <button
            ref={toggleRef}
            type="button"
            className={styles['toggle']}
            // Announces the open/closed state and points at the region it controls.
            aria-expanded={isMenuOpen}
            aria-controls={MENU_ID}
            onClick={isMenuOpen ? closeMenu : openMenu}
          >
            <Icon name={isMenuOpen ? 'close' : 'menu'} size={20} />
            {isMenuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </Container>

      <div className={styles['mobileMenu']} id={MENU_ID} hidden={!isMenuOpen}>
        <Container>
          <nav aria-label="Main (mobile)">
            <ul className={styles['mobileList']}>
              {site.nav.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={mobileLinkClass} end={item.to === routes.home}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles['mobileActions']}>
            <ButtonLink
              to={primaryCta.to}
              block
              onClick={() => track('cta_clicked', { location: 'nav_mobile' })}
            >
              {primaryCta.label}
            </ButtonLink>
            <PhoneLink className={styles['mobilePhone']} />
          </div>
        </Container>
      </div>
    </header>
  );
}
