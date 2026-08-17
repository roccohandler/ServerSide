import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { primaryCta, site } from '../../content';
import { routes } from '../../config/routes';
import { useAuth } from '../../session';
import { track } from '../../lib/analytics';
import { getPhoneChannel } from '../../lib/contact';
import { LogoMark, Wordmark } from '../brand/Logo';
import { ButtonLink } from '@jobforge/ui';
import { Container } from '@jobforge/ui';
import { Icon } from '@jobforge/ui';
import { PhoneLink } from '../marketing/ContactLink';
import styles from './Header.module.css';
import { cx } from '@jobforge/ui';

const MENU_ID = 'site-menu';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const { status, logout } = useAuth();

  /*
   * ====================================================================
   * SIGNING OUT FROM A PUBLIC PAGE DOES NOT MOVE ANYBODY
   * ====================================================================
   *
   * `AppLayout` signs out and navigates to the homepage, and that is right *there*: a
   * private page cannot stay on screen once the session behind it is gone.
   *
   * Here the page is public. It was readable before the session existed and it is
   * readable after, so navigating away would cost the reader their place in an article
   * they were part-way through in exchange for nothing. The confirmation that it worked
   * is the strip itself: it flips back to "Create an account | Sign in" the moment the
   * session clears, in the exact spot the control they pressed used to be.
   *
   * The ref is the double-click guard. `logout()` is a network round trip and this is a
   * plain text control with no busy state of its own — without it, an impatient second
   * click is a second request against a session the first one has already ended.
   * ====================================================================
   */
  const leavingRef = useRef(false);

  async function handleSignOut() {
    if (leavingRef.current) return;
    leavingRef.current = true;
    await logout();
    leavingRef.current = false;
  }

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
    cx(styles['navLink'], isActive && styles['navLinkActive']);

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    cx(styles['mobileLink'], isActive && styles['mobileLinkActive']);

  return (
    <header className={styles['header']} data-print="hide">
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

          {/*
           * ================================================================
           * THE PAIR, AND WHY THERE WAS ONLY EVER HALF OF ONE
           * ================================================================
           *
           * `Sign in` has been here on its own since the strip was built, which left the
           * site with a returning-customer door and no new-customer door beside it.
           * `content.test.ts` has asserted the fix as though it were done for just as
           * long — its allowance list justifies `/signup` as "linked from the header and
           * from the sign-in page", and only the second half was ever true.
           *
           * ## Why this is not the ember button
           *
           * `Get my free website assessment` also creates an account — DECISION 028 made
           * the account *be* the lead capture. But it is framed entirely as an offer, and
           * somebody who does not want an assessment reads that button as not for them,
           * correctly, and then has nowhere to go. Two doors, two intents:
           *
           *   the offer   → /get-my-assessment → "tell me what is wrong with my site"
           *   the account → /signup            → "I want an account"
           *
           * ## Why neither of them is loud
           *
           * Both are plain text in `--color-ink-inverse`. Ember is rationed to the one
           * primary action, which is the entire reason the phone number and the account
           * link were moved up here in the first place — see the note above. The rule
           * between them is what stops two 13px links reading as one label; it is not
           * emphasis.
           *
           * See DECISION 031 and `03_plan/header_account_entry_plan.md`.
           * ================================================================
           */}
          {status === 'authenticated' ? (
            <>
              <NavLink to={routes.appDashboard} className={styles['utilityLink']}>
                Dashboard
              </NavLink>
              <button
                type="button"
                className={cx(styles['utilityAction'], styles['utilityDivided'])}
                onClick={() => void handleSignOut()}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              {/*
               * "Create an account", not "Create account" or "Sign up".
               *
               * The first is the phrase `CredentialForm` fixed across four files: a
               * heading, a link or a page title is the site addressing the reader, so it
               * is "an"; a button is the reader acting, so it is "my". This is a link.
               *
               * "Sign up" was the shorter option and it is the one to avoid — it differs
               * from the control immediately beside it by a single letter.
               */}
              <NavLink
                to={routes.signup}
                className={styles['utilityLink']}
                onClick={() => track('cta_clicked', { location: 'nav_signup' })}
              >
                Create an account
              </NavLink>
              <NavLink
                to={routes.login}
                className={cx(styles['utilityLink'], styles['utilityDivided'])}
              >
                Sign in
              </NavLink>
            </>
          )}
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
            {/*
             * The same pair, built a second time.
             *
             * Not a duplication that could be factored out: the utility strip is
             * `display: none` below 64rem, so on a phone that markup renders nothing at
             * all and this is the only copy there is. `Sign in` has always been built
             * twice for exactly this reason. What is new is that both halves now appear
             * in both places, rather than the desktop strip quietly carrying more.
             *
             * Above `Sign in` for the same reason it is first on desktop, and below the
             * call to action because the call to action is still the primary act on the
             * page. The analytics location differs so the two surfaces stay countable
             * apart — see `CtaLocation`.
             */}
            {status === 'authenticated' ? (
              <>
                <NavLink to={routes.appDashboard} className={mobileLinkClass}>
                  Dashboard
                </NavLink>
                <button
                  type="button"
                  className={styles['mobileAction'] ?? ''}
                  onClick={() => void handleSignOut()}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to={routes.signup}
                  className={mobileLinkClass}
                  onClick={() => track('cta_clicked', { location: 'nav_signup_mobile' })}
                >
                  Create an account
                </NavLink>
                <NavLink to={routes.login} className={mobileLinkClass}>
                  Sign in
                </NavLink>
              </>
            )}
            <PhoneLink className={styles['mobilePhone']} />
          </div>
        </Container>
      </div>
    </header>
  );
}
