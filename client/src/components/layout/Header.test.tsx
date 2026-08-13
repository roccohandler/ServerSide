import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { primaryCta, site } from '../../content';
import { Header } from './Header';

/*
 * The header is the only thing on every page, so it is the only thing that can be
 * relied on to offer a way forward. These tests pin the three jobs it has: show where
 * else to go, make the primary action obvious, and stay usable from a keyboard.
 */

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
}

describe('Header', () => {
  /*
   * The mobile copy of the navigation is behind `hidden` while the menu is closed, which
   * is why only one link per destination is reachable here — a closed menu must not be
   * announced to a screen reader as a second set of links.
   */
  it('points every navigation item at its route', () => {
    renderHeader();

    for (const item of site.nav) {
      const link = screen.getByRole('link', { name: item.label });
      expect(link).toHaveAttribute('href', item.to);
    }
  });

  /*
   * The nav used to carry a "Contact" link pointing at exactly where the call-to-action
   * button goes. Two links to one destination, one of them dressed as an ordinary word,
   * is a weaker ask than one — so the button is the only route to it from up here.
   */
  it('keeps the primary action out of the ordinary navigation', () => {
    renderHeader();

    /*
     * The header uses `cta.navLabel` — a shorter wording of the same action. The full
     * label was wrapping onto two lines in a bar that also holds five nav items, a phone
     * number and the brand, which made the button the largest object on the screen.
     */
    const actions = screen.getAllByRole('link', { name: site.cta.navLabel });
    expect(actions.length).toBeGreaterThanOrEqual(1);
    for (const action of actions) expect(action).toHaveAttribute('href', primaryCta.to);

    expect(site.nav.map((item) => item.to)).not.toContain(primaryCta.to);
  });

  /*
   * The short label exists for one reason. If it ever stops being shorter, it has stopped
   * having a reason, and two wordings of one action is how they drift into two offers.
   */
  it('uses a genuinely shorter label than the full call to action', () => {
    expect(site.cta.navLabel.length).toBeLessThan(primaryCta.label.length);
    expect(site.cta.navLabel).toBeTruthy();
  });

  /*
   * Every action used to live inside the collapsed menu, which meant a visitor on a
   * phone saw no way to act until they opened it.
   */
  it('puts a call button in the bar rather than behind the menu', () => {
    renderHeader();

    // The desktop header shows the number itself; this one is the compact bar button.
    const call = screen.getByText('Call', { selector: 'span' }).closest('a');

    expect(call).toBeInTheDocument();
    expect(call).toHaveAttribute('href', expect.stringContaining('tel:'));
    expect(call).toHaveAccessibleName(new RegExp(`call ${site.contact.phone}`, 'i'));
  });

  describe('the mobile menu', () => {
    it('announces whether it is open, and opens on click', async () => {
      const user = userEvent.setup();
      renderHeader();

      const toggle = screen.getByRole('button', { name: /menu/i });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');

      await user.click(toggle);

      const opened = screen.getByRole('button', { name: /close/i });
      expect(opened).toHaveAttribute('aria-expanded', 'true');

      const menu = screen.getByRole('navigation', { name: /main \(mobile\)/i });
      expect(within(menu).getAllByRole('link').length).toBe(site.nav.length);
    });

    it('closes on Escape and hands focus back to the control that opened it', async () => {
      const user = userEvent.setup();
      renderHeader();

      await user.click(screen.getByRole('button', { name: /menu/i }));
      await user.keyboard('{Escape}');

      const toggle = screen.getByRole('button', { name: /menu/i });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(toggle).toHaveFocus();
    });
  });
});
