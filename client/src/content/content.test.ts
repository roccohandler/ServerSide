import { describe, expect, it } from 'vitest';
import { INQUIRY_TYPES } from '../types/api';
import { routes } from '../config/routes';
import { faqItems } from './faq';
import { inquiryOptions } from './contact';
import { pages } from './pages';
import { portfolioProjects } from './portfolio';
import { services } from './services';
import { site } from './site';

/*
 * Guards on the content layer.
 *
 * These are not tests of React — they protect the two things that silently break a
 * content-driven site: a contract that drifts out of sync with the server, and a demo
 * project that quietly loses the label saying it is not client work.
 */

describe('the inquiry options', () => {
  it('use exactly the slugs the API accepts', () => {
    // The server has the mirror of this assertion. If one side changes, both fail.
    expect(inquiryOptions.map((option) => option.value)).toEqual([...INQUIRY_TYPES]);
  });

  it('give every option a label a business owner would recognise', () => {
    for (const option of inquiryOptions) {
      expect(option.label.length).toBeGreaterThan(3);
    }
  });
});

describe('the portfolio', () => {
  it('marks every example that is not client work', () => {
    // Nothing on this site may read as a real customer project unless it is one.
    for (const project of portfolioProjects) {
      expect(project.isDemo).toBe(true);
    }
  });

  it('gives every example meaningful alternative text', () => {
    for (const project of portfolioProjects) {
      expect(project.imageAlt.length).toBeGreaterThan(20);
      expect(project.imageAlt.toLowerCase()).not.toMatch(/^image of/);
    }
  });

  it('never links to a demo that has not been published', () => {
    for (const project of portfolioProjects) {
      if (project.demoUrl !== undefined) {
        expect(project.demoUrl).toMatch(/^https?:\/\//);
      }
    }
  });

  it('covers more than one trade, so the site does not read as HVAC-only', () => {
    const industries = new Set(portfolioProjects.map((project) => project.industry));
    expect(industries.size).toBeGreaterThanOrEqual(4);
  });
});

describe('page metadata', () => {
  it('covers every route in the application', () => {
    const documented = new Set(pages.map((page) => page.path));
    for (const path of Object.values(routes)) {
      expect(documented.has(path)).toBe(true);
    }
  });

  it('gives every page a unique title and a usable description length', () => {
    const titles = pages.map((page) => page.title);
    expect(new Set(titles).size).toBe(titles.length);

    for (const page of pages) {
      // Search engines truncate around 160 characters; below 50 wastes the space.
      expect(page.description.length).toBeGreaterThan(50);
      expect(page.description.length).toBeLessThanOrEqual(200);
    }
  });
});

describe('the site configuration', () => {
  it('points every navigation item at a real route', () => {
    const known = new Set<string>(Object.values(routes));
    for (const item of [...site.nav, ...site.footerNav]) {
      expect(known.has(item.to)).toBe(true);
    }
  });

  it('has a primary and a fallback call to action so the offer can be switched off', () => {
    expect(site.cta.primary.label).toBeTruthy();
    expect(site.cta.primaryFallback.label).toBeTruthy();
    expect(site.cta.primary.label).not.toBe(site.cta.primaryFallback.label);
  });
});

describe('services and FAQ', () => {
  it('give every service a stable id and at least one supporting detail', () => {
    const ids = services.map((service) => service.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const service of services) {
      expect(service.details.length).toBeGreaterThan(0);
    }
  });

  it('answer the cost and timeline questions people ask first', () => {
    const questions = faqItems.map((item) => item.question.toLowerCase()).join(' ');
    expect(questions).toMatch(/cost/);
    expect(questions).toMatch(/how long/);
  });
});
