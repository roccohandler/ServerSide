import type { DeploymentView, ProjectView } from '@jobforge/shared';
import styles from './Project.module.css';

/*
 * Where the website currently is.
 *
 * The URLs come from the project record, which a deployment event wrote. There is no
 * pattern assembled from a slug here and no constant to fall back on — a link that is
 * guessed is a link that 404s on somebody's own website, and it would do it silently.
 *
 * The deployment list shows *whether there is something to look at* and when it last
 * changed. It deliberately does not show commit hashes, build durations or provider
 * names: those are ours, and a customer reading "dpl_a83f2" learns nothing they can use.
 */
export interface PreviewPanelProps {
  readonly project: ProjectView;
  readonly deployments: readonly DeploymentView[];
}

function updatedAt(deployments: readonly DeploymentView[]): string | null {
  const ready = deployments.find(
    (deployment) => deployment.environment === 'preview' && deployment.state === 'ready',
  );
  if (!ready) return null;

  const date = new Date(ready.at);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function PreviewPanel({ project, deployments }: PreviewPanelProps) {
  const lastUpdated = updatedAt(deployments);
  const isBuilding = deployments.some((deployment) => deployment.state === 'building');

  return (
    <section className={styles['panel']} aria-labelledby="preview-heading">
      <h2 id="preview-heading" className={styles['panelTitle']}>
        Your website
      </h2>

      {project.productionUrl ? (
        <p className={styles['panelBody']}>
          Your website is live at{' '}
          <a href={project.productionUrl} target="_blank" rel="noopener noreferrer">
            {project.productionUrl.replace(/^https?:\/\//, '')}
          </a>
          .
        </p>
      ) : null}

      {project.previewUrl ? (
        <>
          <p className={styles['panelBody']}>
            {project.productionUrl
              ? 'The preview is where we work on changes before they go live.'
              : 'This is a private link. Nobody finds it by searching, and nothing is public until you approve it.'}
          </p>

          <p>
            <a
              className={styles['primaryLink']}
              href={project.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open the preview
            </a>
          </p>

          {lastUpdated ? <p className={styles['panelMeta']}>Last updated {lastUpdated}.</p> : null}
        </>
      ) : (
        <p className={styles['panelBody']}>
          {isBuilding
            ? 'We are putting the first version together now. The link will appear here as soon as there is something to look at.'
            : 'There is nothing to look at yet. As soon as there is, the link will appear here and we will let you know.'}
        </p>
      )}
    </section>
  );
}
