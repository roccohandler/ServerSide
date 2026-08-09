import { useEffect } from 'react';
import { env } from '../config/env';
import { buildDocumentTitle } from '../content/pages';
import { site } from '../content/site';
import type { PageMeta } from '../types/content';

/**
 * Keeps the document head correct as the visitor navigates.
 *
 * The build step writes these same tags into a real HTML file for every route, so a
 * crawler or a link preview sees them without running any JavaScript. This hook exists
 * for what happens *after* that first load: client-side navigation does not re-fetch
 * the document, so without it every subsequent page would keep the first page's title.
 */

function upsertMeta(attribute: 'name' | 'property', key: string, content: string): void {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function upsertCanonical(href: string): void {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!element) {
    element = document.createElement('link');
    element.rel = 'canonical';
    document.head.appendChild(element);
  }

  element.href = href;
}

export function useDocumentMeta(page: PageMeta): void {
  useEffect(() => {
    const title = buildDocumentTitle(page);
    const canonical = `${env.siteUrl}${page.path === '/' ? '/' : page.path}`;

    document.title = title;

    upsertMeta('name', 'description', page.description);
    upsertMeta('name', 'robots', page.noIndex ? 'noindex, follow' : 'index, follow');

    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', page.description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', site.name);
    upsertMeta('property', 'og:locale', site.seo.locale);
    upsertMeta('property', 'og:image', `${env.siteUrl}${site.seo.ogImage}`);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', page.description);

    upsertCanonical(canonical);
  }, [page]);
}
