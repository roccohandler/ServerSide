import { Link } from 'react-router-dom';
import { appProjectPath, routes } from '../../../config/routes';
import type { ProjectView } from '../../../types/api';
import { AppEmpty } from './AppState';
import { ProgressBar } from './ProgressBar';
import styles from './Cards.module.css';

/**
 * The project: what it is called, how far along it is, and where to look at it.
 *
 * It used to open with `milestoneLabel` and `milestoneDetail` as well, and on the
 * dashboard that put the same two server sentences on the screen up to three times — the
 * current-action panel is built from them whenever nothing is waiting on the customer,
 * and the page now answers "which stage am I at?" in its header and "what happens next?"
 * in its own section. Repeating a sentence is how a summary starts reading as padding, so
 * the stage words live where the question is asked and this card keeps the artefacts:
 * the name, the bar and the links.
 *
 * The technical state (`building`, `revisions`) is still never rendered anywhere —
 * "your website is being built" is the sentence, and `building` is a word a plumber does
 * not owe anybody.
 */
export function ProjectSummaryCard({ project }: { readonly project: ProjectView | null }) {
  if (!project) {
    return (
      <AppEmpty
        title="No website project yet"
        body="Once you go ahead, this is where your build lives: progress, preview link, and everything we need from you."
        action={{ label: 'See what is involved', to: routes.appBilling }}
      />
    );
  }

  return (
    <article className={styles['card']}>
      <h3 className={styles['cardTitle']}>{project.businessName}</h3>

      <ProgressBar
        step={project.progress.step}
        total={project.progress.total}
        label={`Step ${project.progress.step} of ${project.progress.total}`}
      />

      <ul className={styles['links']}>
        {/*
         * Both URLs are data, set by a deployment event. Nothing about them is written
         * in this file — see the deployments feature.
         */}
        {project.previewUrl ? (
          <li>
            <a href={project.previewUrl} target="_blank" rel="noopener noreferrer">
              Open the preview
            </a>
          </li>
        ) : null}
        {project.productionUrl ? (
          <li>
            <a href={project.productionUrl} target="_blank" rel="noopener noreferrer">
              Open my live website
            </a>
          </li>
        ) : null}
        <li>
          <Link to={appProjectPath(project.id)}>See everything about this project</Link>
        </li>
      </ul>
    </article>
  );
}
