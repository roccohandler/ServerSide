import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/*
 * ============================================================================
 * A SEARCH BOX THAT IS IN THE URL AND DOES NOT FETCH ON EVERY KEYSTROKE
 * ============================================================================
 *
 * Two things that look independent and are not.
 *
 * ## Why the URL
 *
 * Because a search is a place. The owner finds a client, opens the project, presses back, and
 * should be where they were rather than at the top of an unfiltered list of five hundred. It
 * also makes a search linkable, which matters the first time somebody wants to say "look at
 * this" to themselves in a note.
 *
 * `replace: true`, always. Typing eight characters would otherwise leave eight history
 * entries, and the back button would walk the letters of a word backwards.
 *
 * ## Why the delay
 *
 * Because every keystroke would be a request, and each one is an indexed query on a
 * serverless function billed by the second. A third of a second is long enough that a typed
 * word is one request and short enough that nobody notices they waited.
 *
 * ## Why there are two values
 *
 * The input must repaint on every keystroke or it feels broken; the fetch must not. So the
 * box reads `value` and the loader reads `committed`, and they differ for 300 ms at a time.
 * One value cannot do both jobs — that is the whole reason this hook exists rather than a
 * `useState` at the call site.
 * ============================================================================
 */

/** Long enough to swallow a typed word, short enough to feel immediate. */
const DEBOUNCE_MS = 300;

/** Matches the server's bound. A longer term is a paste accident, not a search. */
const MAX_LENGTH = 80;

export interface SearchTerm {
  /** What the input shows. Changes on every keystroke. */
  readonly value: string;
  /** What the loader should ask for. Changes once the typing stops. */
  readonly committed: string;
  setValue: (next: string) => void;
  clear: () => void;
}

export function useSearchTerm(): SearchTerm {
  const [params, setParams] = useSearchParams();

  /*
   * The URL is the source of truth on arrival and the input owns it afterwards. Reading
   * `params` on every render instead would fight the debounce: the box would revert to the
   * committed value 300 ms after each keystroke.
   */
  const fromUrl = params.get('q') ?? '';
  const [value, setValue] = useState(fromUrl);
  const [committed, setCommitted] = useState(fromUrl);

  useEffect(() => {
    if (value === committed) return;

    const timer = setTimeout(() => {
      setCommitted(value);

      const next = new URLSearchParams(window.location.search);
      if (value) next.set('q', value);
      else next.delete('q');

      setParams(next, { replace: true });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, committed, setParams]);

  const clear = useCallback(() => setValue(''), []);

  return {
    value,
    committed,
    setValue: (next) => setValue(next.slice(0, MAX_LENGTH)),
    clear,
  };
}
