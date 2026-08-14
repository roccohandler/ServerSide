import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { primaryCta, site } from '../../content';
import { routes } from '../../config/routes';
import { useAuth } from '../../features/auth/useAuth';
import { track } from '../../lib/analytics';
import { getPhoneChannel } from '../../lib/contact';
import { LogoMark, Wordmark } from '../brand/Logo';
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
  const { status } = useAuth();

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
      {/*
       * ====================================================================
       * THE UTILITY STRIP
       * ====================================================================
       *
       * A second tier above the navigation, carrying the two things that are neither
       * destinations nor the primary action: how to reach a human, and the way into an
       * account.
       *
       * Both used to sit *inside* the nav row, between "About" and the button, which is
       * what made the bar read as chaotic — a phone number is not a peer of "Services",
       * and putting it in the same list asked the eye to sort eight items into three
       * kinds every time it landed. Splitting them by tier does that sorting once, in
       * the layout.
       *
       * The number moves up rather than away. A contractor calling is the highest-intent
       * thing that happens on this site, so it gains a permanent slot and the business
       * hours beside it — which is more use than the bare number ever was, because "will
       * anyone answer" is the question that actually precedes a call.
       * ====================================================================
       */}
      <div className={styles['utility']}>
        <Container className={styles['utilityInner']}>
          <span className={styles['hours']}>{site.contact.availability}</span>
          <PhoneLink className={styles['utilityPhone']} />
          <NavLink
            to={status === 'authenticated' ? routes.appDashboard : routes.login}
            className={styles['utilityLink']}
          >
            {status === 'authenticated' ? 'Dashboard' : 'Sign in'}
          </NavLink>
        </Container>
      </div>

      <Container className={styles['inner']}>
        {/*
         * The lockup. The mark is `aria-hidden` inside `LogoMark`, so the link's
         * accessible name is the wordmark text.
         *
         * The tagline that used to sit under the name is gone. It never fitted: it needed
         * 427px in a slot that offered 141px, so it rendered as "Websites and growth s…"
         * at every width above 1280px and was hidden outright below that. A description
         * nobody can read is not a description, and the hero says the same thing one
         * screen down with room to say it properly.
         */}
        <Link to={routes.home} className={styles['brand']}>
          <LogoMark onDark className={styles['brandMark'] ?? ''} />
          <Wordmark className={styles['brandName'] ?? ''} />
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

          {/*
           * The one primary action in the bar, and now the only ember in it. The phone
           * and the account link moved to the strip above precisely so this has nothing
           * to compete with — which is what the brand's own "ember is rationed" rule in
           * `tokens.css` has always asked for and the old row quietly broke.
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
            <NavLink
              to={status === 'authenticated' ? routes.appDashboard : routes.login}
              className={mobileLinkClass}
            >
              {status === 'authenticated' ? 'Dashboard' : 'Sign in'}
            </NavLink>
            <PhoneLink className={styles['mobilePhone']} />
          </div>
        </Container>
      </div>
    </header>
  );
}
