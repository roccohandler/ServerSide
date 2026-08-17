import { Button, TextField } from '@jobforge/ui';
import type { SearchTerm } from '../hooks/useSearchTerm';
import styles from './SearchField.module.css';

/*
 * The console's one search control, used by both list screens.
 *
 * ## It says what it matches, because the answer is surprising
 *
 * The server anchors the term, so this finds names that *start with* what is typed. "Heating"
 * does not find "Cascade Heating". That is a deliberate trade — an anchored match is one an
 * index can serve and an unanchored one is a scan of every document per keystroke — and a
 * control that silently behaves this way would read as a broken search rather than a fast one.
 * So the hint says it.
 *
 * ## `type="search"` and no form
 *
 * There is nothing to submit: the list narrows as the typing settles. A form would offer an
 * Enter key that appears to do something and does not. `type="search"` still gives the browser
 * its own clear affordance on the platforms that draw one; the button beside it is for the
 * ones that do not, and for anybody reaching it by keyboard.
 */
export interface SearchFieldProps {
  readonly id: string;
  readonly label: string;
  readonly term: SearchTerm;
}

export function SearchField({ id, label, term }: SearchFieldProps) {
  return (
    <div className={styles['row']}>
      <TextField
        id={id}
        type="search"
        label={label}
        hint="Matches the start of a name, a business or an address."
        value={term.value}
        onChange={(event) => term.setValue(event.target.value)}
      />

      {term.value ? (
        <Button variant="secondary" onClick={term.clear}>
          Clear
        </Button>
      ) : null}
    </div>
  );
}
