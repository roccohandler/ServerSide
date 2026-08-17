import { useState } from 'react';
import { cx } from './cx';
import styles from './Avatar.module.css';

/*
 * ============================================================================
 * WHO THIS IS, WHEN THERE IS NO PICTURE
 * ============================================================================
 *
 * Landing without a consumer — DECISION 029. `AppLayout` shows `user.name` as text and
 * `ConsoleLayout` shows an email address, and both are right for what they are: a workspace
 * with one person in it does not need a portrait of that person.
 *
 * Where this earns its place is a list of *several* people — a feedback thread with replies
 * from two sides of the desk, an activity trail. Nothing in either application has that
 * shape yet.
 *
 * ## Initials are the default, not the fallback
 *
 * This product has no avatar upload and no plan for one, so the overwhelmingly common case is
 * a name and nothing else. Building image-first with an initials fallback would optimise for
 * the case that never happens; `src` is optional and initials are what it does.
 *
 * An image that fails to load falls back to the same initials rather than to a broken-image
 * icon — the one genuinely useful thing an `onError` does here.
 *
 * ## It is decorative, and says so
 *
 * `aria-hidden`, always. An avatar sits beside the name it depicts; announcing "Dana Reyes"
 * as an image and then reading "Dana Reyes" is the same information twice, which is how a
 * screen-reader user learns to distrust a list. If a consumer ever needs a standalone avatar
 * with no name beside it, that consumer takes the accessible name — this component does not
 * guess at one it cannot see the context for.
 * ============================================================================
 */

export interface AvatarProps {
  /** The person's name. Used for the initials, and never rendered as text. */
  readonly name: string;
  /** Optional. Falls back to initials if absent or if it fails to load. */
  readonly src?: string;
  readonly size?: 'sm' | 'md';
  readonly className?: string;
}

/**
 * First and last initial, or the first two letters of a single word.
 *
 * `Array.from` rather than `slice`, so a name beginning with a character outside the basic
 * plane — an emoji, or many scripts — yields one character rather than half of a surrogate
 * pair, which renders as a replacement glyph.
 */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return '?';

  const first = Array.from(words[0] ?? '')[0] ?? '';
  const last = words.length > 1 ? (Array.from(words[words.length - 1] ?? '')[0] ?? '') : '';

  return (first + last).toUpperCase();
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  return (
    <span aria-hidden="true" className={cx(styles['avatar'], styles[size], className)}>
      {src && !failed ? (
        <img src={src} alt="" className={styles['image']} onError={() => setFailed(true)} />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
