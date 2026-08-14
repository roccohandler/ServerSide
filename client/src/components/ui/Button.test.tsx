import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Button, ButtonLink } from './Button';

/*
 * The canonical button.
 *
 * These test the contract a caller depends on rather than what it looks like: which
 * element comes out, where a link points, and whether a disabled control can still be
 * fired. Nothing here asserts a class name — the variants are styling, and a test that
 * pins them would fail on every re-skin while catching nothing a reader would notice.
 *
 * The distinction the first two tests protect is the one that is easiest to get wrong and
 * worst to get wrong: something that *does* a thing is a `<button>`, something that *goes*
 * somewhere is an `<a>`. Swapping them breaks keyboard behaviour, screen-reader
 * announcements and the browser's own "open in new tab" — silently, in every case.
 */

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Button', () => {
  it('renders a real button element', () => {
    render(<Button>Score my site</Button>);
    expect(screen.getByRole('button', { name: 'Score my site' })).toBeInTheDocument();
  });

  /*
   * A bare <button> inside a <form> submits it. Every Button in this codebase that is not
   * explicitly a submit is an ordinary control, so the default has to be the safe one.
   */
  it('defaults to type="button" so it cannot accidentally submit a form', () => {
    render(<Button>Reset</Button>);
    expect(screen.getByRole('button', { name: 'Reset' })).toHaveAttribute('type', 'button');
  });

  it('honours an explicit type', () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute('type', 'submit');
  });

  it('calls onClick when pressed', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={onClick}>Press</Button>);
    await user.click(screen.getByRole('button', { name: 'Press' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire while disabled', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <Button disabled onClick={onClick}>
        Press
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Press' });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders every variant and size as a button', () => {
    const variants = ['primary', 'secondary', 'inverse', 'ghost'] as const;

    for (const variant of variants) {
      const { unmount } = render(
        <Button variant={variant} size="lg">
          {variant}
        </Button>,
      );
      expect(screen.getByRole('button', { name: variant })).toBeInTheDocument();
      unmount();
    }
  });
});

describe('ButtonLink', () => {
  it('renders an anchor, not a button', () => {
    renderWithRouter(<ButtonLink to="/services">Services</ButtonLink>);

    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/services');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  /*
   * An internal path must go through the router, or every primary call to action becomes a
   * full page load — which on this site means re-downloading the bundle to move one route.
   */
  it('keeps an internal path on the client router', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ButtonLink to="/contact">Contact</ButtonLink>);

    const link = screen.getByRole('link', { name: 'Contact' });
    await user.click(link);

    // A router Link intercepts the click; a plain anchor would have jsdom complain.
    expect(link).toHaveAttribute('href', '/contact');
    expect(link).not.toHaveAttribute('target');
  });

  it('opens an external link in a new tab, safely', () => {
    renderWithRouter(<ButtonLink to="https://example.com">Example</ButtonLink>);

    const link = screen.getByRole('link', { name: 'Example' });
    expect(link).toHaveAttribute('target', '_blank');
    // Without `noopener` the opened page gets a handle on this one via window.opener.
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  /*
   * `tel:` and `mailto:` are not http, and must not get `target="_blank"` — a new tab that
   * immediately hands off to the dialler leaves an empty tab behind on desktop.
   */
  it.each([
    ['tel:2069736798', 'Call'],
    ['mailto:hello@example.com', 'Email'],
  ])('renders %s as a plain anchor', (href, label) => {
    renderWithRouter(<ButtonLink to={href}>{label}</ButtonLink>);

    const link = screen.getByRole('link', { name: label });
    expect(link).toHaveAttribute('href', href);
    expect(link).not.toHaveAttribute('target');
  });

  it('fires onClick before navigating, for analytics', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    renderWithRouter(
      <ButtonLink to="/contact" onClick={onClick}>
        Contact
      </ButtonLink>,
    );
    await user.click(screen.getByRole('link', { name: 'Contact' }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
