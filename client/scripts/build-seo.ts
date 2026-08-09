import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { buildDocumentTitle } from '../src/content/pages';
import { notFoundPage, pages } from '../src/content/pages';
import { site } from '../src/content/site';
import { isPlaceholder } from '../src/lib/placeholders';
import type { PageMeta } from '../src/types/content';

/*
 * Post-build SEO pass.
 *
 * Vite emits a single index.html. That is fine for a visitor — React fills the page in
 * — but a crawler or a link preview that does not run JavaScript sees the same generic
 * title on every URL. Facebook, LinkedIn, Slack and iMessage all fall into that group.
 *
 * So after the bundle is built, this writes one real HTML file per route with that
 * route's title, description, canonical link and Open Graph tags already in the markup,
 * plus sitemap.xml and robots.txt. Vercel's `cleanUrls` serves `about.html` at `/about`,
 * and React Router takes over from there.
 *
 * It is about a hundred lines and removes the need for a server-rendering framework.
 */

const clientDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(clientDir, 'dist');
const repoRoot = resolve(clientDir, '..');

const env = loadEnv('production', repoRoot, 'VITE_');
const siteUrl = (env['VITE_SITE_URL'] ?? 'http://localhost:5173').replace(/\/$/, '');

const SEO_START = '<!--seo:start-->';
const SEO_END = '<!--seo:end-->';

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function canonicalUrlFor(path: string): string {
  return `${siteUrl}${path === '/' ? '/' : path}`;
}

/**
 * Structured data is emitted only once the business facts are real.
 *
 * Publishing `"name": "[BUSINESS_NAME]"` to a search engine would be worse than
 * publishing nothing, so the whole block is skipped while placeholders remain.
 */
function buildStructuredData(): string | null {
  const { name, description, contact, serviceArea } = site;

  if (isPlaceholder(name) || isPlaceholder(contact.phone) || isPlaceholder(contact.email)) {
    return null;
  }

  const data = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name,
    description,
    url: `${siteUrl}/`,
    telephone: contact.phone,
    email: contact.email,
    image: `${siteUrl}${site.seo.ogImage}`,
    areaServed: serviceArea.cities.map((city) => ({
      '@type': 'City',
      name: city,
      containedInPlace: { '@type': 'State', name: serviceArea.region },
    })),
  };

  // JSON is embedded in a <script> element, so any "</script>" inside it must be broken up.
  const json = JSON.stringify(data, null, 2).replace(/<\//g, '<\\/');
  return `<script type="application/ld+json">\n${json}\n    </script>`;
}

const structuredData = buildStructuredData();

function buildHead(page: PageMeta): string {
  const title = buildDocumentTitle(page);
  const canonical = canonicalUrlFor(page.path);
  const ogImage = `${siteUrl}${site.seo.ogImage}`;

  const tags = [
    `<title>${escapeAttribute(title)}</title>`,
    `<meta name="description" content="${escapeAttribute(page.description)}" />`,
    `<meta name="robots" content="${page.noIndex ? 'noindex, follow' : 'index, follow'}" />`,
    `<link rel="canonical" href="${escapeAttribute(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeAttribute(site.name)}" />`,
    `<meta property="og:locale" content="${escapeAttribute(site.seo.locale)}" />`,
    `<meta property="og:title" content="${escapeAttribute(title)}" />`,
    `<meta property="og:description" content="${escapeAttribute(page.description)}" />`,
    `<meta property="og:url" content="${escapeAttribute(canonical)}" />`,
    `<meta property="og:image" content="${escapeAttribute(ogImage)}" />`,
    `<meta property="og:image:type" content="${escapeAttribute(site.seo.ogImageType)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttribute(title)}" />`,
    `<meta name="twitter:description" content="${escapeAttribute(page.description)}" />`,
    `<meta name="twitter:image" content="${escapeAttribute(ogImage)}" />`,
  ];

  // Structured data belongs on the homepage only; repeating it on every page adds nothing.
  if (structuredData && page.path === '/') {
    tags.push(structuredData);
  }

  return tags.join('\n    ');
}

/** `/` -> `index.html`, `/about` -> `about.html`. */
function outputFileFor(path: string): string {
  if (path === '/') return 'index.html';
  return `${path.replace(/^\//, '')}.html`;
}

function buildSitemap(): string {
  const entries = pages
    .filter((page) => !page.noIndex)
    .map(
      (page) => `  <url>
    <loc>${escapeAttribute(canonicalUrlFor(page.path))}</loc>
    <priority>${(page.sitemapPriority ?? 0.5).toFixed(1)}</priority>
  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

function buildRobots(): string {
  return `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
}

export async function generateSeoFiles(): Promise<void> {
  const templatePath = join(distDir, 'index.html');
  let template: string;

  try {
    template = await readFile(templatePath, 'utf8');
  } catch {
    throw new Error(`Could not read ${templatePath}. Run \`vite build\` before this script.`);
  }

  const startIndex = template.indexOf(SEO_START);
  const endIndex = template.indexOf(SEO_END);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error(
      `index.html is missing the ${SEO_START} / ${SEO_END} markers that mark the block to replace.`,
    );
  }

  const before = template.slice(0, startIndex);
  const after = template.slice(endIndex + SEO_END.length);

  const written: string[] = [];

  for (const page of [...pages, notFoundPage]) {
    // The not-found metadata is served as 404.html, which Vercel returns for unknown paths.
    const fileName = page === notFoundPage ? '404.html' : outputFileFor(page.path);
    const outputPath = join(distDir, fileName);

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${before}${buildHead(page)}${after}`, 'utf8');
    written.push(fileName);
  }

  await writeFile(join(distDir, 'sitemap.xml'), buildSitemap(), 'utf8');
  await writeFile(join(distDir, 'robots.txt'), buildRobots(), 'utf8');

  console.log(`[build-seo] site URL: ${siteUrl}`);
  console.log(`[build-seo] wrote ${written.length} pages: ${written.join(', ')}`);
  console.log('[build-seo] wrote sitemap.xml, robots.txt');

  if (!structuredData) {
    console.log(
      '[build-seo] structured data skipped: business name, phone or email is still a placeholder.',
    );
  }

  if (siteUrl.includes('localhost')) {
    console.warn(
      '[build-seo] WARNING: VITE_SITE_URL is not set, so canonical URLs point at localhost.',
    );
  }
}
