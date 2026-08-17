import type { JSX } from 'react';

/**
 * The available icons. The `paths` table below implements this union exhaustively, so
 * adding a name here without drawing it is a compile error rather than a blank space.
 *
 * It lives with the component that implements it, rather than in the client's content
 * types where it used to. That was the wrong direction: a package cannot depend on the
 * application that consumes it, and the list of icons that exist is a fact about the icon
 * set — not about the copy that happens to reference them.
 */
export type IconName =
  | 'layout'
  | 'code'
  | 'phone'
  | 'target'
  | 'inbox'
  | 'rocket'
  | 'wrench'
  | 'check'
  | 'bolt'
  | 'shield'
  | 'mail'
  | 'map-pin'
  | 'arrow-right'
  /* The back control on the auth pages, which have no other navigation. */
  | 'arrow-left'
  | 'menu'
  | 'close'
  | 'alert'
  /* The password show/hide toggle. See `PasswordField`. */
  | 'eye'
  | 'eye-off';

/*
 * A small inline icon set.
 *
 * Inline rather than an icon package: sixteen icons is a few hundred bytes of markup,
 * where a library would be a dependency, a bundle and a runtime lookup. Every icon is
 * decorative — meaning always comes from the adjacent text — so all of them are hidden
 * from assistive technology.
 */

const paths: Record<IconName, JSX.Element> = {
  layout: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </>
  ),
  code: (
    <>
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </>
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  inbox: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.4 4.3A2 2 0 0 1 7.2 3h9.6a2 2 0 0 1 1.8 1.3L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z" />
    </>
  ),
  rocket: (
    <>
      <path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.9.7-2.2-.1-3a2.1 2.1 0 0 0-2.9 0Z" />
      <path d="M12 15 9 12a11 11 0 0 1 2-6c2-2.8 5-4 8-4 0 3-1.2 6-4 8a11 11 0 0 1-3 2Z" />
      <path d="M9 12H5s.4-2.2 1.5-3c1.2-.9 3.5-.5 3.5-.5M12 15v4s2.2-.4 3-1.5c.9-1.2.5-3.5.5-3.5" />
    </>
  ),
  wrench: <path d="M14.7 6.3a4 4 0 0 0 5.3 5.2l-8 8a2.8 2.8 0 0 1-4-4l8-8-1.3-1.2Z" />,
  check: <path d="m20 6-11 11-5-5" />,
  bolt: <path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z" />,
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </>
  ),
  'map-pin': (
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  'arrow-right': <path d="M5 12h14m-6-6 6 6-6 6" />,
  'arrow-left': <path d="M19 12H5m6 6-6-6 6-6" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6" />
      <circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  /* The struck-through eye. The slash is what carries "hidden" at 18px. */
  'eye-off': (
    <>
      <path d="M10.6 5.1A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a18.5 18.5 0 0 1-3 4M6.2 6.2A18.4 18.4 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 4.2-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m3 3 18 18" />
    </>
  ),
};

export interface IconProps {
  readonly name: IconName;
  /** Pixel size. Defaults to 1.5rem worth at the default root font size. */
  readonly size?: number;
  readonly className?: string;
}

export function Icon({ name, size = 24, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      // Decorative: the meaning is always carried by the text beside it.
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
