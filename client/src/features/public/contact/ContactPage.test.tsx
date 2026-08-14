import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { site } from '../../../content';
import { routes } from '../../../config/routes';
import { ContactPage } from './ContactPage';

/*
 * The page every primary call to action on the site lands on.
 *
 * What is pinned here is the answer to the objection that stops most people accepting a
 * free anything: not "is it really free", but "what am I actually going to get". The
 * sample on the teardown page answers it in one click rather than one email exchange, and
 * this is the last surface where that question is still open.
 */

vi.mock('../../../lib/api', () => ({
  submitLead: vi.fn().mockResolvedValue({ success: true, data: { submittedAt: '' } }),
}));

function renderContact() {
  return render(
    <MemoryRouter>
      <ContactPage />
    </MemoryRouter>,
  );
}

describe('the contact page', () => {
  it('lands the primary call to action on the form itself', () => {
    const { container } = renderContact();

    // `SiteLayout` moves focus here after a `#request` navigation.
    expect(container.querySelector('#request')).not.toBeNull();
  });

  it('shows what a free review comes back with, before anybody types anything', () => {
    renderContact();

    const link = screen.getByRole('link', { name: site.offer.freeReview.sampleLabel });
    expect(link).toHaveAttribute('href', routes.teardown);
    expect(
      screen.getByText(site.offer.freeReview.sampleLede, { exact: false }),
    ).toBeInTheDocument();
  });

  /*
   * The free-review switch has to remove every promise of one, not most of them. A link
   * offering to show what the review returns is a promise that it exists.
   */
  it('offers the sample only while the free review is part of the offer', () => {
    renderContact();

    if (site.offer.freeReview.enabled) {
      expect(
        screen.getByRole('link', { name: site.offer.freeReview.sampleLabel }),
      ).toBeInTheDocument();
    } else {
      expect(screen.queryByRole('link', { name: site.offer.freeReview.sampleLabel })).toBeNull();
    }
  });
});
