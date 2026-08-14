import { useEffect, useRef, useState } from 'react';
import type { DemoImage, DemoVideo } from '../../../content/demos/types';
import styles from './Demo.module.css';

/*
 * The two media primitives every demo page renders through.
 *
 * They exist so that the performance rules from `docs/DEMO-QUALITY-UPGRADE.md` §3 are
 * structural rather than remembered: a `DemoPicture` cannot be written without intrinsic
 * dimensions, an eager image gets `fetchpriority="high"` and a lazy one gets
 * `loading="lazy" decoding="async"`, and there is no way to hand `DemoAmbient` a video
 * it will play for a reduced-motion user.
 */

export interface DemoPictureProps {
  readonly image: DemoImage;
  /** The rendered slot, as a `sizes` expression. Describes CSS, so it lives in the caller. */
  readonly sizes: string;
  /**
   * True only for the page's LCP element — the hero. Everything else lazy-loads.
   * One eager image per page: `fetchpriority` stops helping when it is shared.
   */
  readonly eager?: boolean;
  readonly className?: string;
}

export function DemoPicture({ image, sizes, eager = false, className }: DemoPictureProps) {
  return (
    <picture>
      <source type="image/avif" srcSet={image.avifSrcset} sizes={sizes} />
      <img
        className={className}
        src={image.src}
        srcSet={image.srcset}
        sizes={sizes}
        alt={image.alt}
        width={image.width}
        height={image.height}
        {...(eager
          ? { fetchPriority: 'high' as const }
          : { loading: 'lazy' as const, decoding: 'async' as const })}
      />
    </picture>
  );
}

export interface DemoAmbientProps {
  readonly video: DemoVideo;
}

/**
 * The ambient clip, below the fold, on the trades that have one.
 *
 * The rules, in order of who they protect:
 *
 *   - **`prefers-reduced-motion` users never download a byte of it.** The `<video>` is
 *     not rendered at all — they get the poster as a plain image. Pausing would not be
 *     enough; the correct cost for someone who asked for no motion is zero.
 *   - **Nobody's bandwidth is spent off screen.** `preload="none"`, and an
 *     IntersectionObserver starts playback only while the section is visible.
 *   - **It can be stopped.** WCAG 2.2.2 requires a pause mechanism for anything moving
 *     longer than five seconds, and a looping clip is exactly that. The button holds the
 *     user's intent; scrolling away and back does not overrule them.
 *   - Muted, looped, `playsInline`: the combination browsers require before they allow
 *     autoplay at all, and the only polite form of ambient video.
 */
export function DemoAmbient({ video }: DemoAmbientProps) {
  const [motionOk, setMotionOk] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setMotionOk(!query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return undefined;

    const observer = new IntersectionObserver(
      (entries) => setInView(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.25 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [motionOk]);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    if (inView && !userPaused) {
      // jsdom's play() throws rather than returning a promise; browsers may reject it.
      try {
        void element.play()?.catch(() => undefined);
      } catch {
        // Playback denied — the poster stays, which is the designed fallback.
      }
    } else {
      element.pause();
    }
  }, [inView, userPaused]);

  return (
    <section className={styles['ambient']} aria-labelledby="demo-ambient-heading">
      <div className={styles['sectionInner']}>
        <h2 id="demo-ambient-heading" className={styles['sectionHeading']}>
          {video.heading}
        </h2>
        <p className={styles['sectionLede']}>{video.body}</p>

        <div className={styles['ambientFrame']}>
          {motionOk ? (
            <>
              <video
                ref={videoRef}
                className={styles['ambientVideo']}
                muted
                loop
                playsInline
                preload="none"
                poster={video.poster}
                width={video.width}
                height={video.height}
                aria-hidden="true"
                tabIndex={-1}
              >
                <source src={video.src} type="video/mp4" />
              </video>
              <button
                type="button"
                className={styles['ambientToggle']}
                aria-pressed={userPaused}
                onClick={() => setUserPaused((paused) => !paused)}
              >
                {userPaused ? 'Play' : 'Pause'}
              </button>
            </>
          ) : (
            /*
             * The reduced-motion rendering: the same frame, as a still. Decorative — the
             * heading and body above carry the content — so the alt is empty on purpose.
             */
            <img
              className={styles['ambientVideo']}
              src={video.poster}
              alt=""
              width={video.width}
              height={video.height}
              loading="lazy"
              decoding="async"
            />
          )}
        </div>
      </div>
    </section>
  );
}
