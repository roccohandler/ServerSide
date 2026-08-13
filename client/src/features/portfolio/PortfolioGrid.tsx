import { portfolioProjects } from '../../content';
import { Badge, Card, Grid } from '../../components/ui/Layout';
import { ButtonLink } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import styles from './Portfolio.module.css';

export interface PortfolioGridProps {
  readonly limit?: number;
  /**
   * Rank for each project's name. **It has to match where the grid is on the page.**
   *
   * `2` on `/portfolio`, where the grid sits directly under the page's `h1`; `3` on the
   * homepage, where a section heading already occupies level 2. It defaulted to `3` and
   * `/portfolio` took the default, which put an `h3` immediately after the `h1` — a
   * screen-reader user navigating by heading hears a level missing and has no way to
   * tell what was in it.
   */
  readonly headingLevel?: 2 | 3 | 4;
}

/**
 * Data-driven examples.
 *
 * Anything flagged `isDemo` gets a visible "Demonstration" badge, and the demo link is
 * rendered only when `demoUrl` is set — the site never links to a page that is not
 * live, and never lets a demo pass for client work.
 */
export function PortfolioGrid({ limit, headingLevel = 3 }: PortfolioGridProps) {
  const visible = limit ? portfolioProjects.slice(0, limit) : portfolioProjects;
  const Heading = `h${headingLevel}` as const;

  return (
    <Grid as="ul" columns={3}>
      {visible.map((project) => (
        <Card as="li" key={project.id} flush interactive>
          <img
            className={styles['thumbnail']}
            src={project.image}
            alt={project.imageAlt}
            width={600}
            height={400}
            loading="lazy"
            decoding="async"
          />

          <div className={styles['body']}>
            <div className={styles['meta']}>
              <Badge tone="brand">{project.industry}</Badge>
              {project.isDemo ? <Badge tone="accent">Demonstration</Badge> : null}
            </div>

            <Heading className={styles['title']}>{project.title}</Heading>
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
        </Card>
      ))}
    </Grid>
  );
}
