import { SelectField, useTheme, type Theme } from '@jobforge/ui';
import styles from './ThemeControl.module.css';

/*
 * ============================================================================
 * THE APPEARANCE CONTROL
 * ============================================================================
 *
 * Three options and a native `<select>`, which is a smaller decision than it looks.
 *
 * ## Why not a switch
 *
 * `Switch` exists in `@jobforge/ui` and it is the wrong control here, because a switch has
 * two positions and this has three. The third — *match my system* — is the default, the one
 * most people want, and the only one that follows a reader from day into evening without
 * them touching anything. A two-position switch forces everybody into an explicit choice
 * they then have to remember to unmake, and there is no position on it that means "stop
 * overriding me".
 *
 * ## Why a native select rather than a segmented control
 *
 * Three reasons, in order of weight:
 *
 *   1. **It announces itself.** A `<select>` reads its new value aloud on change, in every
 *      screen reader, without a live region. The marketing shell has no `AnnouncerProvider`
 *      — that lives in `AppLayout`, for the workspace — so a custom control here would have
 *      needed one, mounted on every marketing page, to say one sentence.
 *   2. **It is already a primitive.** `SelectField` is in the eager bundle because the
 *      contact forms use it, so this control's marginal cost is a wrapper class and a label.
 *      A segmented control would be a new pattern, new CSS, and new keyboard handling, in
 *      the footer of every page in the payload budget.
 *   3. It is what a reader's own operating system offers them for this setting.
 *
 * ## Where the state lives
 *
 * `useTheme` in `@jobforge/ui`, shared with the console. This file is the half that is not
 * shared — see the note in that hook about behaviour being worth one copy and appearance
 * two.
 *
 * The strings are inline rather than in `content/`, which is the marketing site's habit. The
 * rule `content/app.ts` encodes is "strings that would otherwise exist in two copies"; there
 * is one copy of this component and the footer and the workspace both render *it*, not a
 * paraphrase of it.
 * ============================================================================
 */

const OPTIONS: readonly { value: Theme; label: string }[] = [
  { value: 'system', label: 'Match my system' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ThemeControl({ id = 'appearance' }: { readonly id?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={styles['control']}>
      <SelectField
        id={id}
        label="Appearance"
        options={OPTIONS}
        value={theme}
        onChange={(event) => setTheme(event.target.value as Theme)}
      />
    </div>
  );
}
