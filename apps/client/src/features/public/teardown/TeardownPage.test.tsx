import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { pages } from '../../../content';
import { playbook } from '../../../content/playbook';
import { teardown } from '../../../content/teardown';
import { demoPath } from '../../../config/demos';
import { routes } from '../../../config/routes';
import { TeardownPage } from './TeardownPage';

/*
 * The teardown is the site's strongest proof asset and its most dangerous one, because
 * the persuasive version of it — a named real business — is the version that must never
 * ship. What is pinned here is the disclosure, its position, and the fact that every
 * finding resolves to a published improvement rather than to an opinion.
 */

function renderTeardown() {
  return render(
    <MemoryRouter>
      <TeardownPage />
    </MemoryRouter>,
  );
}

describe('the teardown', () => {
  it('is a real, indexable page', () => {
    const meta = pages.find((page) => page.path === routes.teardown);

    expect(meta).toBeDefined();
    expect(meta?.noIndex).toBeUndefined();
  });

  /*
   * The single most important assertion in this file. A composite presented as a real
   * site is the fabricated case study this whole project refuses to publish, and the
   * distance between the two is one deleted paragraph.
   */
  it('says the subject is a composite and not a real business', () => {
    renderTeardown();

    expect(screen.getByText(teardown.disclosure)).toBeInTheDocument();
    expect(teardown.disclosure.toLowerCase()).toContain('composite');
    expect(teardown.disclosure.toLowerCase()).toContain('not a real business');
    expect(teardown.disclosure.toLowerCase()).toContain('not a client');
  });

  /*
   * In the heading region rather than further down. A disclosure below six findings has
   * been read after the reader already believed it was somebody's actual website.
   */
  it('puts the disclosure in the opening region, not under the findings', () => {
    renderTeardown();

    const opening = screen.getByRole('region', { name: new RegExp(teardown.heading, 'i') });
    expect(within(opening).getByText(teardown.disclosure)).toBeInTheDocument();
  });

  it('names no business as the subject anywhere in its copy', () => {
    /*
     * The mock's brand mark is a blank rectangle and the composite has no name. The one
     * name in this content is the demonstration build's — a declared fiction, introduced
     * by a sentence saying so, in the `built` block below the mocks — which is why this
     * sweeps for real-business suffixes rather than for any proper noun at all.
     */
    const copy = JSON.stringify(teardown);
    expect(copy).not.toMatch(/\b(?:Inc\.|LLC|Ltd\.?|&\s?Sons|Brothers)\b/);
  });

  it('resolves every finding to a published improvement', () => {
    const known = new Set(playbook.principles.map((principle) => principle.id));

    for (const finding of teardown.findings) {
      expect(known.has(finding.principleId), `unknown principle "${finding.principleId}"`).toBe(
        true,
      );
    }
  });

  it('renders every finding with all three beats', () => {
    renderTeardown();

    const region = screen.getByRole('region', {
      name: new RegExp(teardown.findingsHeading, 'i'),
    });

    const count = teardown.findings.length;
    expect(within(region).getAllByText(teardown.labels.whatYouSee)).toHaveLength(count);
    expect(within(region).getAllByText(teardown.labels.whatItDoes)).toHaveLength(count);
    expect(within(region).getAllByText(teardown.labels.whatIdChange)).toHaveLength(count);
  });

  /*
   * A teardown that only makes its case is an advert. This is the paragraph that says a
   * common pattern is not a diagnosis of the reader's own site.
   */
  it('states what a composite cannot tell the reader about their own site', () => {
    renderTeardown();

    expect(screen.getByText(teardown.limits.body)).toBeInTheDocument();
    expect(teardown.limits.body.toLowerCase()).toContain('your site');
  });
});

/*
 * The third beat. The wireframe "after" proves a shape; the fully built block proves the
 * shape exists as a real page. What is pinned: the block presents the demo as a separate,
 * named fiction rather than as the composite rebuilt, carries the same Demonstration
 * badge every demo rendering on the site carries, and links to the route the screenshots
 * were captured from — an address the reader can go and check.
 */
describe('the fully built beat', () => {
  it('presents the demo as a named fiction, not as the composite rebuilt', () => {
    renderTeardown();

    expect(screen.getByText(teardown.built.disclosure)).toBeInTheDocument();
    expect(teardown.built.disclosure.toLowerCase()).toContain('fictional');
    expect(teardown.built.disclosure.toLowerCase()).toContain('not a client');
    expect(screen.getByText('Demonstration')).toBeInTheDocument();

    /*
     * The heading's subject must be the principles, never "the rebuilt version" — the
     * composite is not any one business, so it has no rebuilt version, and a heading
     * that says otherwise manufactures a before-and-after that never happened. The
     * first shipped heading made exactly this mistake.
     */
    expect(teardown.built.heading.toLowerCase()).not.toContain('rebuilt');
  });

  it('links to the demonstration site the screenshots were captured from', () => {
    renderTeardown();

    const link = screen.getByRole('link', { name: teardown.built.cta });
    expect(link).toHaveAttribute('href', demoPath('hvac'));
  });

  it('shows the captures with the disclosure bar described in the alt text', () => {
    renderTeardown();

    for (const alt of [teardown.built.desktopAlt, teardown.built.mobileAlt]) {
      const image = screen.getByAltText(alt);
      expect(image).toHaveAttribute('loading', 'lazy');
      expect(alt.toLowerCase()).toContain('disclosure bar');
    }
  });
});

describe('the heading outline', () => {
  function levels(): number[] {
    const { container } = renderTeardown();
    return [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((node) =>
      Number(node.tagName.slice(1)),
    );
  }

  it('opens with exactly one first-level heading', () => {
    const found = levels();

    expect(found.filter((level) => level === 1)).toHaveLength(1);
    expect(found[0]).toBe(1);
  });

  it('never skips a level', () => {
    levels().reduce((previous, level) => {
      expect(level, `skips from h${previous} to h${level}`).toBeLessThanOrEqual(previous + 1);
      return level;
    }, 1);
  });

  /*
   * The before/after section is named by a heading that is deliberately not on screen —
   * the two figures already carry visible captions. It still has to exist and still has
   * to be reachable, or the section is an unlabelled region in the outline.
   */
  it('names the before/after section for assistive technology', () => {
    renderTeardown();

    const heading = screen.getByRole('heading', {
      name: new RegExp(teardown.beforeLabel, 'i'),
      level: 2,
    });

    expect(heading).toHaveClass('visually-hidden');
    expect(
      screen.getByRole('region', { name: new RegExp(teardown.beforeLabel, 'i') }),
    ).toBeTruthy();
  });
});

describe('the sample review', () => {
  it('is labelled illustrative rather than presented as a client document', () => {
    renderTeardown();

    expect(screen.getByText(teardown.reviewSample.disclaimer)).toBeInTheDocument();
    expect(teardown.reviewSample.disclaimer.toLowerCase()).toContain('illustrative');

    /*
     * "Redacted" would imply a real client review exists behind the black bars. There are
     * no clients, so the word may not appear anywhere in this content.
     */
    expect(JSON.stringify(teardown.reviewSample).toLowerCase()).not.toContain('redact');
  });

  it('describes what comes back, including the part that says not to buy anything', () => {
    renderTeardown();

    const region = screen.getByRole('region', {
      name: new RegExp(teardown.reviewSample.heading, 'i'),
    });

    for (const section of teardown.reviewSample.sections) {
      expect(within(region).getByText(section.heading)).toBeInTheDocument();
    }

    // The section that makes the rest worth reading — see content/teardown.ts.
    const boundary = teardown.reviewSample.sections.find((section) => section.id === 'boundary');
    expect(boundary).toBeDefined();
    expect(boundary?.body.toLowerCase()).toContain('not the constraint');
  });
});
