import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { primaryCta, site } from '../../content';
import { routes } from '../../config/routes';
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

          <ButtonLink to={primaryCta.to}>{primaryCta.label}</ButtonLink>
        </div>

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
            <ButtonLink to={primaryCta.to} block>
              {primaryCta.label}
            </ButtonLink>
            <PhoneLink className={styles['mobilePhone']} />
          </div>
        </Container>
      </div>
    </header>
  );
}
