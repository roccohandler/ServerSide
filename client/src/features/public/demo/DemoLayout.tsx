import { lazy, useEffect, useRef, type ComponentType, type CSSProperties } from 'react';
import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { DEMO_TOKENS, demoPath, isDemoSlug, type DemoSlug } from '../../../config/demos';
import { Icon } from '../../../components/ui/Icon';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { findPageMeta } from '../../../content';
import { demoLoaders, type DemoSite } from '../../../content/demos';
import { NotFoundPage } from '../notFound/NotFoundPage';
import { DemoBar } from './DemoBar';
import { DemoFooter, DemoHeader } from './DemoChrome';
import styles from './Demo.module.css';

/*
 * ============================================================================
 * THE DEMONSTRATION SHELL
 * ============================================================================
 *
 * Everything a demo route renders inside, and the reason demo routes are siblings of
 * `SiteLayout` rather than children of it.
 *
 * `SiteLayout` paints the JobForge header, the JobForge footer and the skip link. A
 * demonstration of an HVAC company's website cannot be wrapped in another company's
 * navigation — what is being demonstrated is *arriving at that business*, and a visitor
 * who can see the seller's header the whole time is evaluating a page inside a sales pitch
 * rather than evaluating a website.
 *
 * So this is a second shell with the same three responsibilities:
 *
 *   1. **Disclose.** `DemoBar` is pinned above everything and cannot be dismissed.
 *   2. **Paint the trade.** The palette is set as custom properties on the root, so one
 *      component set is five businesses.
 *   3. **Handle route changes.** A single-page app does not reload the document, so scroll
 *      position and keyboard focus have to be moved by hand — the same job `SiteLayout`
 *      does, redone here because these routes never pass through it.
 * ============================================================================
 */

export const DEMO_MAIN_ID = 'demo-main';

/** What the three page templates receive. They render one business; they never pick it. */
export interface DemoOutletContext {
  readonly site: DemoSite;
  readonly slug: DemoSlug;
}

/*
 * ============================================================================
 * ONE LAZY SHELL PER TRADE
 * ============================================================================
 *
 * Five `React.lazy` components, each closing over exactly one trade's content module — so
 * the bundler emits five chunks and a visitor who opens the HVAC demo downloads HVAC.
 *
 * ## Why not `use()`
 *
 * This was written with React 19's `use()` first, reading the content promise directly in
 * the shell. It works in a browser and it never resolves under the act environment the
 * test suite runs in: forty-two assertions sat on the suspense fallback forever, including
 * every accessibility check on all fifteen routes.
 *
 * A feature whose correctness cannot be asserted is a feature that will break silently.
 * `React.lazy` is the mechanism five routes in `App.tsx` already use, it produces exactly
 * the same chunking, and it is testable — so the tests get to keep existing and the new
 * API does not get to be load-bearing on the strength of a demo in a browser.
 * ============================================================================
 */
function shellFor(slug: DemoSlug): ComponentType {
  return lazy(() =>
    demoLoaders[slug]().then(({ demo }) => ({
      default: () => <DemoShell site={demo} slug={slug} />,
    })),
  );
}

const shells: Readonly<Record<DemoSlug, ComponentType>> = {
  hvac: shellFor('hvac'),
  plumbing: shellFor('plumbing'),
  roofing: shellFor('roofing'),
  landscaping: shellFor('landscaping'),
  electrical: shellFor('electrical'),
};

/**
 * The palette, as custom properties on the root.
 *
 * Inline rather than one class per trade, because the values belong in content next to the
 * business they describe rather than in a stylesheet a content edit cannot reach. The
 * token list is a contract — see `DEMO_TOKENS` — and a test asserts every demo supplies
 * every key. A missing one would inherit whatever the *previous* demo set, which is a bug
 * that only appears when somebody clicks from the HVAC demo to the roofing one.
 */
function paletteStyle(palette: Record<string, string>): CSSProperties {
  return Object.fromEntries(DEMO_TOKENS.map((token) => [token, palette[token]])) as CSSProperties;
}

/**
 * Resolves the trade, or renders the real not-found page.
 *
 * Split from the shell below so that the early return happens before any hook runs.
 * `/demo/pest-control` is a URL somebody will type, and answering it with a blank shell
 * inside a fictional business's chrome would be worse than the site's own 404 — which at
 * least says where they are and offers a way back.
 */
export function DemoLayout() {
  const { trade } = useParams();

  if (!isDemoSlug(trade)) return <NotFoundPage />;

  const Shell = shells[trade];
  return <Shell />;
}

function DemoShell({ site, slug }: DemoOutletContext) {
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  const meta = findPageMeta(pathname);
  useDocumentMeta(meta ?? { path: pathname, title: site.business.name, description: '' });

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    /*
     * No fragment branch, unlike `SiteLayout`.
     *
     * These are three short pages with no in-page anchors and nothing deep-linking into
     * them. Copying that branch across would be code written for a case that does not
     * exist; if a demo grows one, the branch belongs here rather than a comment promising
     * it does.
     */
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    mainRef.current?.focus();
  }, [pathname]);

  const context: DemoOutletContext = { site, slug };

  return (
    <div className={styles['shell']} style={paletteStyle(site.palette)}>
      <DemoBar slug={slug} businessName={site.business.name} />

      <div className={styles['site']}>
        <DemoHeader site={site} slug={slug} />

        <main id={DEMO_MAIN_ID} ref={mainRef} tabIndex={-1} className={styles['main']}>
          <Outlet context={context} />
        </main>

        <DemoFooter site={site} slug={slug} />
      </div>

      {/*
       * The sticky mobile call bar, bottom-centre — the thumb zone. The single
       * highest-evidence pattern in the trade-site research
       * (`docs/DEMO-QUALITY-UPGRADE.md` §3), hidden at desktop widths where the header
       * call element is always in reach. The call side is inert for the same reason the
       * header's is: a live `tel:` on a fictional number misdials a real person.
       */}
      <div className={styles['callBar']}>
        <p className={styles['callBarPhone']}>
          <Icon name="phone" size={16} />
          <span>
            {site.home.primaryAction} {site.business.phone}
          </span>
        </p>
        <Link to={demoPath(slug, 'contact')} className={styles['callBarCta']}>
          {site.home.secondaryAction}
        </Link>
      </div>
    </div>
  );
}
