import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnsavedChanges } from './useUnsavedChanges';

/*
 * The half a single-page application makes easy to get wrong.
 *
 * `beforeunload` is one line and covers a reload, a closed tab and a typed URL. It is blind
 * to a click on a header link, because the document never unloads — and that is the departure
 * that actually happens, on the four longest forms in the product. These tests are about the
 * capture listener that closes it, and mostly about the cases where it must **not** fire: a
 * guard that stops a middle click or a skip link is a guard somebody deletes within a week.
 */

function anchor(href: string, attributes: Record<string, string> = {}): HTMLAnchorElement {
  const element = document.createElement('a');
  element.setAttribute('href', href);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  document.body.append(element);
  return element;
}

/** A real click, dispatched the way a browser dispatches one, so capture ordering is real. */
function click(element: HTMLElement, init: MouseEventInit = {}): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
  element.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  document.body.replaceChildren();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('leaving a page with unsaved work', () => {
  it('stops an in-app link and reports where it was going', () => {
    const { result } = renderHook(() => useUnsavedChanges(true));
    const link = anchor('/app/billing');

    let event!: MouseEvent;
    act(() => {
      event = click(link);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(result.current.pending).toBe('/app/billing');
  });

  it('does nothing at all when there is nothing to lose', () => {
    const { result } = renderHook(() => useUnsavedChanges(false));
    const link = anchor('/app/billing');

    let event!: MouseEvent;
    act(() => {
      event = click(link);
    });

    expect(event.defaultPrevented).toBe(false);
    expect(result.current.pending).toBeNull();
  });

  it('lets the reader stay, and stops the same link again afterwards', () => {
    const { result } = renderHook(() => useUnsavedChanges(true));
    const link = anchor('/app/billing');

    act(() => void click(link));
    act(() => result.current.cancel());
    expect(result.current.pending).toBeNull();

    /* Cancelling must not disarm the guard — the form is still dirty. */
    act(() => void click(link));
    expect(result.current.pending).toBe('/app/billing');
  });

  /*
   * The five it must ignore. Every one of these is a click that leaves the page exactly where
   * it is, and a confirmation over any of them is a confirmation somebody learns to dismiss
   * without reading — which is how the one that matters gets dismissed too.
   */
  it.each([
    ['a modified click, which opens a new tab', '/app/billing', {}, { metaKey: true }],
    ['a middle click, likewise', '/app/billing', {}, { button: 1 }],
    ['target="_blank"', '/app/billing', { target: '_blank' }, {}],
    ['a download', '/files/report.pdf', { download: '' }, {}],
    ['a fragment, including every skip link', '#main-content', {}, {}],
    ['another origin, which beforeunload already has', 'https://stripe.com/x', {}, {}],
  ])('ignores %s', (_name, href, attributes, init) => {
    const { result } = renderHook(() => useUnsavedChanges(true));
    const link = anchor(href, attributes);

    let event!: MouseEvent;
    act(() => {
      event = click(link, init);
    });

    expect(event.defaultPrevented).toBe(false);
    expect(result.current.pending).toBeNull();
  });

  it('ignores a link back to the page it is already on', () => {
    const { result } = renderHook(() => useUnsavedChanges(true));

    act(() => void click(anchor(window.location.pathname)));

    expect(result.current.pending).toBeNull();
  });

  it('finds the link when the click lands on something inside it', () => {
    const { result } = renderHook(() => useUnsavedChanges(true));
    const link = anchor('/app/projects');
    const label = document.createElement('span');
    link.append(label);

    act(() => void click(label));

    expect(result.current.pending).toBe('/app/projects');
  });

  /*
   * The double-confirmation bug this would otherwise have: `proceed` leaves the page while the
   * form is still dirty, so `beforeunload` fires and the browser asks a second time — about a
   * departure the reader has just explicitly confirmed in our own dialog.
   */
  it('does not ask twice about a departure already confirmed', () => {
    const assign = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      assign,
    } as unknown as Location);

    const { result } = renderHook(() => useUnsavedChanges(true));

    act(() => void click(anchor('/app/billing')));
    act(() => result.current.proceed());

    expect(assign).toHaveBeenCalledWith('/app/billing');

    const unload = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(false);
  });
});
