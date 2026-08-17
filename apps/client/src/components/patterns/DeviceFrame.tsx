import type { ReactNode } from 'react';
import styles from './DeviceFrame.module.css';
import { cx } from '@jobforge/ui';

/*
 * Device chrome for product screenshots.
 *
 * A raw screenshot of a website reads as a picture *of a rectangle*; the same capture
 * inside a browser bar or a phone bezel reads as a website — the thing being sold. These
 * two wrappers are that framing and nothing else: the image inside carries the meaning
 * (and the alt text), the chrome is presentational and hidden from assistive technology.
 *
 * The address pill shows the capture's real route on this site, deliberately: a URL a
 * visitor can type and land on is a preview that cannot overclaim. Nothing here may
 * imitate a real business's address bar.
 */

export interface BrowserFrameProps {
  /** The real route the screenshot shows, e.g. `/demo/hvac`. Rendered in the address pill. */
  readonly url: string;
  readonly className?: string;
  /** The screenshot `<img>`, with its own alt, dimensions and loading attributes. */
  readonly children: ReactNode;
}

export function BrowserFrame({ url, className, children }: BrowserFrameProps) {
  return (
    <div className={cx(styles['browser'], className)}>
      <div className={styles['browserBar']} aria-hidden="true">
        <span className={styles['browserDots']} />
        <span className={styles['browserUrl']}>{url}</span>
      </div>
      <div className={styles['screen']}>{children}</div>
    </div>
  );
}

export interface PhoneFrameProps {
  readonly className?: string;
  /** The screenshot `<img>`, with its own alt, dimensions and loading attributes. */
  readonly children: ReactNode;
}

export function PhoneFrame({ className, children }: PhoneFrameProps) {
  return (
    <div className={cx(styles['phone'], className)}>
      <div className={styles['screen']}>{children}</div>
    </div>
  );
}
