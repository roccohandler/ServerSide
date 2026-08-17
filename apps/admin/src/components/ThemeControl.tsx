import { SelectField, useTheme, type Theme } from '@jobforge/ui';
import styles from './ThemeControl.module.css';

/*
 * ============================================================================
 * THE APPEARANCE CONTROL, CONSOLE EDITION
 * ============================================================================
 *
 * The customer application has its own copy of this file and that is the arrangement
 * DECISION 026 describes: `useTheme` holds the behaviour and lives in `@jobforge/ui`; what
 * the control *looks like* belongs to whichever bar it sits in.
 *
 * The two differ in exactly the way that decision predicts. The customer's version is a
 * field in a footer with a label above it and room to breathe. This one is in a sticky bar
 * an owner scans twenty times a day, next to a sign-out button, so the label sits beside the
 * control rather than above it — a stacked field here would make the bar two rows tall on
 * every screen in the console to accommodate a setting somebody changes twice a year.
 *
 * Same three options, same stored key, same hook. The owner who signs into the console after
 * using the customer application finds the theme they already chose, because the preference
 * is one key and both origins read it.
 *
 * ...except when they are not the same origin, which they are not in production
 * (`admin.example.com` versus `customer.example.com`). `localStorage` is per-origin, so the
 * console remembers its own answer. That is a limitation and it is the correct one: the
 * alternative is a server round trip for a colour scheme, or a cookie on a shared parent
 * domain, and neither is worth what it costs to be told a preference twice.
 * ============================================================================
 */

const OPTIONS: readonly { value: Theme; label: string }[] = [
  { value: 'system', label: 'Match my system' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ThemeControl() {
  const { theme, setTheme } = useTheme();

  return (
    <div className={styles['control']}>
      <SelectField
        id="console-appearance"
        label="Appearance"
        options={OPTIONS}
        value={theme}
        onChange={(event) => setTheme(event.target.value as Theme)}
      />
    </div>
  );
}
