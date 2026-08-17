import { portfolioProjects } from '../../../content';
import type { PortfolioProject } from '../../../types/content';
import { Badge } from '@jobforge/ui';
import { ButtonLink } from '@jobforge/ui';
import { Icon } from '@jobforge/ui';
import { BrowserFrame, PhoneFrame } from '../../../components/patterns/DeviceFrame';
import styles from './Portfolio.module.css';

/*
 * The examples page's own rendering of the five demonstrations.
 *
 * `PortfolioGrid` shows each capture at a third of the page width, which is the right
 * cost on the homepage — the examples are one section among many there. On /portfolio
 * the screenshots are the entire argument, and at card size the details that do the
 * persuading (the call button, the headline, the disclosure bar) stop being legible.
 * So this page renders each project as a full-width row instead: the desktop capture
 * in browser chrome with the phone capture beside it, and the copy next to the
 * evidence it describes.
 *
 * Same honesty contract as the grid: anything flagged `isDemo` carries a visible
 * "Demonstration" badge beside the frames, and the demo link renders only when
 * `demoUrl` is set — the page never links to something that is not live.
 */

function ShowcaseRow({ project }: { readonly project: PortfolioProject }) {
  const desktop = (
    <img
      src={project.image}
      alt={project.imageAlt}
      width={1200}
      height={800}
      loading="lazy"
      decoding="async"
    />
  );

  return (
    <li className={styles['showcaseRow']}>
      <div className={styles['showcaseFrames']}>
        {/*
         * The address pill shows `demoUrl` — the route the capture is of, and the page
         * the button beside it leads to. A project without a published demo gets a
         * plain bordered still instead: the pill's whole point is a URL the visitor
         * can type and land on, and an unpublished demo has none.
         */}
        {project.demoUrl ? (
          <BrowserFrame url={project.demoUrl} className={styles['showcaseBrowser']}>
            {desktop}
          </BrowserFrame>
        ) : (
          <div className={styles['showcaseStill']}>{desktop}</div>
        )}

        {project.mobileImage && project.mobileImageAlt ? (
          <PhoneFrame className={styles['showcasePhone']}>
            <img
              src={project.mobileImage}
              alt={project.mobileImageAlt}
              width={640}
              height={1280}
              loading="lazy"
              decoding="async"
            />
          </PhoneFrame>
        ) : null}
      </div>

      <div className={styles['showcaseBody']}>
        <div className={styles['meta']}>
          <Badge tone="brand">{project.industry}</Badge>
          {project.isDemo ? <Badge tone="accent">Demonstration</Badge> : null}
        </div>

        {/* h2, fixed: on this page the rows sit directly under the page's own h1. */}
        <h2 className={styles['title']}>{project.title}</h2>
        <p className={styles['description']}>{project.description}</p>

        <ul className={styles['highlights']}>
          {project.highlights.map((highlight) => (
            <li key={highlight} className={styles['highlight']}>
              <Icon name="check" size={16} className={styles['highlightMarker']} />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>

        <div className={styles['actions']}>
          {project.demoUrl ? (
            <ButtonLink to={project.demoUrl} variant="secondary">
              View {project.industry} demo
            </ButtonLink>
          ) : (
            <p className={styles['noDemo']}>Live demo not published yet.</p>
          )}
        </div>
      </div>
    </li>
  );
}

export function PortfolioShowcase() {
  return (
    <ul className={styles['showcase']}>
      {portfolioProjects.map((project) => (
        <ShowcaseRow key={project.id} project={project} />
      ))}
    </ul>
  );
}
