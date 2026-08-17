import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { routes } from '../../config/routes';
import { RouteFallback } from '../../components/patterns/RouteFallback';

/*
 * ============================================================================
 * `/promo` — ITS OWN ROUTE MODULE, WITH NO LAYOUT AT ALL
 * ============================================================================
 *
 * A fifth module for one page, and the reason is that it belongs to none of the four.
 *
 * It is not `marketingRoutes`: `SiteLayout` is the header, the navigation, the assessment
 * call to action and the full footer, and every one of those is an invitation to go somewhere
 * other than the single field this page is asking for.
 *
 * It is not `authRoutes` either, which was the closer call — this *is* a password prompt, and
 * `AuthLayout` exists for exactly that. But `AuthLayout`'s back control returns to the
 * marketing site, and somebody who was handed this URL and a passcode has no marketing site
 * to go back to; they were sent here, on purpose, by a person.
 *
 * So the page is its own document: one card, its own `<main>`, and nothing around it.
 *
 * Lazy like everything else, and it matters more here than usual — a page nobody browses to
 * has no business being in the chunk every visitor to the homepage downloads.
 * ============================================================================
 */

const PromoPage = lazy(() =>
  import('../../features/public/promo/PromoPage').then((module) => ({
    default: module.PromoPage,
  })),
);

export const promoRoutes = (
  <Route
    path={routes.promo}
    element={
      <Suspense fallback={<RouteFallback label="Loading" />}>
        <PromoPage />
      </Suspense>
    }
  />
);
