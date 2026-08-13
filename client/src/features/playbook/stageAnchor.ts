import type { PlaybookStage } from '../../types/content';

/**
 * The anchor id for a stage section on the PlayBook page.
 *
 * One function, in its own module, so the stage navigation, the stage sections and the
 * assessment's weakest-five links all derive their hrefs from the same place. Three
 * components building the same string by hand is how a link quietly stops resolving.
 *
 * It lives here rather than beside the component that renders the sections because a
 * module exporting both components and helpers breaks fast refresh — the whole file
 * remounts on every edit instead of hot-swapping.
 */
export function stageAnchor(stage: PlaybookStage | string): string {
  return `stage-${stage}`;
}
