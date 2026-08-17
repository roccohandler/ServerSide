import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { RouteFallback } from '../../components/patterns/RouteFallback';

/*
 * ============================================================================
 * THE DEMONSTRATION SITES
 * ============================================================================
 *
 * Four lazy components sharing one chunk: the shell and the three page templates. Each
 * trade's *content* is a further chunk of its own, loaded by `content/demos/index.ts` — so
 * opening the HVAC demo costs the shell plus HVAC, not five businesses.
 *
 * That splits differently from the five industry pages on purpose. Those are pure text and
 * share one chunk because a reader of two of them should not pay a second round trip;
 * these carry a palette, a set of photographs and three pages of copy each, which is a
 * different weight class, and a reader who opens one rarely opens two.
 *
 * ## Why they are registered outside `SiteLayout`
 *
 * `SiteLayout` paints the JobForge header and footer. A demonstration of an HVAC company's
 * website cannot be wrapped in another company's navigation — the thing being demonstrated
 * is what it is like to arrive at *that business*. `DemoLayout` is a second shell with the
 * same responsibilities, plus the disclosure bar.
 *
 * ## Why the suspense boundary is here rather than inside `DemoLayout`
 *
 * The layout itself suspends: it calls `use()` on the trade's content chunk to get the
 * palette and the business name, both of which the shell needs before it can paint
 * anything at all.
 * ============================================================================
 */

const DemoLayout = lazy(() =>
  import('../../features/public/demo/DemoLayout').then((module) => ({
    default: module.DemoLayout,
  })),
);

const DemoHomePage = lazy(() =>
  import('../../features/public/demo/DemoHomePage').then((module) => ({
    default: module.DemoHomePage,
  })),
);

const DemoServicesPage = lazy(() =>
  import('../../features/public/demo/DemoServicesPage').then((module) => ({
    default: module.DemoServicesPage,
  })),
);

const DemoContactPage = lazy(() =>
  import('../../features/public/demo/DemoContactPage').then((module) => ({
    default: module.DemoContactPage,
  })),
);

export const demoRoutes = (
  <Route
    path="/demo/:trade"
    element={
      /*
       * This boundary is the whole demonstration site, shell included — `DemoLayout` calls
       * `use()` on the trade's content chunk to get the palette and the business name before
       * it can paint anything. So a blank fallback here was a blank *document*, not a blank
       * content area, on the pages a prospect is sent to as proof of the work.
       */
      <Suspense fallback={<RouteFallback label="Loading the demonstration site" />}>
        <DemoLayout />
      </Suspense>
    }
  >
    <Route index element={<DemoHomePage />} />
    <Route path="services" element={<DemoServicesPage />} />
    <Route path="contact" element={<DemoContactPage />} />
  </Route>
);
